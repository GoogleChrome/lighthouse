/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Emit data about what trace event names and categories take up byte size in the JSON
 *
 * Usage:
 *
 *     node bytes-in-trace-by-cat.mjs path/to/trace.json   (json.gz supported, too)
 */

import fs from 'node:fs';

import {loadTraceEventsFromFile} from './trace-file-utils.mjs';

const passedArg = process.argv[2];
const filename = passedArg ? passedArg : './core/test/fixtures/artifacts/iframe/trace.json';

console.log('Parsing: ', filename);
const stat = fs.statSync(filename);
console.log('size:', ( stat.size / 1_000_000).toLocaleString(), 'MB');
console.log('first by event name + category. then by category');

const traceEvents = loadTraceEventsFromFile(filename);
console.log('event count: ', traceEvents.length.toLocaleString());


iterateTrace();
iterateTrace({aggregateBy: true});


function iterateTrace(opts = {aggregateBy: false}) {
  const traceCats = {};
  const tracePhs = {};
  // aggregate
  let totalBytes = 0;
  let totalEvents = 0;


  traceEvents.forEach(e => {
    const eventCats = e.cat;

    const splittedCats = opts.aggregateBy ? [eventCats] : eventCats.split(',');
    for (let eventId of splittedCats) {
      if (opts.aggregateBy) {
        eventId = `${e.name.padEnd(35)} (${eventId})`;
      }

      // if (e.name === 'ThreadControllerImpl::RunTask') eventId += '::::::::RunTask';
      const cat = traceCats[eventId] || {bytes: 0, count: 0};
      const bytes = JSON.stringify(e).length;
      cat.bytes += bytes;
      totalBytes += bytes;
      cat.count += 1;
      totalEvents += 1;
      traceCats[eventId] = cat;
    }
    tracePhs[e.ph] = tracePhs[e.ph] || 0;
    tracePhs[e.ph]++;
  });

  reportTotals(traceCats, totalBytes, totalEvents, tracePhs, opts);
}


function reportTotals(traceCats, totalBytes, totalEvents, tracePhs, opts) {
  // obj to array
  const traceTotals = [];
  Object.keys(traceCats).forEach(eventId => {
    const {bytes, count} = traceCats[eventId];
    traceTotals.push({name: eventId, bytes, count});
  });

  // sort and log
  console.log('');
  console.log('Bytes'.padStart(16), '  ', 'Count'.padStart(14), '  ',
    (opts.aggregateBy ? ('Event Name'.padEnd(35) + ' (cat)') : 'Category'));

  const kbfmt = new Intl.NumberFormat('en', {
    style: 'unit', unit: 'kilobyte', unitDisplay: 'short',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
    minimumSignificantDigits: 1, maximumSignificantDigits: 3,
  });
  const toKb = bytes => kbfmt.format(bytes / 1024);

  const percentfmt = new Intl.NumberFormat('en', {
    maximumFractionDigits: 1, minimumFractionDigits: 1,
  });

  const skipped = {bytes: 0, count: 0};
  // sort by bytes.. can change to sort by eventCount here instead.
  traceTotals.sort((a, b) => b.bytes - a.bytes).forEach((tot) => {
    const bytesPct = tot.bytes * 100 / totalBytes;
    if (bytesPct < 1) {
      skipped.bytes += tot.bytes;
      skipped.count += tot.count;
      return; // dont output.
    }

    console.log(
      toKb(tot.bytes).padStart(9),
      `${percentfmt.format(bytesPct)}%`.padStart(6),
      '  ',
      tot.count.toLocaleString().padStart(7),
      `${percentfmt.format(tot.count * 100 / totalEvents)}%`.padStart(6),
      '  ',
      tot.name
    );
  });

  // skipped
  console.log(
    toKb(skipped.bytes).padStart(9),
    `${percentfmt.format( skipped.bytes * 100 / totalBytes)}%`.padStart(6),
    '  ',
    skipped.count.toLocaleString().padStart(7),
    `${percentfmt.format(skipped.count * 100 / totalEvents)}%`.padStart(6),
    '  ',
    '[(Rows that were < 1% of bytes)]'
  );
}
