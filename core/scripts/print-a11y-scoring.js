/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// node core/scripts/print-a11y-scoring.js

import {initializeConfig} from '../config/config.js';

const {resolvedConfig} = await initializeConfig('navigation');
if (!resolvedConfig.categories || !resolvedConfig.audits) throw new Error('wut');

const auditRefs = resolvedConfig.categories.accessibility.auditRefs;
const sum = auditRefs.reduce((sum, item) => sum += item.weight, 0);
const result = auditRefs
  .filter(a => a.weight)
  .sort((a, b) => b.weight - a.weight)
  .map(a => {
    return [
      undefined,
      a.id,
      `${(a.weight / sum * 100).toLocaleString(undefined, {maximumFractionDigits: 1})}%`,
      undefined,
    ].join(' | ');
  })
  .join('\n');

// eslint-disable-next-line no-console
console.log(result);
