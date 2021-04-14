/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview A smokehouse frontend for running from the command line. Parse
 * flags, start fixture webservers, then run smokehouse.
 */

/* eslint-disable no-console */

const path = require('path');
const {execFileSync} = require('child_process');
const yargs = require('yargs');
const log = require('lighthouse-logger');

const {runSmokehouse} = require('../smokehouse.js');
const {server, serverForOffline} = require('../../fixtures/static-server.js');

const coreTestDefnsPath = require.resolve('../test-definitions/core-tests.js');

/**
 * Possible Lighthouse runners. Loaded dynamically so e.g. a CLI run isn't
 * contingent on having built all the bundles.
 */
const runnerPaths = {
  cli: '../lighthouse-runners/cli.js',
  bundle: '../lighthouse-runners/bundle.js',
};

/**
 * https://stackoverflow.com/a/6969486/2788187
 * @param {string} str
 */
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

/**
 * Determine batches of smoketests to run, based on the `requestedIds`.
 * @param {Array<Smokehouse.TestDfn>} allTestDefns
 * @param {Array<string>} requestedIds
 * @param {{invertMatch: boolean, onlyUrls?: string[]}} options
 * @return {Array<Smokehouse.TestDfn>}
 */
function getDefinitionsToRun(allTestDefns, requestedIds, {invertMatch, onlyUrls}) {
  let smokes = [];
  const usage = `    ${log.dim}yarn smoke ${allTestDefns.map(t => t.id).join(' ')}${log.reset}\n`;

  if (requestedIds.length === 0 && !invertMatch) {
    smokes = [...allTestDefns];
    console.log('Running ALL smoketests. Equivalent to:');
    console.log(usage);
  } else {
    smokes = allTestDefns.filter(test => invertMatch !== requestedIds.includes(test.id));
    console.log(`Running ONLY smoketests for: ${smokes.map(t => t.id).join(' ')}\n`);
  }

  const unmatchedIds = requestedIds.filter(requestedId => {
    return !allTestDefns.map(t => t.id).includes(requestedId);
  });
  if (unmatchedIds.length) {
    console.log(log.redify(`Smoketests not found for: ${unmatchedIds.join(' ')}`));
    console.log(usage);
  }

  if (onlyUrls) {
    smokes = smokes.filter(smoke => {
      smoke.expectations = smoke.expectations.filter(expectation => {
        const url = expectation.lhr.requestedUrl;
        const shouldRunUrl = onlyUrls.some(pattern => new RegExp(escapeRegExp(pattern)).test(url));
        if (!shouldRunUrl) console.log(`skipping: ${url}`);
        return shouldRunUrl;
      });
      return smoke.expectations.length;
    });
  }

  if (!smokes.length) {
    throw new Error('no smoketest found to run');
  }

  return smokes;
}

/**
 * CLI entry point.
 */
async function begin() {
  const rawArgv = yargs
    .help('help')
    .usage('node $0 [<options>] <test-ids>')
    .example('node $0 -j=1 pwa seo', 'run pwa and seo tests serially')
    .example('node $0 --invert-match byte', 'run all smoke tests but `byte`')
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
        describe: 'Manually set the number of jobs to run at once. `1` runs all tests serially',
      },
      'retries': {
        type: 'number',
        describe: 'The number of times to retry failing tests before accepting. Defaults to 0',
      },
      'runner': {
        default: 'cli',
        choices: ['cli', 'bundle'],
        describe: 'The method of running Lighthouse',
      },
      'tests-path': {
        type: 'string',
        describe: 'The path to a set of test definitions to run. Defaults to core smoke tests.',
      },
      'invert-match': {
        type: 'boolean',
        default: false,
        describe: 'Run all available tests except the ones provided',
      },
      'only-urls': {
        type: 'string',
        array: true,
        describe: 'Filter for urls to run. Patterns accepted',
      },
    })
    .wrap(yargs.terminalWidth())
    .argv;

  // Augmenting yargs type with auto-camelCasing breaks in tsc@4.1.2 and @types/yargs@15.0.11,
  // so for now cast to add yarg's camelCase properties to type.
  const argv = /** @type {typeof rawArgv & CamelCasify<typeof rawArgv>} */ (rawArgv);

  const jobs = Number.isFinite(argv.jobs) ? argv.jobs : undefined;
  const retries = Number.isFinite(argv.retries) ? argv.retries : undefined;

  const runnerPath = runnerPaths[/** @type {keyof typeof runnerPaths} */ (argv.runner)];
  if (argv.runner === 'bundle') {
    console.log('\n✨ Be sure to have recently run this: yarn build-all');
  }
  const lighthouseRunner = require(runnerPath).runLighthouse;

  // Find test definition file and filter by requestedTestIds.
  let testDefnPath = argv.testsPath || coreTestDefnsPath;
  testDefnPath = path.resolve(process.cwd(), testDefnPath);
  const requestedTestIds = argv._;
  const allTestDefns = require(testDefnPath);
  const invertMatch = argv.invertMatch;
  const onlyUrls = argv.onlyUrls;
  const testDefns = getDefinitionsToRun(allTestDefns, requestedTestIds, {invertMatch, onlyUrls});

  const options = {jobs, retries, isDebug: argv.debug, lighthouseRunner};

  let testResults;
  try {
    server.listen(10200, 'localhost');
    serverForOffline.listen(10503, 'localhost');
    testResults = await runSmokehouse(testDefns, options);
  } finally {
    await server.close();
    await serverForOffline.close();
  }

  const failingUrls = testResults.testResults
    .flatMap(result => result.expectationResults)
    .filter(result => result.failed > 0)
    .map(result => result.requestedUrl);

  if (failingUrls.length) {
    const rerunCommand = execFileSync('echo', [
      'node',
      path.relative(process.cwd(), __filename),
      '--only-urls',
      ...failingUrls,
    ], {encoding: 'utf8'}).trim();
    console.error(`To run just these failing smoke tests:\n   ${rerunCommand}`);
  }

  const exitCode = testResults.success ? 0 : 1;
  process.exit(exitCode);
}

begin().catch(e => {
  console.error(e);
  process.exit(1);
});
