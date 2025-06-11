#!/usr/bin/env node
/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable no-console */

/**
 * @fileoverview Minifies a devtools log by removing noisy header values, eliminating data URIs, etc.
 */

import fs from 'fs';
import path from 'path';

import {minifyDevtoolsLog} from '../../lib/minify-devtoolslog.js';

if (process.argv.length !== 4) {
  console.error('Usage $0: <input file> <output file>');
  process.exit(1);
}

const inputDevtoolsLogPath = path.resolve(process.cwd(), process.argv[2]);
const outputDevtoolsLogPath = path.resolve(process.cwd(), process.argv[3]);
const inputDevtoolsLogRaw = fs.readFileSync(inputDevtoolsLogPath, 'utf8');
/** @type {LH.DevtoolsLog} */
const inputDevtoolsLog = JSON.parse(inputDevtoolsLogRaw);

const outputDevtoolsLog = minifyDevtoolsLog(inputDevtoolsLog);
const output = `[
${outputDevtoolsLog.map(e => '  ' + JSON.stringify(e)).join(',\n')}
]`;

/** @param {string} s */
const size = s => Math.round(s.length / 1024) + 'kb';
console.log(`Reduced DevtoolsLog from ${size(inputDevtoolsLogRaw)} to ${size(output)}`);
fs.writeFileSync(outputDevtoolsLogPath, output);
