#!/usr/bin/env node

/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-disable no-console */

const ultradumbBenchmark = require('../lib/page-functions.js').ultradumbBenchmark;

console.log('Running ULTRADUMB™ benchmark 10 times...');

let total = 0;
for (let i = 0; i < 10; i++) {
  const result = ultradumbBenchmark();
  console.log(`Result ${i + 1}: ${result.toFixed(0)}`);
  total += result;
}

console.log('----------------------------------------');
console.log('Final result:', (total / 10).toFixed(0));
