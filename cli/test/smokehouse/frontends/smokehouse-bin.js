#!/usr/bin/env node
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview A smokehouse frontend for running from the command line. Parse
 * flags, start fixture webservers, then run smokehouse.
 */

/* eslint-disable no-console */

import path from 'path';
import fs from 'fs';
import url from 'url';

import {cloneDeep} from 'lodash-es';
import yargs from 'yargs';
import * as yargsHelpers from 'yargs/helpers';
import log from 'lighthouse-logger';

import {runSmokehouse, getShardedDefinitions, DEFAULT_RETRIES, DEFAULT_CONCURRENT_RUNS} from '../smokehouse.js';
import {updateTestDefnFormat} from './back-compat-util.js';
import {LH_ROOT} from '../../../../shared/root.js';
import exclusions from '../config/exclusions.js';
import {saveArtifacts} from '../../../../core/lib/asset-saver.js';
import {saveLhr} from '../../../../core/lib/asset-saver.js';

const coreTestDefnsPath =
  path.join(LH_ROOT, 'cli/test/smokehouse/core-tests.js');

/**
 * Possible Lighthouse runners. Loaded dynamically so e.g. a CLI run isn't
 * contingent on having built all the bundles.
 */
const runnerPaths = {
  cli: '../lighthouse-runners/cli.js',
  bundle: '../lighthouse-runners/bundle.js',
  devtools: '../lighthouse-runners/devtools.js',
};

/**
 * Determine batches of smoketests to run, based on the `requestedIds`.
 * @param {Array<Smokehouse.TestDfn>} allTestDefns
 * @param {Array<string>} requestedIds
 * @param {Set<string>} excludedTests
 * @return {Array<Smokehouse.TestDfn>}
 */
function getDefinitionsToRun(allTestDefns, requestedIds, excludedTests) {
  let smokes = [];
  const usage = `    ${log.dim}yarn smoke ${allTestDefns.map(t => t.id).join(' ')}${log.reset}\n`;

  if (requestedIds.length === 0) {
    smokes = [...allTestDefns];
    console.log('Running ALL smoketests. Equivalent to:');
    console.log(usage);
  } else {
    smokes = allTestDefns.filter(test => {
      // Include all tests that *include* requested id.
      // e.g. a requested 'perf' will match 'perf-preload', 'perf-trace-elements', etc
      return requestedIds.some(requestedId => test.id.includes(requestedId));
    });
    console.log(`Running ONLY smoketests for: ${smokes.map(t => t.id).join(' ')}\n`);
  }

  const unmatchedIds = requestedIds.filter(requestedId => {
    return !allTestDefns.map(t => t.id).some(id => id.includes(requestedId));
  });
  if (unmatchedIds.length) {
    console.log(log.redify(`Smoketests not found for: ${unmatchedIds.join(' ')}`));
    console.log(`Check test exclusions (${[...excludedTests].join(' ')})\n`);
    console.log(usage);
  }

  if (!smokes.length) {
    throw new Error('no smoketest found to run');
  }

  return smokes;
}

/**
 * Prune the `networkRequests` from the test expectations when `takeNetworkRequestUrls`
 * is not defined. Custom servers may not have this method available in-process.
 * Also asserts that any expectation with `networkRequests` is run serially. For core
 * tests, we don't currently have a good way to map requests to test definitions if
 * the tests are run in parallel.
 * @param {Array<Smokehouse.TestDfn>} testDefns
 * @param {Function|undefined} takeNetworkRequestUrls
 * @return {Array<Smokehouse.TestDfn>}
 */
function pruneExpectedNetworkRequests(testDefns, takeNetworkRequestUrls) {
  const pruneNetworkRequests = !takeNetworkRequestUrls;

  const clonedDefns = cloneDeep(testDefns);
  for (const {id, expectations, runSerially} of clonedDefns) {
    if (!runSerially && expectations.networkRequests) {
      throw new Error(`'${id}' must be set to 'runSerially: true' to assert 'networkRequests'`);
    }

    if (pruneNetworkRequests && expectations.networkRequests) {
      // eslint-disable-next-line max-len
      const msg = `'networkRequests' cannot be asserted in test '${id}'. They should only be asserted on tests from an in-process server`;
      if (process.env.CI) {
        // If we're in CI, we require any networkRequests expectations to be asserted.
        throw new Error(msg);
      }

      console.warn(log.redify('Warning:'),
          `${msg}. Pruning expectation: ${JSON.stringify(expectations.networkRequests)}`);
      expectations.networkRequests = undefined;
    }
  }

  return clonedDefns;
}

/**
 * CLI entry point.
 */
