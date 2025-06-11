/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable no-console */

// Example:
//     node core/scripts/compare-runs.js --name my-collection --collect -n 3 --lh-flags='--only-audits=unminified-javascript' --urls https://www.example.com https://www.nyt.com
//     node core/scripts/compare-runs.js --name my-collection --summarize --filter 'loadPage|connect'
//     node core/scripts/compare-runs.js --name base --name pr --compare

// The script will report both timings and perf metric results. View just one of them by using --filter:
//     node core/scripts/compare-runs.js --summarize --name pr --filter=metric

import fs from 'fs';
import util from 'util';
import childProcess from 'child_process';

import glob from 'glob';
import yargs from 'yargs';
import * as yargsHelpers from 'yargs/helpers';

import {LH_ROOT} from '../../shared/root.js';
import {ProgressLogger} from './lantern/collect/common.js';

const mkdir = fs.promises.mkdir;
const execFile = util.promisify(childProcess.execFile);

const ROOT_OUTPUT_DIR = `${LH_ROOT}/timings-data`;

const y = yargs(yargsHelpers.hideBin(process.argv));
const rawArgv = y
  .help('help')
  .describe({
    // common flags
    'name': 'Unique identifier, makes the folder for storing LHRs. Not a path',
    'report-exclude': 'Regex of properties to exclude. Set to "none" to disable default',
    'collect': 'Gathers, audits and saves LHRs to disk',
    // --gather
    'gather': 'Just gathers',
    'lh-flags': 'Lighthouse flags',
    'urls': 'Urls to run',
    'n': 'Number of times to run',
    'audit': 'Audits from the artifacts on disk',
    // --summarize
    'summarize': 'Prints statistics report',
    'filter': 'Regex inclusion filter applied to key. Optional',
    'url-filter': 'Regex inclusion filter applied to url. Optional',
    'reportExclude': 'Regex of columns keys to exclude.',
    'output': 'table, json',
    // --compare
    'compare': 'Compare two sets of LHRs',
    'delta-property-sort': 'Property to sort by its delta',
    'desc': 'Set to override default ascending sort',
  })
  .option('n', {type: 'number', default: 1})
  .string('filter')
  .string('url-filter')
  .alias({'gather': 'G', 'audit': 'A'})
  .default('report-exclude', 'key|min|max|stdev|^n$')
  .default('delta-property-sort', 'mean')
  .default('output', 'table')
  .option('urls', {array: true, type: 'string'})
  .string('lh-flags')
  .default('desc', false)
  .default('sort-by-absolute-value', false)
  .default('lh-flags', '')
  .strict() // fail on unknown commands
  .wrap(y.terminalWidth())
  .argv;

// Augmenting yargs type with auto-camelCasing breaks in tsc@4.1.2 and @types/yargs@15.0.11,
// so for now cast to add yarg's camelCase properties to type.
const argv =
  /** @type {Awaited<typeof rawArgv> & LH.Util.CamelCasify<Awaited<typeof rawArgv>>} */ (rawArgv);

const reportExcludeRegex =
  argv.reportExclude !== 'none' ? new RegExp(argv.reportExclude, 'i') : null;

/**
 * @param {string} name
 */
function dir(name) {
  return `${ROOT_OUTPUT_DIR}/${name}`;
}

/**
 * @param {number[]} values
 */
function sum(values) {
  return values.reduce((sum, value) => sum + value);
}

/**
 * @param {number[]} values
 */
function average(values) {
  return sum(values) / values.length;
}

/**
 * @param {number[]} values
 */
function sampleStdev(values) {
  const mean = average(values);
  const variance = sum(values.map(value => (value - mean) ** 2)) / (values.length - 1);
  return Math.sqrt(variance);
}

/**
 * @param {string} url
 * @return string
 */
function urlToFolder(url) {
  return url.replace(/[^a-zA-Z0-9]/g, '_');
}

/**
 * Round to the tenth.
 * @param {number} value
 */
function round(value) {
  return Math.round(value * 10) / 10;
}

/**
 * Get box-drawing progress bar
 * @param {number} i
 * @param {number} total
 * @return {string}
 */
function getProgressBar(i, total = argv.n * (argv.urls || []).length) {
  const bars = new Array(Math.round(i * 40 / total)).fill('▄').join('').padEnd(40);
  return `${i + 1} / ${total} [${bars}]`;
}

