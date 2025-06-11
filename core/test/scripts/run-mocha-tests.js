/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview
 * CLI tool for running mocha tests. Run with `yarn mocha`
 */

import fs from 'fs';
import path from 'path';
import {Worker, isMainThread, parentPort, workerData} from 'worker_threads';
import {once} from 'events';

import Mocha from 'mocha';
import yargs from 'yargs';
import * as yargsHelpers from 'yargs/helpers';
import glob from 'glob';

import {LH_ROOT} from '../../../shared/root.js';
import {mochaGlobalSetup, mochaGlobalTeardown} from '../test-env/mocha-setup.js';

// Tell gatherer to use 100 quality for FPS tests.
process.env.LH_FPS_TEST = '1';

const failedTestsDir = `${LH_ROOT}/.tmp/failing-tests`;

if (!isMainThread && parentPort) {
  // Worker.
  const {test, mochaArgs, numberMochaInvocations} = workerData;
  const numberFailures = await runMocha([test], mochaArgs, numberMochaInvocations);
  parentPort?.postMessage({type: 'result', numberFailures});
  process.exit(0);
}

/** @param {string} text */
function escapeRegex(text) {
  return text.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&');
}

function getFailedTests() {
  const allFailedTests = [];
  for (const file of glob.sync('*.json', {cwd: failedTestsDir, absolute: true})) {
    allFailedTests.push(...JSON.parse(fs.readFileSync(file, 'utf-8')));
  }
  return allFailedTests;
}

// Some tests replace real modules with mocks in the global scope of the test file
// (outside 'before' lifecycle / a test unit). Before doing any lifecycle stuff, Mocha will load
// all test files (everything if --no-parallel, else each worker will load a subset of the files
// all at once). This results in unexpected mocks contaminating other test files.
//
// For now, we isolate a number of tests until they can be refactored.
//
// To run tests without isolation, and all in one process:
//    yarn mocha --no-isolation --no-parallel core/test
//
// Because mocha workers can divide up test files that mess with global scope in a way that
// _just happens_ to not cause anything to fail, use this command to verify that
// all necessary tests are isolated:
//    yarn mocha --no-parallel
// (also, just comment out the `testsToRunIsolated` below, as they won't impact this verification)
const testsToIsolate = new Set([
  // grep -lRE '^await td\.replace' --include='*-test.*' --exclude-dir=node_modules
  'core/test/gather/snapshot-runner-test.js',
  'core/test/gather/timespan-runner-test.js',
  'core/test/user-flow-test.js',
  'core/test/gather/driver/prepare-test.js',
  'core/test/gather/gatherers/link-elements-test.js',
  'core/test/runner-test.js',

  // grep -lRE --include='-test.js' 'mockDriverSubmodules|mockRunnerModule|mockDriverModule|mockDriverSubmodules|makeMocksForGatherRunner' --include='*-test.*' --exclude-dir=node_modules
  'core/test/gather/navigation-runner-test.js',
  'core/test/gather/snapshot-runner-test.js',
  'core/test/gather/timespan-runner-test.js',
  'core/test/user-flow-test.js',
  'core/test/gather/gatherers/dobetterweb/response-compression-test.js',
  'core/test/runner-test.js',

  // These tend to timeout in puppeteer when run in parallel with other tests.
  'core/test/scenarios/api-test-pptr.js',
  'core/test/scenarios/cross-origin-test-pptr.js',
  'core/test/scenarios/disconnect-test-pptr.js',

  // ?
  'clients/test/lightrider/lightrider-entry-test.js', // Runner overrides.
  'flow-report/test/flow-report-pptr-test.ts',
  'cli/test/cli/bin-test.js',
  'cli/test/cli/run-test.js',
  'core/test/config/config-test.js',
  'core/test/lib/emulation-test.js',
  'core/test/lib/sentry-test.js',
  'report/test/clients/bundle-test.js',
  'report/test/clients/bundle-test.js',
  'shared/test/localization/format-test.js',
]);

