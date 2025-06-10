/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import Configstore from 'configstore';
import Confirm from 'enquirer';
import log from 'lighthouse-logger';

const MAXIMUM_WAIT_TIME = 20 * 1000;

/* eslint-disable max-len */
const MESSAGE = `${log.reset}We're constantly trying to improve Lighthouse and its reliability.\n  ` +
  `${log.reset}Learn more: https://github.com/GoogleChrome/lighthouse/blob/main/docs/error-reporting.md \n ` +
  ` ${log.bold}May we anonymously report runtime exceptions to improve the tool over time?${log.reset}\n  ` +
  `We'll remember your choice, but you can also use the flag --[no-]enable-error-reporting`;
/* eslint-enable max-len */

/**
 * @return {Promise<boolean>}
 */
function prompt() {
  if (!process.stdout.isTTY || process.env.CI) {
    // Default non-interactive sessions to false
    return Promise.resolve(false);
  }

  /** @type {NodeJS.Timeout|undefined} */
  let timeout;

  const prompt = new Confirm.Confirm({
    name: 'isErrorReportingEnabled',
    initial: false,
    message: MESSAGE,
    actions: {ctrl: {}},
  });

  const timeoutPromise = new Promise((resolve) => {
    timeout = setTimeout(() => {
      prompt.close().then(() => {
        log.warn('CLI', 'No response to error logging preference, errors will not be reported.');
        resolve(false);
      });
    }, MAXIMUM_WAIT_TIME);
  });

  return Promise.race([
    prompt.run().then(result => {
      clearTimeout(timeout);
      return result;
    }),
    timeoutPromise,
  ]);
}

/**
 * @return {Promise<boolean>}
 */
function askPermission() {
  return Promise.resolve().then(_ => {
    const configstore = new Configstore('lighthouse');
    let isErrorReportingEnabled = configstore.get('isErrorReportingEnabled');
    if (typeof isErrorReportingEnabled === 'boolean') {
      return Promise.resolve(isErrorReportingEnabled);
    }

    return prompt()
      .then(response => {
        isErrorReportingEnabled = response;
        configstore.set('isErrorReportingEnabled', isErrorReportingEnabled);
        return isErrorReportingEnabled;
      });
  // Error accessing configstore; default to false.
  }).catch(_ => false);
}

export {
  askPermission,
};
