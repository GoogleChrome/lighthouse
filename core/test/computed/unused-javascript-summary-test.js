/**
 * @license Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import {UnusedJavascriptSummary} from '../../computed/unused-javascript-summary.js';

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

describe('UnusedJavascriptSummary computed artifact', () => {
  it('should identify used', () => {
    const usage = generateUsage('myscript.js', [[0, 100, true]]);
    const result = UnusedJavascriptSummary.computeWaste(usage);
    assert.equal(result.unusedLength, 0);
    assert.equal(result.contentLength, 100);
  });

  it('should identify unused', () => {
    const usage = generateUsage('myscript.js', [[0, 100, false]]);
    const result = UnusedJavascriptSummary.computeWaste(usage);
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

    const result = UnusedJavascriptSummary.computeWaste(usage);
    assert.equal(result.unusedLength, 130);
    assert.equal(result.contentLength, 200);
  });
});