const y = yargs(yargsHelpers.hideBin(process.argv));
// TODO: -t => --fgrep
const rawArgv = y
  .help('help')
  .usage('node $0 [<options>] <paths>')
  .parserConfiguration({'unknown-options-as-args': true})
  .option('_', {
    array: true,
    type: 'string',
  })
  .options({
    'testMatch': {
      type: 'string',
      describe: 'Glob pattern for collecting test files',
    },
    'update': {
      alias: 'u',
      type: 'boolean',
      default: false,
      describe: 'Update snapshots',
    },
    'isolation': {
      type: 'boolean',
      default: true,
    },
    'parallel': {
      type: 'boolean',
      // Although much faster, mocha's parallel test runner defers printing errors until
      // all tests have finished. This may be undesired for local development, so enable
      // parallel mode by default only in CI.
      // Also, good to default to false locally because that avoids missing cross-file
      // test contamination by chance of mocha splitting up the work in a way that hides it.
      default: Boolean(process.env.CI),
    },
    'bail': {
      alias: 'b',
      type: 'boolean',
      default: false,
    },
    't': {
      type: 'string',
      describe: 'an alias for --grep, to run only tests with matching titles',
    },
    'onlyFailures': {
      type: 'boolean',
    },
    'require': {
      type: 'string',
    },
    'retries': {
      type: 'number',
      default: process.env.CI ? 5 : undefined,
    },
    'forbidOnly': {
      type: 'boolean',
      default: Boolean(process.env.CI),
    },
  })
  .wrap(y.terminalWidth())
  .argv;
const argv =
  /** @type {Awaited<typeof rawArgv> & LH.Util.CamelCasify<Awaited<typeof rawArgv>>} */ (rawArgv);

// This captures all of our mocha tests except for:
// * flow-report, because it needs to provide additional mocha flags
// * various *-test-pptr.js integration tests, which are long so are handled explicitly in
//   specific package.json scripts
const defaultTestMatches = [
  'build/**/*-test.js',
  'clients/test/**/*-test.js',
  'cli/**/*-test.js',
  'core/**/*-test.js',
  'core/test/**/*-test-pptr.js',
  'report/**/*-test.js',
  'shared/**/*-test.js',
  'third-party/**/*-test.js',
  'treemap/**/*-test.js',
  'viewer/**/*-test.js',
];

const filterFilePatterns = argv._.filter(arg => !(typeof arg !== 'string' || arg.startsWith('--')))
  .map(pattern => {
    if (path.isAbsolute(pattern)) {
      // Allows this to work:
      //     yarn mocha /Users/cjamcl/src/lighthouse/core/test/runner-test.js
      return path.relative(LH_ROOT, pattern);
    } else {
      return pattern;
    }
  });

function getTestFiles() {
  // Collect all the possible test files, based off the provided testMatch glob pattern
  // or the default patterns defined above.
  const testsGlob = argv.testMatch || `{${defaultTestMatches.join(',')}}`;
  const allTestFiles = glob.sync(testsGlob, {cwd: LH_ROOT, ignore: '**/node_modules/**'});

  // If provided, filter the test files using a basic string includes on the absolute path of
  // each test file.
  let filteredTests = filterFilePatterns.length ?
    allTestFiles.filter((file) => filterFilePatterns.some(pattern => file.includes(pattern))) :
    allTestFiles;

  let grep;
  if (argv.onlyFailures) {
    const failedTests = getFailedTests();
    if (failedTests.length === 0) throw new Error('no tests failed');

    const titles = failedTests.map(failed => failed.title);
    grep = new RegExp(titles.map(escapeRegex).join('|'));

    filteredTests = filteredTests.filter(file => failedTests.some(failed => failed.file === file));
  } else if (argv.t) {
    grep = argv.t;
  }

  if (filterFilePatterns.length) {
    console.log(`applied test filters: ${JSON.stringify(filterFilePatterns, null, 2)}`);
  }
  console.log(`running ${filteredTests.length} test files`);

  return {filteredTests, grep};
}

/**
 * @param {{numberFailures: number}} params
 */
function exit({numberFailures}) {
  if (!numberFailures) {
    console.log('Tests passed');
    process.exit(0);
  }

  // If running many instances of mocha, failed results can get lost in the output.
  // So keep track of failures and re-print them at the very end.
  // See mocha-setup.js afterAll.

  const allFailedTests = getFailedTests();
  const groupedByFile = new Map();
  for (const failedTest of allFailedTests) {
    const failedTests = groupedByFile.get(failedTest.file) || [];
    failedTests.push(failedTest);
    groupedByFile.set(failedTest.file, failedTests);
  }

  console.log(`${allFailedTests.length} tests failed`);
  console.log('Printing failing tests:\n===========\n');

  for (const [file, failedTests] of groupedByFile) {
    console.log(`${file}\n`);
    for (const failedTest of failedTests) {
      console.log(`= ${failedTest.title}\n`);
      console.log(`${failedTest.error}\n`);
    }
  }

  process.exit(1);
}

/**
 * @typedef OurMochaArgs
 * @property {RegExp | string | undefined} grep
 * @property {boolean} bail
 * @property {boolean} forbidOnly
 * @property {boolean} parallel
 * @property {string | undefined} require
 * @property {number | undefined} retries
 */

