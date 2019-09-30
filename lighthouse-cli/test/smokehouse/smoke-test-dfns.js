/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const path = require('path');
const smokehouseDir = 'lighthouse-cli/test/smokehouse/';

/** @type {Array<Smokehouse.TestDfn>} */
const SMOKE_TEST_DFNS = [{
  id: 'a11y',
  config: smokehouseDir + 'a11y/a11y-config.js',
  expectations: 'a11y/expectations.js',
  batch: 'parallel-first',
}, {
  id: 'errors',
  expectations: smokehouseDir + 'error-expectations.js',
  config: smokehouseDir + 'error-config.js',
  batch: 'errors',
}, {
  id: 'oopif',
  expectations: smokehouseDir + 'oopif-expectations.js',
  config: smokehouseDir + 'oopif-config.js',
  batch: 'parallel-first',
}, {
  id: 'pwa',
  expectations: smokehouseDir + 'pwa-expectations.js',
  config: smokehouseDir + 'pwa-config.js',
  batch: 'parallel-second',
}, {
  id: 'pwa2',
  expectations: smokehouseDir + 'pwa2-expectations.js',
  config: smokehouseDir + 'pwa-config.js',
  batch: 'parallel-second',
}, {
  id: 'pwa3',
  expectations: smokehouseDir + 'pwa3-expectations.js',
  config: smokehouseDir + 'pwa-config.js',
  batch: 'parallel-first',
}, {
  id: 'dbw',
  expectations: 'dobetterweb/dbw-expectations.js',
  config: smokehouseDir + 'dbw-config.js',
  batch: 'parallel-second',
}, {
  id: 'redirects',
  expectations: 'redirects/expectations.js',
  config: smokehouseDir + 'redirects-config.js',
  batch: 'parallel-first',
}, {
  id: 'seo',
  expectations: 'seo/expectations.js',
  config: smokehouseDir + 'seo-config.js',
  batch: 'parallel-first',
}, {
  id: 'offline',
  expectations: 'offline-local/offline-expectations.js',
  config: smokehouseDir + 'offline-config.js',
  batch: 'offline',
}, {
  id: 'byte',
  expectations: 'byte-efficiency/expectations.js',
  config: smokehouseDir + 'byte-config.js',
  batch: 'perf-opportunity',
}, {
  id: 'perf',
  expectations: 'perf/expectations.js',
  config: 'perf/perf-config.js',
  batch: 'perf-metric',
}, {
  id: 'lantern',
  expectations: 'perf/lantern-expectations.js',
  config: smokehouseDir + 'lantern-config.js',
  batch: 'parallel-first',
}, {
  id: 'metrics',
  expectations: 'tricky-metrics/expectations.js',
  config: 'lighthouse-core/config/perf-config.js',
  batch: 'parallel-second',
}, {
  id: 'visibility',
  expectations: 'visibility-expectations.js',
  config: 'visibility-config.js',
  flags: 'visibility-cli-flags.json',
  batch: 'visibility',
}];

/**
 * Attempt to resolve a path relative to the smokehouse folder.
 * If this fails, attempts to locate the path
 * relative to the project root.
 * @param {string} payloadPath
 * @return {string}
 */
function resolveLocalOrProjectRoot(payloadPath) {
  let resolved;
  try {
    resolved = require.resolve(__dirname + '/' + payloadPath);
  } catch (e) {
    const cwdPath = path.resolve(__dirname + '/../../../', payloadPath);
    resolved = require.resolve(cwdPath);
  }

  return resolved;
}

/**
 * @param {string} configPath
 * @return {LH.Config.Json}
 */
function loadConfig(configPath) {
  return require(configPath);
}

/**
 * @param {string} expectationsPath
 * @return {Smokehouse.ExpectedRunnerResult[]}
 */
function loadExpectations(expectationsPath) {
  return require(expectationsPath);
}

function getSmokeTests() {
  return SMOKE_TEST_DFNS.map(smokeTestDfn => {
    return {
      id: smokeTestDfn.id,
      config: loadConfig(resolveLocalOrProjectRoot(smokeTestDfn.config)),
      expectations: loadExpectations(resolveLocalOrProjectRoot(smokeTestDfn.expectations)),
      flagsPath: smokeTestDfn.flags,
      batch: smokeTestDfn.batch,
    };
  });
}

module.exports = {
  SMOKE_TEST_DFNS,
  getSmokeTests,
};
