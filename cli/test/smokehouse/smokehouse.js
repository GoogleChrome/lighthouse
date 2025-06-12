/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview An end-to-end test runner for Lighthouse. Takes a set of smoke
 * test definitions and a method of running Lighthouse, returns whether all the
 * smoke tests passed.
 */

/**
 * @typedef Run
 * @property {string[] | undefined} networkRequests
 * @property {LH.Result} lhr
 * @property {LH.Artifacts} artifacts
 * @property {string} lighthouseLog
 * @property {string} assertionLog
 */

/**
 * @typedef SmokehouseResult
 * @property {string} id
 * @property {number} passed
 * @property {number} failed
 * @property {Run[]} runs
 */

import assert from 'assert/strict';

import log from 'lighthouse-logger';

import {runLighthouse as cliLighthouseRunner} from './lighthouse-runners/cli.js';
import {getAssertionReport} from './report-assert.js';
import {LocalConsole} from './lib/local-console.js';
import {ConcurrentMapper} from './lib/concurrent-mapper.js';
import {ChildProcessError} from './lib/child-process-error.js';

// The number of concurrent (`!runSerially`) tests to run if `jobs` isn't set.
const DEFAULT_CONCURRENT_RUNS = 5;
const DEFAULT_RETRIES = 0;

/**
 * Runs the selected smoke tests. Returns whether all assertions pass.
 * @param {Array<Smokehouse.TestDfn>} smokeTestDefns
 * @param {Partial<Smokehouse.SmokehouseOptions>} smokehouseOptions
 * @return {Promise<{success: boolean, testResults: SmokehouseResult[]}>}
 */
async function runSmokehouse(smokeTestDefns, smokehouseOptions) {
  const {
    testRunnerOptions,
    jobs = DEFAULT_CONCURRENT_RUNS,
    retries = DEFAULT_RETRIES,
    lighthouseRunner = Object.assign(cliLighthouseRunner, {runnerName: 'cli'}),
    takeNetworkRequestUrls,
    setup,
  } = smokehouseOptions;
  assertPositiveInteger('jobs', jobs);
  assertNonNegativeInteger('retries', retries);

  try {
    await setup?.();
  } catch (err) {
    console.error(log.redify('\nERROR DURING SETUP:'));
    console.error(log.redify(err.stack || err));
    return {success: false, testResults: []};
  }

  // Run each testDefn in parallel based on the concurrencyLimit.
  const concurrentMapper = new ConcurrentMapper();

  const testOptions = {
    testRunnerOptions,
    jobs,
    retries,
    lighthouseRunner,
    takeNetworkRequestUrls,
  };
  const smokePromises = smokeTestDefns.map(testDefn => {
    // If defn is set to `runSerially`, we'll run it in succession with other tests, not parallel.
    const concurrency = testDefn.runSerially ? 1 : jobs;
    return concurrentMapper.runInPool(() => runSmokeTest(testDefn, testOptions), {concurrency});
  });
  const testResults = await Promise.all(smokePromises);

  // Print final summary.
  let passingCount = 0;
  let failingCount = 0;
  for (const testResult of testResults) {
    passingCount += testResult.passed;
    failingCount += testResult.failed;
  }
  if (passingCount) console.log(log.greenify(`${getAssertionLog(passingCount)} passing in total`));
  if (failingCount) console.log(log.redify(`${getAssertionLog(failingCount)} failing in total`));

  // Print id(s) and fail if there were failing tests.
  const failingDefns = testResults.filter(result => result.failed);
  if (failingDefns.length) {
    const testNames = failingDefns.map(d => d.id).join(', ');
    console.log(log.redify(`We have ${failingDefns.length} failing smoketest(s): ${testNames}`));
    return {success: false, testResults};
  }

  return {success: true, testResults};
}

/**
 * @param {string} loggableName
 * @param {number} value
 */
function assertPositiveInteger(loggableName, value) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${loggableName} must be a positive integer`);
  }
}
/**
 * @param {string} loggableName
 * @param {number} value
 */
function assertNonNegativeInteger(loggableName, value) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${loggableName} must be a non-negative integer`);
  }
}

/** @param {string} str */
function purpleify(str) {
  return `${log.purple}${str}${log.reset}`;
}

/**
 * Run Lighthouse in the selected runner.
 * @param {Smokehouse.TestDfn} smokeTestDefn
 * @param {Smokehouse.SmokehouseOptions} testOptions
 * @return {Promise<SmokehouseResult>}
 */
