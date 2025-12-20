/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Smoke test runner.
 * Used to test integrations that run Lighthouse within a browser (i.e. LR, DevTools)
 * Supports skipping and modifiying expectations to match the environment.
 */

/* eslint-disable no-console */

const cloneDeep = require('lodash.clonedeep');
const smokeTests = require('../test-definitions/core-tests.js');
const {runSmokehouse} = require('../smokehouse.js');

/**
 * @param {Smokehouse.SmokehouseLibOptions} options
 */
async function smokehouse(options) {
  const {urlFilterRegex, skip, modify, ...smokehouseOptions} = options;

  const clonedTests = cloneDeep(smokeTests);
  const modifiedTests = clonedTests.map(test => {
    const modifiedExpectations = [];
    for (const expected of test.expectations) {
      if (urlFilterRegex && !expected.lhr.requestedUrl.match(urlFilterRegex)) {
        continue;
      }

      const reasonToSkip = skip && skip(test, expected);
      if (reasonToSkip) {
        console.log(`skipping ${expected.lhr.requestedUrl}: ${reasonToSkip}`);
        continue;
      }

      modify && modify(test, expected);
      modifiedExpectations.push(expected);
    }

    return {
      ...test,
      expectations: modifiedExpectations,
    };
  }).filter(test => test.expectations.length > 0);

  return runSmokehouse(modifiedTests, smokehouseOptions);
}

module.exports = smokehouse;
