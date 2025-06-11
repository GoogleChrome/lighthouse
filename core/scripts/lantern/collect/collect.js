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

import fetch from 'node-fetch';

import defaultTestUrls from './urls.js';
import * as common from './common.js';
import {LH_ROOT} from '../../../../shared/root.js';
import {makeGolden} from './golden.js';

const execFileAsync = promisify(execFile);

const WPT_URL = process.env.WPT_URL || 'https://www.webpagetest.org';
const TEST_URLS = process.env.TEST_URLS ? process.env.TEST_URLS.split(' ') : defaultTestUrls;

const WPT_KEY = process.env.WPT_KEY;
const DEBUG = process.env.DEBUG;

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
 * @return {Promise<string>}
 */
async function fetchString(url) {
  const response = await fetch(url);
  if (response.ok) return response.text();
  throw new Error(`error fetching ${url}: ${response.status} ${response.statusText}`);
}

/**
 * @param {string} url
 */
async function startWptTest(url) {
  if (!WPT_KEY) throw new Error('missing WPT_KEY');

  const apiUrl = new URL('/runtest.php', WPT_URL);
  apiUrl.search = new URLSearchParams({
    k: WPT_KEY,
    f: 'json',
    url,
    location: 'gce-us-east4-linux:Chrome.3GFast',
    runs: '1',
    lighthouse: '1',
    mobile: '1',
    // Make the trace file available over /getgzip.php.
    lighthouseTrace: '1',
    lighthouseScreenshots: '1',
    // Disable some things that WPT does, such as a "repeat view" analysis.
    type: 'lighthouse',
  }).toString();
  const wptResponseJson = await fetchString(apiUrl.href);
  const wptResponse = JSON.parse(wptResponseJson);
  if (wptResponse.statusCode !== 200) {
    throw new Error(`unexpected status code ${wptResponse.statusCode} ${wptResponse.statusText}`);
  }

  return {
    testId: wptResponse.data.testId,
    jsonUrl: wptResponse.data.jsonUrl,
  };
}

/**
 * @param {string} url
 * @return {Promise<Result>}
 */
async function runUnthrottledLocally(url) {
  const artifactsFolder = `${LH_ROOT}/.tmp/collect-traces-artifacts`;
  const {stdout} = await execFileAsync('node', [
    `${LH_ROOT}/cli`,
    url,
    '--throttling-method=provided',
    '--output=json',
    `-AG=${artifactsFolder}`,
    process.env.OOPIFS === '1' ? '' : '--chrome-flags=--disable-features=site-per-process',
  ], {
    // Default (1024 * 1024) is too small.
    maxBuffer: 10 * 1024 * 1024,
  });
  const lhr = JSON.parse(stdout);
  assertLhr(lhr);
  const devtoolsLog = fs.readFileSync(`${artifactsFolder}/defaultPass.devtoolslog.json`, 'utf-8');
  const trace = fs.readFileSync(`${artifactsFolder}/defaultPass.trace.json`, 'utf-8');
  return {
    devtoolsLog,
    lhr: JSON.stringify(lhr),
    trace,
  };
}

/**
 * @param {string} url
 * @return {Promise<Result>}
 */
async function runForWpt(url) {
  const {testId, jsonUrl} = await startWptTest(url);
  if (DEBUG) log.log({testId, jsonUrl});

  // Poll for the results every x seconds, where x = position in queue.
  let lhr;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const responseJson = await fetchString(jsonUrl);
    const response = JSON.parse(responseJson);

    if (response.statusCode === 200) {
      lhr = response.data.lighthouse;
      assertLhr(lhr);
      break;
    }

    if (response.statusCode >= 100 && response.statusCode < 200) {
      // If behindCount doesn't exist, the test is currently running.
      // * Wait 30 seconds if the test is currently running.
      // * Wait an additional 10 seconds for every test ahead of this one.
      // * Don't wait for more than 10 minutes.
      const secondsToWait = Math.min(30 + 10 * (response.data.behindCount || 0), 10 * 1000);
      if (DEBUG) log.log('poll wpt in', secondsToWait);
      await new Promise((resolve) => setTimeout(resolve, secondsToWait * 1000));
    } else {
      throw new Error(`unexpected response: ${response.statusCode} ${response.statusText}`);
    }
  }

  const traceUrl = new URL('/getgzip.php', WPT_URL);
  traceUrl.searchParams.set('test', testId);
  traceUrl.searchParams.set('file', 'lighthouse_trace.json');
  const traceJson = await fetchString(traceUrl.href);

  /** @type {LH.Trace} */
  const trace = JSON.parse(traceJson);
  // For some reason, the first trace event is an empty object.
  trace.traceEvents = trace.traceEvents.filter(e => Object.keys(e).length > 0);

  return {
    lhr: JSON.stringify(lhr),
    trace: JSON.stringify(trace),
  };
}