async function begin() {
  const y = yargs(yargsHelpers.hideBin(process.argv));
  const rawArgv = y
    .help('help')
    .usage('node $0 [<options>] <test-ids>')
    .example('node $0 -j=1 perf seo', 'run perf and seo tests serially')
    .option('_', {
      array: true,
      type: 'string',
    })
    .options({
      'debug': {
        type: 'boolean',
        default: false,
        describe: 'Save test artifacts and output verbose logs',
      },
      'jobs': {
        type: 'number',
        alias: 'j',
        default: DEFAULT_CONCURRENT_RUNS,
        describe: 'Manually set the number of jobs to run at once. `1` runs all tests serially',
      },
      'retries': {
        type: 'number',
        default: DEFAULT_RETRIES,
        describe: 'The number of times to retry failing tests before accepting. Defaults to 0',
      },
      'runner': {
        default: 'cli',
        choices: ['cli', 'bundle', 'devtools'],
        describe: 'The method of running Lighthouse',
      },
      'tests-path': {
        type: 'string',
        describe: 'The path to a set of test definitions to run. Defaults to core smoke tests.',
      },
      'shard': {
        type: 'string',
        // eslint-disable-next-line max-len
        describe: 'A argument of the form "n/d", which divides the selected tests into d groups and runs the nth group. n and d must be positive integers with 1 ≤ n ≤ d.',
      },
      'ignore-exclusions': {
        type: 'boolean',
        default: false,
        describe: 'Ignore any smoke test exclusions set.',
      },
      'headless': {
        type: 'boolean',
        default: true,
        hidden: true,
      },
      'no-headless': {
        type: 'boolean',
        describe: 'Launch Chrome in typical desktop headful mode, rather than our default of `--headless=new` (https://developer.chrome.com/articles/new-headless/).', // eslint-disable-line max-len
      },
    })
    .wrap(y.terminalWidth())
    .argv;

  // Augmenting yargs type with auto-camelCasing breaks in tsc@4.1.2 and @types/yargs@15.0.11,
  // so for now cast to add yarg's camelCase properties to type.
  const argv =
    /** @type {Awaited<typeof rawArgv> & LH.Util.CamelCasify<Awaited<typeof rawArgv>>} */ (rawArgv);

  const runnerPath = runnerPaths[/** @type {keyof typeof runnerPaths} */ (argv.runner)];
  if (argv.runner === 'bundle') {
    console.log('\n✨ Be sure to have recently run this: yarn build-all');
  }
  const {runLighthouse, setup} = await import(runnerPath);
  runLighthouse.runnerName = argv.runner;

  // Find test definition file and filter by requestedTestIds.
  let testDefnPath = argv.testsPath || coreTestDefnsPath;
  testDefnPath = path.resolve(process.cwd(), testDefnPath);
  const requestedTestIds = argv._;
  const {default: rawTestDefns} = await import(url.pathToFileURL(testDefnPath).href);
  const allTestDefns = updateTestDefnFormat(rawTestDefns);
  const excludedTests = new Set(exclusions[argv.runner] || []);
  const filteredTestDefns = argv.ignoreExclusions ?
    allTestDefns : allTestDefns.filter(test => !excludedTests.has(test.id));
  const requestedTestDefns = getDefinitionsToRun(filteredTestDefns,
      requestedTestIds, excludedTests);
  const testDefns = getShardedDefinitions(requestedTestDefns, argv.shard);

  let smokehouseResult;
  let servers;
  let takeNetworkRequestUrls = undefined;

  try {
    // If running the core tests, spin up the test server.
    if (testDefnPath === coreTestDefnsPath) {
      const {createServers} = await import('../../fixtures/static-server.js');
      servers = await createServers();
      takeNetworkRequestUrls = servers[0].takeRequestUrls.bind(servers[0]);
    }

    const prunedTestDefns = pruneExpectedNetworkRequests(testDefns, takeNetworkRequestUrls);
    const options = {
      jobs: argv.jobs,
      retries: argv.retries,
      testRunnerOptions: {
        isDebug: argv.debug,
        headless: argv.headless,
      },
      lighthouseRunner: runLighthouse,
      takeNetworkRequestUrls,
      setup,
    };

    smokehouseResult = (await runSmokehouse(prunedTestDefns, options));
  } finally {
    servers?.forEach(s => s.close());
  }

  let smokehouseOutputDir;
  let testResultsToOutput;
  if (!smokehouseResult.success) {
    // Save failed runs to directory. In CI, this is uploaded as an artifact.
    smokehouseOutputDir = `${LH_ROOT}/.tmp/smokehouse-failures`;
    testResultsToOutput = smokehouseResult.testResults.filter(r => r.failed);
  } else if (!process.env.CI) {
    // Otherwise, only write to disk in debug mode.
    smokehouseOutputDir = `${LH_ROOT}/.tmp/smokehouse-output`;
    testResultsToOutput = smokehouseResult.testResults;
  }

  if (smokehouseOutputDir && testResultsToOutput) {
    fs.rmSync(smokehouseOutputDir, {recursive: true, force: true});
    fs.mkdirSync(smokehouseOutputDir, {recursive: true});

    for (const testResult of testResultsToOutput) {
      for (let i = 0; i < testResult.runs.length; i++) {
        const runDir = `${smokehouseOutputDir}/${i}/${testResult.id}`;
        fs.mkdirSync(runDir, {recursive: true});

        const run = testResult.runs[i];
        await saveArtifacts(run.artifacts, runDir);
        await saveLhr(run.lhr, runDir);
        fs.writeFileSync(`${runDir}/assertionLog.txt`, run.assertionLog);
        fs.writeFileSync(`${runDir}/lighthouseLog.txt`, run.lighthouseLog);
        if (run.networkRequests) {
          fs.writeFileSync(`${runDir}/networkRequests.txt`, run.networkRequests.join('\n'));
        }
        const config = testDefns.find(test => test.id === testResult.id)?.config;
        if (config) {
          fs.writeFileSync(`${runDir}/config.json`, JSON.stringify(config, null, 2));
        }
      }
    }

    console.log(`smokehouse artifacts written to ${smokehouseOutputDir}`);
  }

  if (!smokehouseResult.success && testResultsToOutput) {
    const cmd = `yarn smoke ${testResultsToOutput.map(r => r.id).join(' ')}`;
    console.log(`rerun failures: ${cmd}`);
  }

  const exitCode = smokehouseResult.success ? 0 : 1;
  process.exit(exitCode);
}

await begin();
