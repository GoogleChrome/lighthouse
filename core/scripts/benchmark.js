#!/usr/bin/env node

/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable no-console */

// node core/scripts/benchmark.js

import {pageFunctions} from '../lib/page-functions.js';

console.log('Computing BenchmarkIndex 10 times...');

let total = 0;
for (let i = 0; i < 10; i++) {
  const result = pageFunctions.computeBenchmarkIndex();
  console.log(`Result ${i + 1}: ${result.toFixed(0)}`);
  total += result;
}

console.log('----------------------------------------');
console.log('Final result:', (total / 10).toFixed(0));
