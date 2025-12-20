/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const log = require('lighthouse-logger');

/** @typedef {import('raven').CaptureOptions} CaptureOptions */
/** @typedef {import('raven').ConstructorOptions} ConstructorOptions */

const SENTRY_URL = 'https://a6bb0da87ee048cc9ae2a345fc09ab2e:63a7029f46f74265981b7e005e0f69f8@sentry.io/174697';

// Per-run chance of capturing errors (if enabled).
const SAMPLE_RATE = 0.01;

/** @type {Array<{pattern: RegExp, rate: number}>} */
const SAMPLED_ERRORS = [
  // Error code based sampling. Delete if still unused after 2019-01-01.
  // e.g.: {pattern: /No.*node with given id/, rate: 0.01},
];

const noop = () => {};

/**
 * A delegate for sentry so that environments without error reporting enabled will use
 * noop functions and environments with error reporting will call the actual Sentry methods.
 */
const sentryDelegate = {
  init,
  /** @type {(message: string, options?: CaptureOptions) => void} */
  captureMessage: noop,
  /** @type {(breadcrumb: any) => void} */
  captureBreadcrumb: noop,
  /** @type {() => any} */
  getContext: noop,
  /** @type {(error: Error, options?: CaptureOptions) => Promise<void>} */
  captureException: async () => {},
  _shouldSample() {
    return SAMPLE_RATE >= Math.random();
  },
};

/**
 * When called, replaces noops with actual Sentry implementation.
 * @param {{url: string, flags: LH.CliFlags, environmentData: ConstructorOptions}} opts
 */
function init(opts) {
  // If error reporting is disabled, leave the functions as a noop
  if (!opts.flags.enableErrorReporting) {
    return;
  }

  // If not selected for samping, leave the functions as a noop.
  if (!sentryDelegate._shouldSample()) {
    return;
  }

  try {
    const Sentry = require('raven');
    const sentryConfig = Object.assign({}, opts.environmentData,
      {captureUnhandledRejections: true});
    Sentry.config(SENTRY_URL, sentryConfig).install();

    // Have each delegate function call the corresponding sentry function by default
    sentryDelegate.captureMessage = (...args) => Sentry.captureMessage(...args);
    sentryDelegate.captureBreadcrumb = (...args) => Sentry.captureBreadcrumb(...args);
    sentryDelegate.getContext = () => Sentry.getContext();

    // Keep a record of exceptions per audit/gatherer so we can just report once
    const sentryExceptionCache = new Map();
    // Special case captureException to return a Promise so we don't process.exit too early
    sentryDelegate.captureException = async (err, opts = {}) => {
      // Ignore if there wasn't an error
      if (!err) return;

      // Ignore expected errors
      // @ts-ignore Non-standard property added to flag error as not needing capturing.
      if (err.expected) return;

      const tags = opts.tags || {};
      if (tags.audit) {
        const key = `audit-${tags.audit}-${err.message}`;
        if (sentryExceptionCache.has(key)) return;
        sentryExceptionCache.set(key, true);
      }

      if (tags.gatherer) {
        const key = `gatherer-${tags.gatherer}-${err.message}`;
        if (sentryExceptionCache.has(key)) return;
        sentryExceptionCache.set(key, true);
      }

      // Sample known errors that occur at a high frequency.
      const sampledErrorMatch = SAMPLED_ERRORS.find(sample => sample.pattern.test(err.message));
      if (sampledErrorMatch && sampledErrorMatch.rate <= Math.random()) return;

      // Protocol errors all share same stack trace, so add more to fingerprint
      // @ts-ignore - properties added to protocol method LHErrors.
      if (err.protocolMethod) {
        // @ts-ignore - properties added to protocol method LHErrors.
        opts.fingerprint = ['{{ default }}', err.protocolMethod, err.protocolError];
      }

      return new Promise(resolve => {
        Sentry.captureException(err, opts, () => resolve());
      });
    };

    const context = Object.assign({
      url: opts.url,
      emulatedFormFactor: opts.flags.emulatedFormFactor,
      throttlingMethod: opts.flags.throttlingMethod,
    }, opts.flags.throttling);
    Sentry.mergeContext({extra: Object.assign({}, opts.environmentData.extra, context)});
  } catch (e) {
    log.warn(
      'sentry',
      'Could not load raven library, errors will not be reported.'
    );
  }
}

module.exports = sentryDelegate;
