/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Reduce the huge web-features/data.json to a smaller subset.
 * Keeps our bundle size small.
 */

import fs from 'fs';

const sourceFile = new URL('../node_modules/web-features/data.json', import.meta.url);
const destFile = new URL('../core/lib/baseline/web-features-data.json', import.meta.url);

const data = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));

/** @type {{high: Record<string, string>, low: Record<string, string>, limited: string[]}} */
const out = {
  high: {},
  low: {},
  limited: [],
};

for (const [id, feature] of Object.entries(data.features)) {
  if (!feature.status) continue;

  const b = feature.status.baseline;
  if (b === 'high') {
    out.high[id] = feature.status.baseline_low_date;
  } else if (b === 'low') {
    out.low[id] = feature.status.baseline_low_date;
  } else {
    out.limited.push(id);
  }
}

fs.writeFileSync(destFile, JSON.stringify(out, null, 2) + '\n');
console.log(`Wrote grouped subset of data.json to ${destFile.pathname}`);