async function gather() {
  if (typeof argv.name !== 'string') {
    throw new Error('expected entry for name option');
  }
  const outputDir = dir(argv.name);
  if (fs.existsSync(outputDir)) {
    console.log('Collection already started - resuming.');
  } else {
    await mkdir(outputDir, {recursive: true});
    fs.writeFileSync(`${outputDir}/meta.json`, JSON.stringify({
      name: argv.name,
      lhFlags: argv.lhFlags.split(' '),
      urls: argv.urls,
      n: argv.n,
    }, null, 2));
  }

  const progress = new ProgressLogger();
  progress.log('Gathering…');

  let progressCount = 0;
  for (const url of argv.urls || []) {
    const urlFolder = `${outputDir}/${urlToFolder(url)}`;
    await mkdir(urlFolder, {recursive: true});

    for (let i = 0; i < argv.n; i++) {
      const gatherDir = `${urlFolder}/${i}`;

      progress.progress(getProgressBar(progressCount));
      progressCount++;

      // Skip if already gathered. Allows for restarting collection.
      if (fs.existsSync(gatherDir)) continue;

      await execFile('node', [
        `${LH_ROOT}/cli`,
        url,
        `--gather-mode=${gatherDir}`,
        ...argv.lhFlags.split(' '),
      ]);
    }
  }
  progress.closeProgress();
}

async function audit() {
  if (typeof argv.name !== 'string') {
    throw new Error('expected entry for name option');
  }
  const outputDir = dir(argv.name);
  const progress = new ProgressLogger();
  progress.log('Auditing…');

  let progressCount = 0;
  for (const url of argv.urls || []) {
    const urlDir = `${outputDir}/${urlToFolder(url)}`;
    for (let i = 0; i < argv.n; i++) {
      const gatherDir = `${urlDir}/${i}`;
      const outputPath = `${urlDir}/lhr-${i}.json`;

      progress.progress(getProgressBar(progressCount));
      progressCount++;

      // Skip if already audited. Allows for restarting collection.
      if (fs.existsSync(outputPath)) continue;

      try {
        const args = [
          `${LH_ROOT}/cli`,
          url,
          `--audit-mode=${gatherDir}`,
          `--output-path=${outputPath}`,
          '--output=json',
          ...argv.lhFlags.split(' '),
        ];
        await execFile('node', args);
      } catch (e) {
        console.error('audit error:', e);
      }
    }
  }
  progress.closeProgress();
}

/**
 * @param {string} name
 */
function aggregateResults(name) {
  const outputDir = dir(name);

  // `${url}@@@${entry.name}` -> duration
  /** @type {Map<string, number[]>} */
  const durationsMap = new Map();

  for (const lhrPath of glob.sync(`${outputDir}/**/lhr-*.json`)) {
    const lhrJson = fs.readFileSync(lhrPath, 'utf-8');
    /** @type {LH.Result} */
    const lhr = lhrJson && JSON.parse(lhrJson);
    if (!lhr || !lhr.audits) {
      console.warn(`lhr not found at ${lhrPath}`);
      continue;
    }

    if (argv.urlFilter && !lhr.requestedUrl?.includes(argv.urlFilter)) continue;

    const metrics = lhr.audits.metrics?.details ?
    /** @type {!LH.Audit.Details.Table} */ (lhr.audits.metrics.details).items[0] :
      {};
    const allEntries = {
      metric: Object.entries(metrics).filter(([name]) => !name.endsWith('Ts')),
      timing: lhr.timing.entries.map(entry => ([entry.name, entry.duration])),
      categories: Object.values(lhr.categories).reduce((acc, cur) => {
        acc.push([cur.id, (cur.score || 0) * 100]);
        return acc;
      }, /** @type {Array<[string, number]>} */ ([])),
    };

    Object.entries(allEntries).forEach(([kind, entries]) => {
      // Group the durations of each entry of the same name.
      /** @type {Record<string, number[]>} */
      const durationsByName = {};

      for (const [name, duration] of entries) {
        const durations = durationsByName[name] = durationsByName[name] || [];
        durations.push(Number(duration));
      }

      // Push the aggregate time of each unique (by name) entry.
      for (const [name, durationsForSingleRun] of Object.entries(durationsByName)) {
        const key = `${lhr.requestedUrl}@@@${kind}@@@${name}`;
        let durations = durationsMap.get(key);
        if (!durations) {
          durations = [];
          durationsMap.set(key, durations);
        }
        durations.push(sum(durationsForSingleRun));
      }
    });
  }

  return [...durationsMap].map(([key, durations]) => {
    const [url, _, entryName] = key.split('@@@');
    const mean = average(durations);
    const min = Math.min(...durations);
    const max = Math.max(...durations);
    const stdev = sampleStdev(durations);
    return {
      key,
      name: entryName,
      url,
      n: durations.length,
      mean: round(mean),
      stdev: round(stdev),
      // https://en.wikipedia.org/wiki/Coefficient_of_variation
      CV: `${(stdev / mean * 100).toLocaleString()}%`,
      min: round(min),
      max: round(max),
    };
  }).sort((a, b) => {
    // sort by {measure, url}
    const measureComp = a.name.localeCompare(b.name);
    if (measureComp !== 0) return measureComp;
    return a.url.localeCompare(b.url);
  });
}

