/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/** @typedef {{devtoolsLog?: string, lhr: string, trace: string}} Result */
/** @typedef {{url: string, wpt: Result|null, wptRetries: number, unthrottled: Result|null, unthrottledRetries: number, errors?: string[]}} ResultsForUrl */
/** @typedef {Result & {metrics: LH.Artifacts.TimingSummary}} ResultWithMetrics */
/** @typedef {{results: ResultsForUrl[]}} Summary */
/** @typedef {import('../run-on-all-assets.js').Golden} Golden */

import fs from 'fs';
import readline from 'readline';
import {promisify} from 'util';
import stream from 'stream';

import archiver from 'archiver';

import {LH_ROOT} from '../../../../shared/root.js';

const streamFinished = promisify(stream.finished);

const collectFolder = `${LH_ROOT}/dist/collect-lantern-traces`;
const summaryPath = `${collectFolder}/summary.json`;
const goldenPath = `${collectFolder}/site-index-plus-golden-expectations.json`;

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
    return {results: []};
  }
}

/**
 * @param {Summary} summary
 */
function saveSummary(summary) {
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
}

/**
 * @param {Golden} golden
 */
function saveGolden(golden) {
  fs.writeFileSync(goldenPath, JSON.stringify(golden, null, 2));
}

/**
 * @param {LH.Result} lhr
 * @return {LH.Artifacts.TimingSummary|undefined}
 */
function getMetrics(lhr) {
  const metricsDetails = lhr.audits['metrics'].details;
  if (!metricsDetails || metricsDetails.type !== 'debugdata' ||
      !metricsDetails.items || !metricsDetails.items[0]) {
    return;
  }
  /** @type {LH.Artifacts.TimingSummary} */
  const metrics = JSON.parse(JSON.stringify(metricsDetails.items[0]));

  // Older versions of Lighthouse don't have max FID on the `metrics` audit, so get
  // it from somewhere else.
  if (!metrics.maxPotentialFID) {
    metrics.maxPotentialFID = lhr.audits['max-potential-fid'].numericValue;
  }

  return metrics;
}

export {
  ProgressLogger,
  collectFolder,
  archive,
  loadSummary,
  saveSummary,
  saveGolden,
  getMetrics,
};
