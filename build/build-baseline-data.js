/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

import {features} from 'web-features';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function buildBaselineData(featuresArg = features) {
  /**
   * @typedef {Object} LeanDataEntry
   * @property {string | boolean} status
   * @property {string} [baselineLowDate]
   * @property {string} [baselineHighDate]
   */

  /**
   * @type {Record<string, LeanDataEntry>}
   */
  const leanData = {};

  for (const [id, data] of Object.entries(featuresArg)) {
    if (data.kind !== 'feature') continue;

    const status = data.status || {};
    if ('baseline' in status) {
      leanData[id] = {
        status: status.baseline,
      };
      if (status.baseline_low_date) {
        leanData[id].baselineLowDate = status.baseline_low_date;
      }
      if (status.baseline_high_date) {
        leanData[id].baselineHighDate = status.baseline_high_date;
      }
    }
  }

  return leanData;
}

function saveBaselineData() {
  const leanData = buildBaselineData();
  const outputPath = path.resolve(
    __dirname,
    '../core/lib/baseline/baseline-features.json'
  );

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, {recursive: true});
  }

  fs.writeFileSync(outputPath, JSON.stringify(leanData));
}

if (process.argv[1] === __filename) {
  saveBaselineData();
}

export {buildBaselineData, saveBaselineData};
