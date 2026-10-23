/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as td from 'testdouble';

import {runSmokehouse} from './smokehouse.js';
import {ChildProcessError} from './lib/child-process-error.js';

/** @type {Smokehouse.TestDfn} */
const smokeTestDefn = {
  id: 'test-smoke',
  expectations: {
    lhr: {
      requestedUrl: 'http://localhost:10200/simple-page.html',
      finalDisplayedUrl: 'http://localhost:10200/simple-page.html',
      audits: {},
    },
  },
};

describe('runSmokehouse error logging', () => {
  /** @type {string[]} */
  let loggedMessages;

  beforeEach(() => {
    loggedMessages = [];
    td.replace(console, 'log', (/** @type {unknown[]} */ ...args) => {
      loggedMessages.push(args.map(String).join(' '));
    });
  });

  afterEach(() => {
    td.reset();
  });

  it('logs runner logger output when lighthouseRunner returns a malformed result', async () => {
    /** @type {Smokehouse.LighthouseRunner} */
    // @ts-expect-error - testing malformed runner result
    const lighthouseRunner = async (_url, _config, logger) => {
      logger?.log('runner progress before malformed result');
      return {lhr: {}, artifacts: undefined};
    };

    const {success, testResults} = await runSmokehouse([smokeTestDefn], {
      lighthouseRunner,
      retries: 0,
    });

    expect(success).toBe(false);
    expect(testResults).toHaveLength(1);
    expect(testResults[0].failed).toBe(1);

    const combinedOutput = loggedMessages.join('\n');
    expect(combinedOutput).toContain('lighthouse runner returned a bad result');
    expect(combinedOutput).toContain('runner progress before malformed result');
  });

  it('logs runner logger output when lighthouseRunner throws a regular Error', async () => {
    /** @type {Smokehouse.LighthouseRunner} */
    const lighthouseRunner = async (_url, _config, logger) => {
      logger?.log('runner progress before throwing');
      throw new Error('unexpected runner failure');
    };

    const {success, testResults} = await runSmokehouse([smokeTestDefn], {
      lighthouseRunner,
      retries: 0,
    });

    expect(success).toBe(false);
    expect(testResults).toHaveLength(1);
    expect(testResults[0].failed).toBe(1);

    const combinedOutput = loggedMessages.join('\n');
    expect(combinedOutput).toContain('unexpected runner failure');
    expect(combinedOutput).toContain('runner progress before throwing');
  });

  it('does not duplicate runner logger output for ChildProcessError', async () => {
    /** @type {Smokehouse.LighthouseRunner} */
    const lighthouseRunner = async (_url, _config, logger) => {
      logger?.log('unique-cli-runner-log-line');
      throw new ChildProcessError('Lighthouse run failed', logger?.getLog());
    };

    const {success} = await runSmokehouse([smokeTestDefn], {
      lighthouseRunner,
      retries: 0,
    });

    expect(success).toBe(false);

    const combinedOutput = loggedMessages.join('\n');
    const occurrences = combinedOutput.split('unique-cli-runner-log-line').length - 1;
    expect(occurrences).toBe(1);
  });

  it('does not duplicate runner logger output when Error message already includes it', async () => {
    /** @type {Smokehouse.LighthouseRunner} */
    const lighthouseRunner = async (_url, _config, logger) => {
      logger?.log('unique-worker-runner-log-line');
      const log = logger?.getLog() || '';
      throw new Error(`Worker returned an error: boom\nLog:\n${log}\n`);
    };

    const {success} = await runSmokehouse([smokeTestDefn], {
      lighthouseRunner,
      retries: 0,
    });

    expect(success).toBe(false);

    const combinedOutput = loggedMessages.join('\n');
    const occurrences = combinedOutput.split('unique-worker-runner-log-line').length - 1;
    expect(occurrences).toBe(1);
  });
});
