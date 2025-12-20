#!/usr/bin/env node

/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/** @fileoverview Read in a LHR JSON file, remove whatever shouldn't be compared, write it back. */

const {readFileSync, writeFileSync} = require('fs');

const filename = process.argv[2];
const extraFlag = process.argv[3];
if (!filename) throw new Error('No filename provided.');

const data = readFileSync(filename, 'utf8');
writeFileSync(filename, cleanAndFormatLHR(data), 'utf8');

/**
 * @param {string} lhrString
 * @return {string}
 */
function cleanAndFormatLHR(lhrString) {
  /** @type {LH.Result} */
  const lhr = JSON.parse(lhrString);

  // TODO: Resolve the below so we don't need to force it to a boolean value:
  // 1) The string|boolean story for proto
  // 2) Travis gets a absolute path during yarn diff:sample-json
  lhr.configSettings.auditMode = true;

  // Set timing values, which change from run to run, to predictable values
  lhr.timing.total = 12345.6789;
  lhr.timing.entries.forEach(entry => {
    // @ts-ignore - write to readonly property
    entry.duration = 100;
    // @ts-ignore - write to readonly property
    entry.startTime = 0; // Not realsitic, but avoids a lot of diff churn
  });

  if (extraFlag !== '--only-remove-timing') {
    for (const auditResult of Object.values(lhr.audits)) {
      auditResult.description = '**Excluded from diff**';
    }
  }
  return JSON.stringify(lhr, null, 2);
}
