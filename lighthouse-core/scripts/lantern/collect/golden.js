/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/** @typedef {import('./common.js').Result} Result */
/** @typedef {import('./common.js').Summary} Summary */
/** @typedef {import('../run-on-all-assets.js').Golden} Golden */

const fs = require('fs');
const rimraf = require('rimraf');
const common = require('./common.js');

/**
 * @template T
 * @param {number} percentile 0 - 1
 * @param {T[]} values
 * @param {(sortValue: T) => number} mapper
 */
function getPercentileBy(percentile, values, mapper) {
  const resultsWithValue = values.map(value => {
    return {sortValue: mapper(value), value};
  });
  resultsWithValue.sort((a, b) => a.sortValue - b.sortValue);
  const pos = Math.floor((values.length - 1) * percentile);
  return resultsWithValue[pos].value;
}

/**
 * Returns run w/ the %ile based on FCP.
 * @param {number} percentile
 * @param {Result[]} results
 */
function getPercentileResult(percentile, results) {
  const resultsWithMetrics = results.map(result => {
    const metrics = common.getMetrics(loadLhr(result.lhr));
    if (!metrics) throw new Error('could not find metrics'); // This shouldn't happen.
    return {result, metrics};
  });
  return getPercentileBy(
    percentile, resultsWithMetrics, ({metrics}) => Number(metrics.firstContentfulPaint)).result;
}

/**
 * @param {string} filename
 * @return {LH.Result}
 */
function loadLhr(filename) {
  return JSON.parse(fs.readFileSync(`${common.collectFolder}/${filename}`, 'utf-8'));
}

/**
 * @param {string} filename
 */
function copyToGolden(filename) {
  fs.copyFileSync(`${common.collectFolder}/${filename}`, `${common.goldenFolder}/${filename}`);
}

/**
 * @param {string} filename
 * @param {string} data
 */
function saveGoldenData(filename, data) {
  fs.writeFileSync(`${common.goldenFolder}/${filename}`, data);
}

/** @type {typeof common.ProgressLogger['prototype']} */
let log;

async function main() {
  log = new common.ProgressLogger();

  /** @type {Summary} */
  const summary = common.loadSummary();

  const goldenSites = [];
  for (const [index, {url, wpt, unthrottled}] of Object.entries(summary.results)) {
    log.progress(`finding median ${Number(index) + 1} / ${summary.results.length}`);
    // Use the nearly-best-case run from WPT, to match the optimistic viewpoint of lantern, and
    // avoid variability that is not addressable by Lighthouse. Don't use the best case because
    // that increases liklihood of using a run that failed to load an important subresource.
    const medianWpt = getPercentileResult(0.25, wpt);
    // Use the median run for unthrottled.
    const medianUnthrottled = getPercentileResult(0.5, unthrottled);
    if (!medianWpt || !medianUnthrottled) continue;
    if (!medianUnthrottled.devtoolsLog) throw new Error(`missing devtoolsLog for ${url}`);

    const wptMetrics = common.getMetrics(loadLhr(medianWpt.lhr));
    if (!wptMetrics) {
      throw new Error('expected wptMetrics');
    }
    goldenSites.push({
      url,
      wpt3g: {
        firstContentfulPaint: wptMetrics.firstContentfulPaint,
        firstMeaningfulPaint: wptMetrics.firstMeaningfulPaint,
        timeToFirstInteractive: wptMetrics.firstCPUIdle,
        timeToConsistentlyInteractive: wptMetrics.interactive,
        speedIndex: wptMetrics.speedIndex,
        largestContentfulPaint: wptMetrics.largestContentfulPaint,
      },
      unthrottled: {
        tracePath: medianUnthrottled.trace,
        devtoolsLogPath: medianUnthrottled.devtoolsLog,
      },
    });
  }
  /** @type {Golden} */
  const golden = {sites: goldenSites};

  rimraf.sync(common.goldenFolder);
  fs.mkdirSync(common.goldenFolder);
  saveGoldenData('site-index-plus-golden-expectations.json', JSON.stringify(golden, null, 2));
  for (const result of goldenSites) {
    log.progress('making site-index-plus-golden-expectations.json');
    copyToGolden(result.unthrottled.devtoolsLogPath);
    copyToGolden(result.unthrottled.tracePath);
  }

  log.progress('archiving ...');
  await common.archive(common.goldenFolder);
  log.closeProgress();
}

main();