async function runSmokeTest(smokeTestDefn, testOptions) {
  const {id, expectations, config} = smokeTestDefn;
  const {
    lighthouseRunner,
    retries,
    testRunnerOptions,
    takeNetworkRequestUrls,
  } = testOptions;
  const requestedUrl = expectations.lhr.requestedUrl;

  console.log(`${purpleify(id)} smoketest starting…`);

  // Rerun test until there's a passing result or retries are exhausted to prevent flakes.
  /** @type {Run[]} */
  const runs = [];
  let result;
  let report;
  const bufferedConsole = new LocalConsole();
  bufferedConsole.log(`\n${purpleify(id)}: testing '${requestedUrl}'…`);
  for (let i = 0; i <= retries; i++) {
    if (i !== 0) {
      bufferedConsole.log(`  Retrying run (${i} out of ${retries} retries)…`);
    }

    const logger = new LocalConsole();

    // Run Lighthouse.
    try {
      // Each individual runner has internal timeouts, but we've had bugs where
      // that didn't cover some edge case. So to be safe give a (long) timeout here.
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() =>
          reject(new Error('Timed out waiting for provided lighthouseRunner')), 1000 * 120);
      });
      const timedResult = await Promise.race([
        lighthouseRunner(requestedUrl, config, logger, testRunnerOptions),
        timeoutPromise,
      ]);
      result = {
        ...timedResult,
        networkRequests: takeNetworkRequestUrls ? takeNetworkRequestUrls() : undefined,
        log: logger.getLog(),
      };

      if (!result.lhr?.audits || !result.artifacts) {
        // Something went really wrong and the runner didn't catch it.
        throw new Error('lighthouse runner returned a bad result. got lhr:\n' +
          JSON.stringify(result.lhr, null, 2));
      }
    } catch (e) {
      // Clear the network requests so that when we retry, we don't see duplicates.
      if (takeNetworkRequestUrls) takeNetworkRequestUrls();

      logChildProcessError(bufferedConsole, e);
      bufferedConsole.log('Timed out. log from lighthouseRunner:');
      bufferedConsole.log(logger.getLog());
      continue; // Retry, if possible.
    }

    // Assert result.
    report = getAssertionReport(result, expectations, {
      runner: lighthouseRunner.runnerName,
      ...testRunnerOptions,
    });

    runs.push({
      ...result,
      lighthouseLog: result.log,
      assertionLog: report.log,
    });

    if (report.failed) {
      bufferedConsole.log(`  ${getAssertionLog(report.failed)} failed.`);
      continue; // Retry, if possible.
    }

    break; // Passing result, no need to retry.
  }

  bufferedConsole.log(`  smoketest results:`);

  // Write result log if we have one.
  if (result) bufferedConsole.write(result.log);

  // If there's not an assertion report, just report the whole thing as a single failure.
  if (report) bufferedConsole.write(report.log);
  const passed = report ? report.passed : 0;
  const failed = report ? report.failed : 1;

  const correctStr = getAssertionLog(passed);
  const colorFn = passed === 0 ? log.redify : log.greenify;
  bufferedConsole.log(`  Correctly passed ${colorFn(correctStr)}`);

  if (failed) {
    const failedString = getAssertionLog(failed);
    bufferedConsole.log(`  Failed ${log.redify(failedString)}`);
  }
  bufferedConsole.log(`${purpleify(id)} smoketest complete.`);

  // Log now so right after finish, but all at once so not interleaved with other tests.
  console.log(bufferedConsole.getLog());

  return {
    id,
    passed,
    failed,
    runs,
  };
}

/**
 * Logs an error to the console, including stdout and stderr if `err` is a
 * `ChildProcessError`.
 * @param {LocalConsole} localConsole
 * @param {ChildProcessError|Error} err
 */
function logChildProcessError(localConsole, err) {
  if (err instanceof ChildProcessError) {
    localConsole.adoptStdStrings(err);
  }

  localConsole.log(log.redify(err.stack || err.message));
  if (err.cause) {
    if (err.cause instanceof Error) {
      localConsole.log(log.redify(`[cause] ${err.cause.stack || err.cause.message}`));
    } else {
      localConsole.log(log.redify(`[cause] ${err.cause}`));
    }
  }
}

/**
 * @param {number} count
 * @return {string}
 */
function getAssertionLog(count) {
  const plural = count === 1 ? '' : 's';
  return `${count} assertion${plural}`;
}

/**
 * Parses the cli `shardArg` flag into `shardNumber/shardTotal`. Splits
 * `testDefns` into `shardTotal` shards and returns the `shardNumber`th shard.
 * Shards will differ in size by at most 1.
 * Shard params must be 1 ≤ shardNumber ≤ shardTotal.
 * @param {Array<Smokehouse.TestDfn>} testDefns
 * @param {string=} shardArg
 * @return {Array<Smokehouse.TestDfn>}
 */
function getShardedDefinitions(testDefns, shardArg) {
  if (!shardArg) return testDefns;

  // eslint-disable-next-line max-len
  const errorMessage = `'shard' must be of the form 'n/d' and n and d must be positive integers with 1 ≤ n ≤ d. Got '${shardArg}'`;
  const match = /^(?<shardNumber>\d+)\/(?<shardTotal>\d+)$/.exec(shardArg);
  assert(match?.groups, errorMessage);
  const shardNumber = Number(match.groups.shardNumber);
  const shardTotal = Number(match.groups.shardTotal);
  assert(shardNumber > 0 && Number.isInteger(shardNumber), errorMessage);
  assert(shardTotal > 0 && Number.isInteger(shardTotal));
  assert(shardNumber <= shardTotal, errorMessage);

  // Array is sharded with `Math.ceil(length / shardTotal)` shards first
  // and then the remaining `Math.floor(length / shardTotal) shards.
  // e.g. `[0, 1, 2, 3]` split into 3 shards is `[[0, 1], [2], [3]]`.
  const baseSize = Math.floor(testDefns.length / shardTotal);
  const biggerSize = baseSize + 1;
  const biggerShardCount = testDefns.length % shardTotal;

  // Since we don't have tests for this file, construct all shards so correct
  // structure can be asserted.
  const shards = [];
  let index = 0;
  for (let i = 0; i < shardTotal; i++) {
    const shardSize = i < biggerShardCount ? biggerSize : baseSize;
    shards.push(testDefns.slice(index, index + shardSize));
    index += shardSize;
  }
  assert.strictEqual(shards.length, shardTotal);
  assert.deepStrictEqual(shards.flat(), testDefns);

  const shardDefns = shards[shardNumber - 1];
  console.log(`In this shard (${shardArg}), running: ${shardDefns.map(d => d.id).join(' ')}\n`);
  return shardDefns;
}

export {
  runSmokehouse,
  getShardedDefinitions,
  DEFAULT_RETRIES,
  DEFAULT_CONCURRENT_RUNS,
};
