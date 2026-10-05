/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/** @typedef {import('./common.js').Result} Result */
/** @typedef {import('./common.js').ResultsForUrl} ResultsForUrl */
/** @typedef {import('./common.js').Summary} Summary */

import fs from 'fs';
import {execFile} from 'child_process';
import {promisify} from 'util';

import defaultTestUrls from './urls.js';
import * as common from './common.js';
import {LH_ROOT} from '../../../../shared/root.js';
import {makeGolden} from './golden.js';

const execFileAsync = promisify(execFile);

const TEST_URLS = process.env.TEST_URLS ? process.env.TEST_URLS.split(' ') : defaultTestUrls;

const log = new common.ProgressLogger();

/** @type {Summary} */
let summary;

/**
 * @param {string} filename
 * @param {string} data
 */
function saveData(filename, data) {
  fs.mkdirSync(common.collectFolder, {recursive: true});
  fs.writeFileSync(`${common.collectFolder}/${filename}`, data);
  return filename;
}

/**
 * @param {string} url
 * @param {string[]} args
 * @return {Promise<Result>}
 */
async function runLighthouse(url, args) {
  const artifactsFolder = `${LH_ROOT}/.tmp/collect-traces-artifacts`;
  if (fs.existsSync(artifactsFolder)) {
    fs.rmSync(artifactsFolder, {recursive: true});
  }
  fs.mkdirSync(artifactsFolder, {recursive: true});
  await execFileAsync('node', [
    `${LH_ROOT}/cli`,
    url,
    `-AG=${artifactsFolder}`,
    '--output=json',
    `--output-path=${artifactsFolder}/lhr.report.json`,
    '--chrome-flags="--headless"',
    ...args,
  ], {
    // Default (1024 * 1024) can be too small.
    maxBuffer: 10 * 1024 * 1024,
  });
  const lhrString = fs.readFileSync(`${artifactsFolder}/lhr.report.json`, 'utf-8');
  assertLhr(JSON.parse(lhrString));
  const devtoolsLog = fs.readFileSync(`${artifactsFolder}/devtoolslog.json`, 'utf-8');
  const trace = fs.readFileSync(`${artifactsFolder}/trace.json`, 'utf-8');
  return {
    devtoolsLog,
    lhr: lhrString,
    trace,
  };
}

/**
 * @param {string} url
 * @return {Promise<Result>}
 */
async function runThrottledMobile(url) {
  return runLighthouse(url, [
    '--throttling-method=devtools',
    '--throttling.cpuSlowdownMultiplier=4',
  ]);
}

/**
 * @param {string} url
 * @return {Promise<Result>}
 */
async function runUnthrottled(url) {
  return runLighthouse(url, [
    '--throttling-method=provided',
  ]);
}

/**
 * Repeats the async function a maximum of maxAttempts times until it passes.
 * Every failure is added to an errors array.
 *
 * @param {() => Promise<Result>} asyncFn
 * @param {number} [maxAttempts]
 * @return {Promise<{result: Result|null, retries: number, errors: string[]}>}
 */
async function repeatUntilPassOrNull(asyncFn, maxAttempts = 3) {
  const errors = [];

  for (let i = 0; i < maxAttempts; i++) {
    try {
      return {result: await asyncFn(), retries: i, errors};
    } catch (err) {
      log.log(asyncFn.name, err.toString());
      errors.push(err.toString());
    }
  }

  return {result: null, retries: maxAttempts - 1, errors};
}

/**
 * @param {LH.Result=} lhr
 */
function assertLhr(lhr) {
  if (!lhr) throw new Error('missing lhr');
  if (lhr.runtimeError) throw new Error(`runtime error: ${lhr.runtimeError}`);

  const metrics = common.getMetrics(lhr);

  if (metrics?.firstContentfulPaint === undefined) {
    throw new Error('NO_FCP');
  }

  if (metrics?.largestContentfulPaint === undefined) {
    throw new Error('NO_LCP');
  }

  if (metrics?.cumulativeLayoutShift === undefined) {
    throw new Error('NO_CLS');
  }

  if (metrics?.interactive === undefined) {
    throw new Error('NO_TTI');
  }

  if (metrics?.maxPotentialFID === undefined) {
    throw new Error('NO_MAX_PFID');
  }

  if (metrics?.speedIndex === undefined) {
    throw new Error('NO_SI');
  }

  if (metrics?.timeToFirstByte === undefined) {
    throw new Error('NO_TTFB');
  }
}

