/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Smoke test runner.
 * Used to test integrations that run Lighthouse within a browser (i.e. LR, DevTools)
 * Supports skipping and modifiying expectations to match the environment.
 */

import smokeTests from '../core-tests.js';
import {runSmokehouse, getShardedDefinitions} from '../smokehouse.js';

/**
 * @param {Smokehouse.SmokehouseLibOptions} options
 */
async function smokehouse(options) {
  const {urlFilterRegex, skip, modify, shardArg, ...smokehouseOptions} = options;

  const clonedTests = structuredClone(smokeTests);
  const modifiedTests = [];
  for (const test of clonedTests) {
    if (urlFilterRegex && !test.expectations.lhr.requestedUrl.match(urlFilterRegex)) {
      continue;
    }

    const reasonToSkip = skip && skip(test, test.expectations);
    if (reasonToSkip) {
      console.log(`skipping ${test.expectations.lhr.requestedUrl}: ${reasonToSkip}`);
      continue;
    }

    modify && modify(test, test.expectations);
    modifiedTests.push(test);
  }

  const shardedTests = getShardedDefinitions(modifiedTests, shardArg);

  return runSmokehouse(shardedTests, smokehouseOptions);
}

export {smokehouse};
