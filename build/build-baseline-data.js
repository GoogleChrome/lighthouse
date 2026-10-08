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

/**
 * Baseline status & date model in `web-features`:
 * - Limited Availability (`baseline: false`): Not yet supported in all core browsers. No date.
 * - Newly Available (`baseline: 'low'`): Supported in all core browsers. Has `baseline_low_date`.
 * - Widely Available (`baseline: 'high'`): 30 months after `baseline_low_date` (`baseline_high_date`).
 *
 * Why both `high` and `low` buckets below store `baseline_low_date`:
 * - The audit displays `baseline_low_date` for `high` features too, and uses `baseline_low_date`
 *   to sort features and determine the page's newest Baseline target year.
 * - Some older features in `web-features` prefix `baseline_low_date` with `≤` (e.g. `≤2020-03-24`
 *   for `opacity-svg` and `≤2018-10-02` for `output`) when exact historical release dates aren't
 *   known. We strip `≤` here at build time so downstream code always gets valid ISO `YYYY-MM-DD`.
 *
 * @type {{high: Record<string, string>, low: Record<string, string>, limited: string[]}}
 */
const out = {
  high: {},
  low: {},
  limited: [],
};

for (const [id, feature] of Object.entries(data.features)) {
  if (!feature.status) continue;

  const b = feature.status.baseline;
  const lowDate = feature.status.baseline_low_date?.replace(/^≤/, '');
  if (b === 'high' && lowDate) {
    out.high[id] = lowDate;
  } else if (b === 'low' && lowDate) {
    out.low[id] = lowDate;
  } else {
    out.limited.push(id);
  }
}

fs.writeFileSync(destFile, JSON.stringify(out, null, 2) + '\n');
console.log(`Wrote grouped subset of data.json to ${destFile.pathname}`);
