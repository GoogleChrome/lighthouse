/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import log from 'lighthouse-logger';

import {initializeConfig} from '../config/config.js';

/** @typedef {import('@sentry/node').Breadcrumb} Breadcrumb */
/** @typedef {import('@sentry/node').NodeClient} NodeClient */
/** @typedef {import('@sentry/node').NodeOptions} NodeOptions */
/** @typedef {import('@sentry/node').SeverityLevel} SeverityLevel */

const SENTRY_URL = 'https://a6bb0da87ee048cc9ae2a345fc09ab2e:63a7029f46f74265981b7e005e0f69f8@sentry.io/174697';

// Per-run chance of capturing errors (if enabled).
const SAMPLE_RATE = 0.01;

const noop = () => { };

/**
 * A delegate for sentry so that environments without error reporting enabled will use
 * noop functions and environments with error reporting will call the actual Sentry methods.
 */
const sentryDelegate = {
  init,
  /** @type {(message: string, level?: SeverityLevel) => void} */
  captureMessage: noop,
  /** @type {(breadcrumb: Breadcrumb) => void} */
  captureBreadcrumb: noop,
  /** @type {() => any} */
  getContext: noop,
  /** @type {(error: Error, options: {level?: string, tags?: {[key: string]: any}, extra?: {[key: string]: any}}) => Promise<void>} */
  captureException: async () => { },
  _shouldSample() {
    return SAMPLE_RATE >= Math.random();
  },
};

/**
 * When called, replaces noops with actual Sentry implementation.
 * @param {{url: string, flags: LH.CliFlags, config?: LH.Config, environmentData: NodeOptions}} opts
 */
async function init(opts) {
  // If error reporting is disabled, leave the functions as a noop
  if (!opts.flags.enableErrorReporting) {
    return;
  }

  // If not selected for samping, leave the functions as a noop.
  if (!sentryDelegate._shouldSample()) {
    return;
  }

  try {
    const Sentry = await import('@sentry/node');
    Sentry.init({
      ...opts.environmentData,
      dsn: SENTRY_URL,
    });

    /** @type {LH.Config.Settings | LH.CliFlags} */
    let settings = opts.flags;
    try {
      const {resolvedConfig} = await initializeConfig('navigation', opts.config, opts.flags);
      settings = resolvedConfig.settings;
    } catch {
      // The config failed validation (note - probably, we don't use a specific error type for that).
      // The actual core lighthouse library will handle this error accordingly. As we are only using this
      // for meta data, we can ignore here.
    }
    const baseTags = {
      channel: settings.channel,
      formFactor: settings.formFactor,
      throttlingMethod: settings.throttlingMethod,
    };
    Sentry.setTags(baseTags);

    const extras = {
      ...settings.throttling,
      url: opts.url,
    };
    Sentry.setExtras(extras);

    // Have each delegate function call the corresponding sentry function by default
    sentryDelegate.captureMessage = (...args) => Sentry.captureMessage(...args);
    sentryDelegate.captureBreadcrumb = (...args) => Sentry.addBreadcrumb(...args);
    sentryDelegate.getContext = () => extras;

    // Keep a record of exceptions per audit/gatherer so we can just report once
    const sentryExceptionCache = new Map();
    // Special case captureException to return a Promise so we don't process.exit too early
    sentryDelegate.captureException = async (err, opts = {}) => {
      // Ignore if there wasn't an error
      if (!err) return;

      // Ignore expected errors
      // @ts-expect-error Non-standard property added to flag error as not needing capturing.
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

      // @ts-expect-error - properties added to protocol method LighthouseErrors.
      if (err.protocolMethod) {
        // Protocol errors all share same stack trace, so add more to fingerprint
        // @ts-expect-error - properties added to protocol method LighthouseErrors.
        opts.fingerprint = ['{{ default }}', err.protocolMethod, err.protocolError];

        opts.tags = opts.tags || {};
        // @ts-expect-error - properties added to protocol method LighthouseErrors.
        opts.tags.protocolMethod = err.protocolMethod;
      }

      Sentry.withScope(scope => {
        if (opts.level) {
          // @ts-expect-error - allow any string.
          scope.setLevel(opts.level);
        }
        if (opts.tags) {
          scope.setTags(opts.tags);
        }

        // Add extra details
        let extra;
        if (opts.extra) extra = {...opts.extra};
        // @ts-expect-error Non-standard property
        if (err.extra) extra = {...extra, ...err.extra};
        if (extra) {
          scope.setExtras(extra);
        }

        Sentry.captureException(err);
      });
    };
  } catch (e) {
    log.warn(
      'sentry',
      'Could not load Sentry, errors will not be reported.'
    );
  }
}

export const Sentry = sentryDelegate;
