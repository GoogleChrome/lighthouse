/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import readline from 'node:readline/promises';
import {stdin as input, stdout as output} from 'node:process';

import Configstore from 'configstore';
import log from 'lighthouse-logger';

const MAXIMUM_WAIT_TIME = 20 * 1000;

/* eslint-disable max-len */
const MESSAGE = `${log.reset}We're constantly trying to improve Lighthouse and its reliability.\n  ` +
  `${log.reset}Learn more: https://github.com/GoogleChrome/lighthouse/blob/main/docs/error-reporting.md \n ` +
  ` ${log.bold}May we anonymously report runtime exceptions to improve the tool over time?${log.reset}\n  ` +
  `We'll remember your choice, but you can also use the flag --[no-]enable-error-reporting`;
/* eslint-enable max-len */

/**
 * Ask a native Y/N confirm prompt.
 * @return {Promise<boolean>}
 */
async function prompt() {
  if (!process.stdout.isTTY || process.env.CI) {
    // Default non-interactive sessions to false
    return false;
  }

  // Set up the promise-ready readline interface
  const rl = readline.createInterface({input, output});
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    // 1. Cancel the pending native rl.question input stream
    controller.abort();

    // 2. Clear terminal line to keep things clean and warn the user
    output.write('\n');
    log.warn('CLI', 'No response to error logging preference, errors will not be reported.');
  }, MAXIMUM_WAIT_TIME);

  try {
    // Display the prompt with standard native Y/n suffix matching Enquirer's initial: false
    const answer = await rl.question(`${MESSAGE} (y/N) `, {
      signal: controller.signal,
    });

    clearTimeout(timeout);

    // Normalize the user's string answer to a boolean
    const normalized = answer.trim().toLowerCase();
    return normalized === 'y' || normalized === 'yes';
  } catch (error) {
    // Triggers if the AbortController was triggered by the timeout or Ctrl+C
    clearTimeout(timeout);
    return false;
  } finally {
    // Crucial to close the interface to release stdin control back to the terminal
    rl.close();
  }
}

/**
 * @return {Promise<boolean>}
 */
function askPermission() {
  return Promise.resolve().then(_ => {
    const configstore = new Configstore('lighthouse');
    const isErrorReportingEnabled = configstore.get('isErrorReportingEnabled');
    if (typeof isErrorReportingEnabled === 'boolean') {
      return Promise.resolve(isErrorReportingEnabled);
    }

    return prompt()
      .then(response => {
        configstore.set('isErrorReportingEnabled', response);
        return response;
      });
  // Error accessing configstore; default to false.
  }).catch(_ => false);
}

export {
  askPermission,
};
