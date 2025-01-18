#!/usr/bin/env node

/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/** @fileoverview Read in a LHR JSON file, remove whatever shouldn't be compared, write it back. */

import {readFileSync, writeFileSync} from 'fs';

import {elideAuditErrorStacks} from '../lib/asset-saver.js';

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
  // 2) CI gets a absolute path during yarn diff:sample-json
  lhr.configSettings.auditMode = true;

  // Set timing values, which change from run to run, to predictable values
  lhr.timing.total = 12345.6789;
  lhr.timing.entries.sort((a, b) => a.startTime - b.startTime);
  lhr.timing.entries.forEach(entry => {
    // @ts-expect-error - write to readonly property
    entry.duration = 100;
    // @ts-expect-error - write to readonly property
    entry.startTime = 0; // Not realsitic, but avoids a lot of diff churn
  });

  if (extraFlag !== '--only-remove-timing') {
    for (const auditResult of Object.values(lhr.audits)) {
      auditResult.description = '**Excluded from diff**';
    }
  }

  elideAuditErrorStacks(lhr);

  // Ensure we have a final newline to conform to .editorconfig
  return `${JSON.stringify(lhr, null, 2)}\n`;
}
