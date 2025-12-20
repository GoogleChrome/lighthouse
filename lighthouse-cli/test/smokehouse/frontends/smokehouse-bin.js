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
 * Determine batches of smoketests to run, based on the `requestedIds`.
 * @param {Array<Smokehouse.TestDfn>} allTestDefns
 * @param {Array<string>} requestedIds
 * @return {Array<Smokehouse.TestDfn>}
 */
function getDefinitionsToRun(allTestDefns, requestedIds) {
  let smokes = [];
  const usage = `    ${log.dim}yarn smoke ${allTestDefns.map(t => t.id).join(' ')}${log.reset}\n`;

  if (requestedIds.length === 0) {
    smokes = [...allTestDefns];
    console.log('Running ALL smoketests. Equivalent to:');
    console.log(usage);
  } else {
    smokes = allTestDefns.filter(test => requestedIds.includes(test.id));
    console.log(`Running ONLY smoketests for: ${smokes.map(t => t.id).join(' ')}\n`);
  }

  const unmatchedIds = requestedIds.filter(requestedId => {
    return !allTestDefns.map(t => t.id).includes(requestedId);
  });
  if (unmatchedIds.length) {
    console.log(log.redify(`Smoketests not found for: ${unmatchedIds.join(' ')}`));
    console.log(usage);
  }

  return smokes;
}

/**
 * CLI entry point.
 */
async function begin() {
  const argv = yargs
    .help('help')
    .usage('node $0 [<options>] <test-ids>')
    .example('node $0 -j=1 pwa seo', 'run pwa and seo tests serially')
    .describe({
      'debug': 'Save test artifacts and output verbose logs',
      'jobs': 'Manually set the number of jobs to run at once. `1` runs all tests serially',
      'retries': 'The number of times to retry failing tests before accepting. Defaults to 0',
      'runner': 'The method of running Lighthouse',
      'tests-path': 'The path to a set of test definitions to run. Defaults to core smoke tests.',
    })
    .boolean(['debug'])
    .alias({
      'jobs': 'j',
    })
    .choices('runner', ['cli', 'bundle'])
    .default('runner', 'cli')
    .wrap(yargs.terminalWidth())
    .argv;

  // TODO: use .number() when yargs is updated
  const jobs = argv.jobs !== undefined ? Number(argv.jobs) : undefined;
  const retries = argv.retries !== undefined ? Number(argv.retries) : undefined;

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
  const testDefns = getDefinitionsToRun(allTestDefns, requestedTestIds);

  const options = {jobs, retries, isDebug: argv.debug, lighthouseRunner};

  let isPassing;
  try {
    server.listen(10200, 'localhost');
    serverForOffline.listen(10503, 'localhost');
    isPassing = (await runSmokehouse(testDefns, options)).success;
  } finally {
    await server.close();
    await serverForOffline.close();
  }

  const exitCode = isPassing ? 0 : 1;
  process.exit(exitCode);
}

begin().catch(e => {
  console.error(e);
  process.exit(1);
});