/**
 * @param {Array<{key: string, name: string}>} results
 */
function filter(results) {
  const includeFilter = argv.filter ? new RegExp(argv.filter, 'i') : null;

  return results.filter(result => {
    if (includeFilter && !includeFilter.test(result.key)) {
      return false;
    }

    for (const propName of Object.keys(result)) {
      if (reportExcludeRegex && reportExcludeRegex.test(propName)) {
        // @ts-expect-error: propName is a key.
        delete result[propName];
      }
    }

    return true;
  });
}

/**
 * @param {number=} value
 * @return {value is number}
 */
function isNumber(value) {
  return typeof value === 'number';
}

function summarize() {
  if (typeof argv.name !== 'string') {
    throw new Error('expected entry for name option');
  }
  const results = aggregateResults(argv.name);
  print(filter(results));
}

/**
 * @param {number=} base
 * @param {number=} other
 */
function compareValues(base, other) {
  const basePart = isNumber(base) ? base : 'N/A';
  const otherPart = isNumber(other) ? other : 'N/A';
  return {
    description: `${basePart} -> ${otherPart}`,
    delta: isNumber(base) && isNumber(other) ? (other - base) : undefined,
  };
}

function compare() {
  if (!Array.isArray(argv.name) || argv.name.length !== 2) {
    throw new Error('expected two entries for name option');
  }

  const baseResults = aggregateResults(argv.name[0]);
  const otherResults = aggregateResults(argv.name[1]);

  const keys = [...new Set([...baseResults.map(r => r.key), ...otherResults.map(r => r.key)])];
  const results = keys.map(key => {
    const baseResult = baseResults.find(result => result.key === key);
    const otherResult = otherResults.find(result => result.key === key);

    const someResult = baseResult || otherResult;
    if (!someResult) throw new Error('impossible');

    const mean = compareValues(baseResult?.mean, otherResult?.mean);
    const stdev = compareValues(baseResult?.stdev, otherResult?.stdev);
    // eslint-disable-next-line max-len
    const cv = compareValues(baseResult && parseFloat(baseResult.CV), otherResult && parseFloat(otherResult.CV));
    const min = compareValues(baseResult?.min, otherResult?.min);
    const max = compareValues(baseResult?.max, otherResult?.max);

    return {
      'key': someResult.key,
      'name': someResult.name,
      'url': someResult.url,
      'mean': mean.description,
      'mean Δ': isNumber(mean.delta) ? round(mean.delta) : undefined,
      'stdev': stdev.description,
      'stdev Δ': isNumber(stdev.delta) ? round(stdev.delta) : undefined,
      'cv': cv.description,
      'cv Δ': isNumber(cv.delta) ? round(cv.delta) : undefined,
      'min': min.description,
      'min Δ': isNumber(min.delta) ? round(min.delta) : undefined,
      'max': max.description,
      'max Δ': isNumber(max.delta) ? round(max.delta) : undefined,
    };
  });

  const sortByKey = `${argv.deltaPropertySort} Δ`;
  results.sort((a, b) => {
    // @ts-expect-error - shhh tsc.
    let aValue = a[sortByKey];
    // @ts-expect-error - shhh tsc.
    let bValue = b[sortByKey];

    // Always put the keys missing a result at the bottom of the table.
    if (!isNumber(aValue)) return 1;
    else if (!isNumber(bValue)) return -1;

    if (argv.sortByAbsoluteValue) {
      aValue = Math.abs(aValue);
      bValue = Math.abs(bValue);
    }

    return (argv.desc ? 1 : -1) * (aValue - bValue);
  });
  print(filter(results));
}

/**
 * @param {*[]} results
 */
function print(results) {
  if (argv.output === 'table') {
    console.table(results);
  } else if (argv.output === 'json') {
    console.log(JSON.stringify(results, null, 2));
  }
}

async function main() {
  if (argv.gather) await gather();
  if (argv.audit) await audit();
  if (argv.collect) {
    await gather();
    await audit();
  }
  if (argv.summarize) summarize();
  if (argv.compare) compare();
}

main();
