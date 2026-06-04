#!/usr/bin/env node
/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Minifies a trace by removing events that are not needed for Lantern.
 */

import fs from 'fs';
import path from 'path';

import {minifyTrace} from '../../lib/minify-trace.js';

if (process.argv.length !== 4) {
  console.error('Usage $0: <input file> <output file>');
  process.exit(1);
}

const inputTracePath = path.resolve(process.cwd(), process.argv[2]);
const outputTracePath = path.resolve(process.cwd(), process.argv[3]);
const inputTraceRaw = fs.readFileSync(inputTracePath, 'utf8');
/** @type {LH.Trace} */
const inputTrace = JSON.parse(inputTraceRaw);

const outputTrace = minifyTrace(inputTrace);
const output = `{
  "traceEvents": [
${outputTrace.traceEvents.map(event => '    ' + JSON.stringify(event)).join(',\n')}
  ]
}`;

/** @param {string} s */
const size = s => Math.round(s.length / 1024) + 'kb';
const eventDelta = inputTrace.traceEvents.length - outputTrace.traceEvents.length;
console.log(`Reduced trace from ${size(inputTraceRaw)} to ${size(output)}`);
console.log(`Filtered out ${eventDelta} trace events`);
fs.writeFileSync(outputTracePath, output);
