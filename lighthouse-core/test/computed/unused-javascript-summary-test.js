/**
 * @license Copyright 2020 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const assert = require('assert');
const UnusedJavaScriptSummary = require('../../computed/unused-javascript-summary.js');

/* eslint-env jest */

function generateUsage(url, ranges) {
  const functions = ranges.map(range => {
    return {
      ranges: [
        {
          startOffset: range[0],
          endOffset: range[1],
          count: range[2] ? 1 : 0,
        },
      ],
    };
  });

  return {url, functions};
}

describe('UnusedJavaScriptSummary computed artifact', () => {
  it('should identify used', () => {
    const usage = generateUsage('myscript.js', [[0, 100, true]]);
    const result = UnusedJavaScriptSummary.computeWaste(usage);
    assert.equal(result.unusedLength, 0);
    assert.equal(result.contentLength, 100);
  });

  it('should identify unused', () => {
    const usage = generateUsage('myscript.js', [[0, 100, false]]);
    const result = UnusedJavaScriptSummary.computeWaste(usage);
    assert.equal(result.unusedLength, 100);
    assert.equal(result.contentLength, 100);
  });

  it('should identify nested unused', () => {
    const usage = generateUsage('myscript.js', [
      [0, 100, true], // 40% used overall

      [0, 10, true],
      [0, 40, true],
      [20, 40, false],

      [60, 100, false],
      [70, 80, false],

      [100, 150, false],
      [180, 200, false],
      [100, 200, true], // 30% used overall
    ]);

    const result = UnusedJavaScriptSummary.computeWaste(usage);
    assert.equal(result.unusedLength, 130);
    assert.equal(result.contentLength, 200);
  });
});
