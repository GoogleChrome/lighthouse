/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview This script takes the timing entries saved during a Lighthouse run and generates
 * a trace file that's readable in DevTools perf panel or chrome://tracing.
 *
 * node core/scripts/generate-timing-trace.js latest-run/lhr.report.json
 *
 * input = lhr.json
 * output = lhr.timing.trace.json
 */

import fs from 'fs';
import path from 'path';

import {createTraceString} from '../lib/timing-trace-saver.js';

/**
 * @param {string} msg
 */
function printErrorAndQuit(msg) {
  // eslint-disable-next-line no-console
  console.error(`ERROR:
  > ${msg}
  > Example:
  >     yarn timing-trace results.json
  `);
  process.exit(1);
}

/**
 * Takes filename of LHR object. The primary entrypoint on CLI
 */
function saveTraceFromCLI() {
  if (!process.argv[2]) {
    printErrorAndQuit('Lighthouse JSON results path not provided');
  }
  const filename = path.resolve(process.cwd(), process.argv[2]);
  if (!fs.existsSync(filename)) {
    printErrorAndQuit('Lighthouse JSON results not found.');
  }

  const lhrObject = JSON.parse(fs.readFileSync(filename, 'utf8'));
  const jsonStr = createTraceString(lhrObject);

  const pathObj = path.parse(filename);
  const traceFilePath = path.join(pathObj.dir, `${pathObj.name}.timing.trace.json`);
  fs.writeFileSync(traceFilePath, jsonStr, 'utf8');
  // eslint-disable-next-line no-console
  console.log(`
  > Timing trace file saved to: ${traceFilePath}
  > Open this file in DevTools perf panel   (For --audit-mode runs, use chrome://tracing instead)
`);
}

saveTraceFromCLI();
