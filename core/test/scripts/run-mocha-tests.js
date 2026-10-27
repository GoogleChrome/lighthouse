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

import Mocha from 'mocha';
import yargs from 'yargs';
import * as yargsHelpers from 'yargs/helpers';

import {LH_ROOT} from '../../../shared/root.js';
import {mochaGlobalSetup, mochaGlobalTeardown} from '../test-env/mocha-setup.js';

// Tell gatherer to use 100 quality for FPS tests.
process.env.LH_FPS_TEST = '1';

const failedTestsDir = `${LH_ROOT}/.tmp/failing-tests`;

/** @param {string} text */
function escapeRegex(text) {
  return text.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&');
}

function getFailedTests() {
  const allFailedTests = [];
  for (const file of fs.globSync('*.json', {cwd: failedTestsDir}).sort()) {
    allFailedTests.push(...JSON.parse(fs.readFileSync(path.join(failedTestsDir, file), 'utf-8')));
  }
  return allFailedTests;
}

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
  const testsGlob = argv.testMatch || defaultTestMatches;
  const allTestFiles = fs.globSync(testsGlob, {
    cwd: LH_ROOT,
    exclude: ['**/node_modules/**'],
  }).sort();

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
 * @property {string | undefined} require
 * @property {number | undefined} retries
 */

/**
 * @param {string[]} tests
 * @param {OurMochaArgs} mochaArgs
 */
async function runMocha(tests, mochaArgs) {
  const failedTestsFile = `${failedTestsDir}/output.json`;
  const notRunnableTestsFile = `${failedTestsDir}/output-not-runnable.json`;
  process.env.LH_FAILED_TESTS_FILE = failedTestsFile;

  const rootHooksPath = mochaArgs.require || '../test-env/mocha-setup.js';
  const {rootHooks} = await import(rootHooksPath);

  const mocha = new Mocha({
    rootHooks,
    timeout: 20_000,
    bail: mochaArgs.bail,
    grep: mochaArgs.grep,
    forbidOnly: mochaArgs.forbidOnly,
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

  fs.rmSync(failedTestsDir, {recursive: true, force: true});
  fs.mkdirSync(failedTestsDir, {recursive: true});

  /** @type {OurMochaArgs} */
  const mochaArgs = {
    grep,
    bail: argv.bail,
    require: argv.require,
    retries: argv.retries,
    forbidOnly: argv.forbidOnly,
  };

  mochaGlobalSetup();
  let numberFailures = 0;
  try {
    if (testsToRun.length) {
      numberFailures = await runMocha(testsToRun, mochaArgs);
    }
  } finally {
    mochaGlobalTeardown();
  }

  exit({numberFailures});
}

await main();