/**
 * Repeats the ascyn function a maximum of maxAttempts times until it passes.
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
      log.log('Error: ' + err.toString());
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
  if (metrics?.firstContentfulPaint &&
      metrics.interactive &&
      // WPT won't have this, we'll just get from the trace.
      // metrics.largestContentfulPaint &&
      metrics.maxPotentialFID &&
      metrics.speedIndex
  ) return;
  throw new Error('run failed to get metrics');
}

async function main() {
  // Resume state from previous invocation of script.
  summary = common.loadSummary();

  // Remove data if no longer in TEST_URLS.
  summary.results = summary.results
    .filter(urlSet => TEST_URLS.includes(urlSet.url));

  fs.mkdirSync(common.collectFolder, {recursive: true});

  // Traces are collected for one URL at a time, in series, so all traces are from a small time
  // frame, reducing the chance of a site change affecting results.
  for (const url of TEST_URLS) {
    // This URL has been done on a previous script invocation. Skip it.
    if (summary.results.find((urlResultSet) => urlResultSet.url === url)) {
      log.log(`already collected traces for ${url}`);
      continue;
    }
    log.log(`collecting traces for ${url}`);

    const sanitizedUrl = url.replace(/[^a-z0-9]/gi, '-');

    let wptDone = false;
    let unthrottledDone = false;

    // The closure this makes is too convenient to decompose.
    // eslint-disable-next-line no-inner-declarations
    function updateProgress() {
      const index = TEST_URLS.indexOf(url);
      log.progress([
        `${url} (${index + 1} / ${TEST_URLS.length})`,
        'wpt',
        '(' + (wptDone ? 'DONE' : 'pending...') + ')',
        'unthrottledResults',
        '(' + (unthrottledDone ? 'DONE' : 'pending...') + ')',
      ].join(' '));
    }

    updateProgress();
    const wptPromise = repeatUntilPassOrNull(() => runForWpt(url))
      .finally(() => {
        wptDone = true;
        updateProgress();
      });
    const unthrottledPromise = repeatUntilPassOrNull(() => runUnthrottledLocally(url))
      .finally(() => {
        unthrottledDone = true;
        updateProgress();
      });
    const repeatingResults = await Promise.all([wptPromise, unthrottledPromise]);
    const wptResult = repeatingResults[0].result;
    const unthrottledResult = repeatingResults[1].result;
    if (!wptResult) log.log('failed to get wpt result');
    if (!unthrottledResult) log.log('failed to get unthrottled result');

    let errors;
    if (repeatingResults[0].errors || repeatingResults[1].errors) {
      errors = [...repeatingResults[0].errors, ...repeatingResults[1].errors];
    }

    const wptPrefix = `${sanitizedUrl}-mobile-wpt`;
    const unthrottledPrefix = `${sanitizedUrl}-mobile-unthrottled`;
    /** @type {ResultsForUrl} */
    const urlResultSet = {
      url,
      wpt: wptResult ? {
        lhr: saveData(`${wptPrefix}-lhr.json`, wptResult.lhr),
        trace: saveData(`${wptPrefix}-trace.json`, wptResult.trace),
      } : null,
      wptRetries: repeatingResults[0].retries,
      // Unthrottled runs will always have devtools logs.
      unthrottled: unthrottledResult && unthrottledResult.devtoolsLog ? {
        devtoolsLog:
          saveData(`${unthrottledPrefix}-devtoolsLog.json`, unthrottledResult.devtoolsLog),
        lhr: saveData(`${unthrottledPrefix}-lhr.json`, unthrottledResult.lhr),
        trace: saveData(`${unthrottledPrefix}-trace.json`, unthrottledResult.trace),
      } : null,
      unthrottledRetries: repeatingResults[1].retries,
      errors,
    };

    log.log(`collected results for ${url}`);
    summary.results.push(urlResultSet);
    if (summary.results.length % 10 === 0) {
      log.log('saving progress');
      common.saveSummary(summary);
    }
  }

  log.log('saving progress');
  common.saveSummary(summary);

  log.log('making golden ...');
  makeGolden(log, summary);

  log.progress('archiving ...');
  await common.archive(common.collectFolder);
  log.closeProgress();
}

try {
  await main();
} finally {
  if (log) log.closeProgress();
}