/**
 * @param {string[]} tests
 * @param {OurMochaArgs} mochaArgs
 * @param {number} invocationNumber
 */
async function runMocha(tests, mochaArgs, invocationNumber) {
  const failedTestsFile = `${failedTestsDir}/output-${invocationNumber}.json`;
  const notRunnableTestsFile = `${failedTestsDir}/output-${invocationNumber}-not-runnable.json`;
  process.env.LH_FAILED_TESTS_FILE = failedTestsFile;

  const rootHooksPath = mochaArgs.require || '../test-env/mocha-setup.js';
  const {rootHooks} = await import(rootHooksPath);

  const mocha = new Mocha({
    rootHooks,
    timeout: 20_000,
    bail: mochaArgs.bail,
    grep: mochaArgs.grep,
    forbidOnly: mochaArgs.forbidOnly,
    // TODO: not working
    // parallel: parsableTests.length > 1 && mochaArgs.parallel,
    parallel: false,
    retries: mochaArgs.retries,
  });

  // Load a single test module at a time, so we know which ones fail to even import.
  const notRunnableTests = [];
  const parsableTests = [];
  for (const test of tests) {
    try {
      mocha.files = [test];
      await mocha.loadFilesAsync();
      parsableTests.push(test);
    } catch (e) {
      notRunnableTests.push({
        file: path.relative(LH_ROOT, test),
        title: '',
        error: `Failed to parse module: ${e}`,
      });
    }
  }
  mocha.files = [];

  let failingTestCount = 0;
  if (parsableTests.length) {
    try {
      failingTestCount = await new Promise(resolve => mocha.run(resolve));
    } catch (err) {
      // Something awful happened, and maybe no tests ran at all.
      const errorMessage = `Mocha failed to run: ${err}`;
      notRunnableTests.push(...parsableTests.map((test, i) => {
        return {
          file: path.relative(LH_ROOT, test),
          title: '',
          error: i === 0 ? errorMessage : '(see above failure)',
        };
      }));
    }
  }

  if (notRunnableTests.length) {
    fs.writeFileSync(notRunnableTestsFile, JSON.stringify(notRunnableTests, null, 2));
  }

  return failingTestCount + notRunnableTests.length;
}

async function main() {
  process.env.SNAPSHOT_UPDATE = argv.update ? '1' : '';

  const {filteredTests: testsToRun, grep} = getTestFiles();
  const testsToRunTogether = [];
  const testsToRunIsolated = [];
  for (const test of testsToRun) {
    if (argv.isolation && testsToIsolate.has(test)) {
      testsToRunIsolated.push(test);
    } else {
      testsToRunTogether.push(test);
    }
  }

  // If running only a single test file, no need for isolation at all. Move
  // the singular test to `testsToRunTogether` so that it's run in-process,
  // allowing for better DX when doing a `node --inspect-brk` workflow.
  if (testsToRunTogether.length === 0 && testsToRunIsolated.length === 1) {
    testsToRunTogether.push(testsToRunIsolated[0]);
    testsToRunIsolated.splice(0, 1);
  }

  fs.rmSync(failedTestsDir, {recursive: true, force: true});
  fs.mkdirSync(failedTestsDir, {recursive: true});

  /** @type {OurMochaArgs} */
  const mochaArgs = {
    grep,
    bail: argv.bail,
    parallel: argv.parallel,
    require: argv.require,
    retries: argv.retries,
    forbidOnly: argv.forbidOnly,
  };

  mochaGlobalSetup();
  let numberMochaInvocations = 0;
  let numberFailures = 0;
  try {
    if (testsToRunTogether.length) {
      numberFailures += await runMocha(testsToRunTogether, mochaArgs, numberMochaInvocations);
      numberMochaInvocations += 1;
      if (numberFailures && argv.bail) exit({numberFailures});
    }

    for (const test of testsToRunIsolated) {
      console.log(`Running test in isolation: ${test}`);
      const worker = new Worker(new URL(import.meta.url), {
        workerData: {
          test,
          mochaArgs,
          numberMochaInvocations,
        },
      });

      try {
        const [workerResponse] = await once(worker, 'message');
        numberFailures += workerResponse.numberFailures;
      } catch (err) {
        // `once` throws an error if the underlying event emitter produces an 'error' message.
        console.error(err);
        numberFailures += 1;
      }

      numberMochaInvocations += 1;
      if (numberFailures && argv.bail) exit({numberFailures});
    }
  } finally {
    mochaGlobalTeardown();
  }

  exit({numberFailures});
}

await main();
