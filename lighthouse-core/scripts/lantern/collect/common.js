/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/** @typedef {{devtoolsLog?: string, lhr: string, trace: string}} Result */
/** @typedef {{url: string, wpt: Result[], unthrottled: Result[]}} ResultsForUrl */
/** @typedef {Result & {metrics: LH.Artifacts.TimingSummary}} ResultWithMetrics */
/** @typedef {{results: ResultsForUrl[], warnings: string[]}} Summary */

const fs = require('fs');
const readline = require('readline');
const {promisify} = require('util');
const archiver = require('archiver');
const streamFinished = promisify(require('stream').finished);

const LH_ROOT = `${__dirname}/../../../..`;
const collectFolder = `${LH_ROOT}/dist/collect-lantern-traces`;
const summaryPath = `${collectFolder}/summary.json`;
const goldenFolder = `${LH_ROOT}/dist/golden-lantern-traces`;

const IS_INTERACTIVE = !!process.stdout.isTTY && !process.env.GCP_COLLECT;

class ProgressLogger {
  constructor() {
    this._currentProgressMessage = '';
    this._loadingChars = '⣾⣽⣻⢿⡿⣟⣯⣷ ⠁⠂⠄⡀⢀⠠⠐⠈';
    this._nextLoadingIndex = 0;
    this._progressBarHandle = setInterval(
      () => this.progress(this._currentProgressMessage),
      IS_INTERACTIVE ? 100 : 5000
    );
  }

  /**
   * @param  {...any} args
   */
  log(...args) {
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
    // eslint-disable-next-line no-console
    console.log(...args);
    this.progress(this._currentProgressMessage);
  }

  /**
   * @param {string} message
   */
  progress(message) {
    this._currentProgressMessage = message;
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
    if (message) process.stdout.write(`${this._nextLoadingChar()} ${message}`);
  }

  closeProgress() {
    clearInterval(this._progressBarHandle);
    this.progress('');
  }

  _nextLoadingChar() {
    const char = this._loadingChars[this._nextLoadingIndex++];
    if (this._nextLoadingIndex >= this._loadingChars.length) {
      this._nextLoadingIndex = 0;
    }
    return char;
  }
}

/**
 * @param {string} archiveDir
 */
function archive(archiveDir) {
  const archive = archiver('zip', {
    zlib: {level: 9},
  });

  const writeStream = fs.createWriteStream(`${archiveDir}.zip`);
  archive.pipe(writeStream);
  archive.directory(archiveDir, false);
  archive.finalize();
  return streamFinished(archive);
}

/**
 * @return {Summary}
 */
function loadSummary() {
  if (fs.existsSync(summaryPath)) {
    return JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
  } else {
    return {results: [], warnings: []};
  }
}

/**
 * @param {Summary} summary
 */
function saveSummary(summary) {
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
}

/**
 * @param {LH.Result} lhr
 * @return {LH.Artifacts.TimingSummary|undefined}
 */
function getMetrics(lhr) {
  const metricsDetails = /** @type {LH.Audit.Details.DebugData=} */ (lhr.audits['metrics'].details);
  if (!metricsDetails || !metricsDetails.items || !metricsDetails.items[0]) return;
  /** @type {LH.Artifacts.TimingSummary} */
  const metrics = JSON.parse(JSON.stringify(metricsDetails.items[0]));

  // Older versions of Lighthouse don't have max FID on the `metrics` audit, so get
  // it from somewhere else.
  if (!metrics.maxPotentialFID) {
    metrics.maxPotentialFID = lhr.audits['max-potential-fid'].numericValue;
  }

  return metrics;
}

module.exports = {
  ProgressLogger,
  collectFolder,
  goldenFolder,
  archive,
  loadSummary,
  saveSummary,
  getMetrics,
};
