#!/usr/bin/env node
/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable no-console */

import fs from 'fs';
import assert from 'assert/strict';
import path from 'path';

import chalk from 'chalk';

import constants from './constants.js';
import {readJson} from '../../test/test-utils.js';

const INPUT_PATH = process.argv[2] || constants.SITE_INDEX_WITH_GOLDEN_WITH_COMPUTED_PATH;
const HEAD_PATH = path.resolve(process.cwd(), INPUT_PATH);
const BASELINE_PATH = constants.BASELINE_COMPUTED_PATH;
const BASELINE_ACCURACY_PATH = constants.BASELINE_ACCURACY_PATH;

if (!fs.existsSync(HEAD_PATH) || !fs.existsSync(BASELINE_PATH)) {
  throw new Error('Usage $0 <computed file>');
}

const computedResults = readJson(HEAD_PATH);
const expectedResults = readJson(BASELINE_PATH);

/** @type {Array<{url: string, maxDiff: number, diffsForSite: Array<DiffForSite>}>} */
const diffs = [];
for (const entry of computedResults.sites) {
  // @ts-expect-error - over-aggressive implicit any on candidate
  const expectedLantern = expectedResults.sites.find(candidate => entry.url === candidate.url);
  const actualLantern = entry.lantern;

  let maxDiff = 0;
  /** @type {DiffForSite[]} */
  const diffsForSite = [];
  Object.keys(actualLantern).forEach(metricName => {
    if (!(metricName in expectedLantern)) throw new Error(`missing metric ${metricName}`);

    const actual = Math.round(actualLantern[metricName]);
    const expected = Math.round(expectedLantern[metricName]);
    const diff = actual - expected;
    if (Math.abs(diff) > 0) {
      maxDiff = Math.max(maxDiff, Math.abs(diff));
      diffsForSite.push({metricName, actual, expected, diff});
    }
  });

  if (maxDiff > 0) diffs.push({url: entry.url, maxDiff, diffsForSite});
}

if (diffs.length) {
  console.log(`❌  FAIL    ${diffs.length} change(s) between expected and computed!\n`);

  diffs.sort((a, b) => b.maxDiff - a.maxDiff).forEach(site => {
    console.log(chalk.magenta(site.url));
    site.diffsForSite.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)).forEach(entry => {
      const metric = `    - ${entry.metricName.padEnd(25)}`;
      const diff = entry.diff > 0 ? chalk.yellow(`+${entry.diff}`) : chalk.cyan(`${entry.diff}`);
      const actual = `${entry.actual} ${chalk.gray('(HEAD)')}`;
      const expected = `${entry.expected} ${chalk.gray('(baseline)')}`;
      console.log(`${metric}${diff}\t${actual}\tvs.\t${expected}`);
    });
  });

  process.exit(1);
} else {
  assert.deepStrictEqual(
    constants.evaluateAllMetrics(computedResults, expectedResults),
    readJson(BASELINE_ACCURACY_PATH)
  );
  console.log('✅  PASS    No changes between expected and computed!');
}

/** @typedef {{metricName: string, actual: number, expected: number, diff: number}} DiffForSite */
