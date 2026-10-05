/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/** @typedef {import('./common.js').Summary} Summary */

import fs from 'fs';

import * as common from './common.js';

/**
 * @param {string} filename
 * @return {LH.Result}
 */
function loadLhr(filename) {
  return JSON.parse(fs.readFileSync(`${common.collectFolder}/${filename}`, 'utf-8'));
}

/**
 * @param {common.ProgressLogger} log
 * @param {Summary} summary
 */
function makeGolden(log, summary) {
  const goldenSites = [];
  for (const [index, result] of Object.entries(summary.results)) {
    const {url, wpt, unthrottled, wptRetries, unthrottledRetries} = result;
    // If something failed, or we had to retry... just drop from the golden dataset.
    if (!wpt || !unthrottled || wptRetries || unthrottledRetries) {
      log.log(`excluding ${url}`);
      continue;
    }

    // Should never happen.
    if (!unthrottled.devtoolsLog) throw new Error(`missing devtoolsLog for ${url}`);

    log.progress(`getting metrics ${Number(index) + 1} / ${summary.results.length}`);
    const mobileMetrics = common.getMetrics(loadLhr(wpt.lhr));
    if (!mobileMetrics) {
      throw new Error('expected mobileMetrics');
    }

    goldenSites.push({
      url,
      wpt3g: {
        firstContentfulPaint: mobileMetrics.firstContentfulPaint,
        timeToConsistentlyInteractive: mobileMetrics.interactive,
        speedIndex: mobileMetrics.speedIndex,
        largestContentfulPaint: mobileMetrics.largestContentfulPaint,
        timeToFirstByte: mobileMetrics.timeToFirstByte,
        lcpLoadDelay: mobileMetrics.lcpLoadDelay,
        lcpLoadDuration: mobileMetrics.lcpLoadDuration,
      },
      unthrottled: {
        tracePath: unthrottled.trace,
        devtoolsLogPath: unthrottled.devtoolsLog,
        lhrPath: unthrottled.lhr,
      },
    });
  }

  common.saveGolden({sites: goldenSites});
}

export {
  makeGolden,
};