async function main() {
  // Resume state from previous invocation of script.
  summary = common.loadSummary();

  // Remove data if no longer in TEST_URLS.
  summary.results = summary.results
    .filter(urlSet => TEST_URLS.includes(urlSet.url));

  fs.mkdirSync(common.collectFolder, {recursive: true});

  const urlsToTest = TEST_URLS.filter(url => {
    // This URL has been done on a previous script invocation. Skip it.
    if (summary.results.find((urlResultSet) => urlResultSet.url === url)) {
      log.log(`already collected for ${url}`);
      return false;
    }

    return true;
  });
  const skipped = TEST_URLS.length - urlsToTest.length;
  if (skipped) {
    log.log(`skipping ${skipped} urls that have already been collected`);
  }

  // Warmup device.
  if (urlsToTest.length) {
    log.log('warming up...');
    await runUnthrottled('https://www.example.com');
  }

  const startTime = performance.now();

  // Traces are collected for one URL at a time, in series, so all traces are from a small time
  // frame. This reduces the chance of a site change impacting results.
  for (const url of urlsToTest) {
    log.log(`collecting for ${url}`);
    const sanitizedUrl = url.replace(/[^a-z0-9]/gi, '-');

    /** @type {Awaited<ReturnType<typeof repeatUntilPassOrNull>> | null} */
    let unthrottledRun = null;
    /** @type {Awaited<ReturnType<typeof repeatUntilPassOrNull>> | null} */
    let mobileRun = null;

    // This closure is too convenient to extract out.
    function updateProgress() {
      const index = urlsToTest.indexOf(url);
      const numTested = index;
      const avgPerUrl = (performance.now() - startTime) / index;
      const timeLeftMs = avgPerUrl * (urlsToTest.length - numTested);
      const timeLeftMinutes = Math.floor(timeLeftMs / 1000 / 60);
      const timeLeft = timeLeftMinutes > 60
        ? `${Math.floor(timeLeftMinutes / 60)} hours` :
        `${timeLeftMinutes} minutes`;
      log.progress([
        `${url} (${index + 1} / ${urlsToTest.length})`,
        'unthrottled',
        (unthrottledRun ? (unthrottledRun.result ? '✅' : '❌') : '…'),
        'mobile',
        (mobileRun ? (mobileRun.result ? '✅' : '❌') : '…'),
        `Time left: ~${timeLeft}`,
      ].join(' '));
    }

    updateProgress();
    mobileRun = await repeatUntilPassOrNull(() => runThrottledMobile(url));
    updateProgress();
    unthrottledRun = await repeatUntilPassOrNull(() => runUnthrottled(url));
    updateProgress();
    if (!unthrottledRun.result) log.log('failed to get unthrottled result');
    if (!mobileRun.result) log.log('failed to get mobile result');

    // Note: to keep the data stucture stable, the "mobile" run is refered to as "wpt", even
    // though we are no longer using WebPageTest.
    const unthrottledResult = unthrottledRun.result;
    const wptResult = mobileRun.result;

    let errors;
    if (unthrottledRun.errors || mobileRun.errors) {
      errors = [...unthrottledRun.errors, ...mobileRun.errors];
    }

    const mobilePrefix = `${sanitizedUrl}-mobile-throttled`;
    const unthrottledPrefix = `${sanitizedUrl}-unthrottled`;
    /** @type {ResultsForUrl} */
    const urlResultSet = {
      url,
      wpt: wptResult ? {
        devtoolsLog: saveData(`${mobilePrefix}-devtoolsLog.json`, wptResult.devtoolsLog),
        lhr: saveData(`${mobilePrefix}-lhr.json`, wptResult.lhr),
        trace: saveData(`${mobilePrefix}-trace.json`, wptResult.trace),
      } : null,
      wptRetries: mobileRun.retries,
      unthrottled: unthrottledResult ? {
        devtoolsLog:
          saveData(`${unthrottledPrefix}-devtoolsLog.json`, unthrottledResult.devtoolsLog),
        lhr: saveData(`${unthrottledPrefix}-lhr.json`, unthrottledResult.lhr),
        trace: saveData(`${unthrottledPrefix}-trace.json`, unthrottledResult.trace),
      } : null,
      unthrottledRetries: unthrottledRun.retries,
      errors,
    };

    log.log(`collected results for ${url}`);
    summary.results.push(urlResultSet);
    log.log('saving progress');
    common.saveSummary(summary);
  }

  log.log('saving progress');
  common.saveSummary(summary);

  log.log('making golden ...');
  makeGolden(log, summary);

  log.progress('archiving ...');
  await common.archive(common.collectFolder);

  log.progress('done!');
}

try {
  await main();
} finally {
  if (log) log.closeProgress();
}
