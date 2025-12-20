/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const {createTraceString} = require('../lib/timing-trace-saver.js');

/**
 * @fileoverview This script takes the timing entries saved during a Lighthouse run and generates
 * a trace file that's readable in DevTools perf panel or chrome://tracing.
 *
 * input = LHR.json
 * output = LHR.timing.trace.json
 */

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

  const traceFilePath = `${filename}.timing.trace.json`;
  fs.writeFileSync(traceFilePath, jsonStr, 'utf8');
  // eslint-disable-next-line no-console
  console.log(`
  > Timing trace file saved to: ${traceFilePath}
  > Open this file in DevTools perf panel   (For --audit-mode runs, use chrome://tracing instead)
`);
}

saveTraceFromCLI();
