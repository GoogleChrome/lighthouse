/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable no-control-regex */

import {readJson} from '../../../core/test/test-utils.js';
import {findDifferences, getAssertionReport} from './report-assert.js';

describe('findDiffersences', () => {
  const testCases = {
    'works (trivial passing)': {
      actual: {},
      expected: {},
      diffs: null,
    },
    'works (trivial fail)': {
      actual: {},
      expected: {a: 1},
      diffs: [{path: '.a', actual: undefined, expected: 1}],
    },
    'works (trivial fail, actual undefined)': {
      actual: undefined,
      expected: {a: 1},
      diffs: [{path: '', actual: undefined, expected: {a: 1}}],
    },
    'works (trivial fail, nested)': {
      actual: {a: {b: 2}},
      expected: {a: {b: 1}},
      diffs: [{path: '.a.b', actual: 2, expected: 1}],
    },
    'works (trivial fail, nested actual undefined)': {
      actual: {a: undefined},
      expected: {a: {b: 1}},
      diffs: [{path: '.a', actual: undefined, expected: {b: 1}}],
    },
    'works (multiple fail 1)': {
      actual: {},
      expected: {a: 1, b: 2},
      diffs: [
        {path: '.a', actual: undefined, expected: 1},
        {path: '.b', actual: undefined, expected: 2},
      ],
    },
    'works (multiple fail 2)': {
      actual: {nested: {array: [0, 1, 2]}},
      expected: {nested: {array: [2, 1, 0]}},
      diffs: [
        {path: '.nested.array[0]', actual: 0, expected: 2},
        {path: '.nested.array[2]', actual: 2, expected: 0},
      ],
    },

    'range (1)': {
      actual: {duration: 100},
      expected: {duration: '>=100'},
      diffs: null,
    },
    'range (2)': {
      actual: {},
      expected: {duration: '>=100'},
      diffs: [{path: '.duration', actual: undefined, expected: '>=100'}],
    },
    'range (3)': {
      actual: {duration: 100},
      expected: {duration: '>100'},
      diffs: [{path: '.duration', actual: 100, expected: '>100'}],
    },
    'range (4)': {
      actual: {duration: 100},
      expected: {duration: '<100'},
      diffs: [{path: '.duration', actual: 100, expected: '<100'}],
    },

    'array (1)': {
      actual: {prices: [0, 1, 2, 3, 4, 5]},
      expected: {prices: {length: 6}},
      diffs: null,
    },
    'array (2)': {
      actual: {prices: [0, 1, 2, 3, 4, 5]},
      expected: {prices: {length: '>0'}},
      diffs: null,
    },
    'array (3)': {
      actual: {prices: [0, 1, 2, 3, 4, 5]},
      expected: {prices: [0, 1, 2, 3, 4, 5]},
      diffs: null,
    },
    'array (4)': {
      actual: {prices: [0, 1, 2, 3, 4, 5]},
      expected: {prices: [0, 1, 2, 3, 4, 5, 6]},
      diffs: [
        {path: '.prices[6]', actual: undefined, expected: 6},
        {path: '.prices.length', actual: [0, 1, 2, 3, 4, 5], expected: [0, 1, 2, 3, 4, 5, 6]},
      ],
    },
    'array (5)': {
      actual: {prices: [0, 1, 2, 3, 4, 5]},
      expected: {prices: []},
      diffs: [{path: '.prices.length', actual: [0, 1, 2, 3, 4, 5], expected: []}],
    },
    'array (6)': {
      actual: {prices: [0, 1, 2, 3, 4, 5]},
      expected: {prices: {'3': '>=3'}},
      diffs: null,
    },
    'array (7)': {
      actual: {prices: [0, 1, 2, {nested: 3}, 4, 5]},
      expected: {prices: {'3': {nested: '>3'}}},
      diffs: [{path: '.prices[3].nested', actual: 3, expected: '>3'}],
    },

    '_includes (1)': {
      actual: {prices: [0, 1, 2, 3, 4, 5]},
      expected: {prices: {_includes: [4]}},
      diffs: null,
    },
    '_includes (2)': {
      actual: {prices: [0, 1, 2, 3, 4, 5]},
      expected: {prices: {_includes: [4, 4]}},
      diffs: [{path: '.prices', actual: 'Item not found in array', expected: 4}],
    },
    '_includes (3)': {
      actual: {prices: [0, 1, 2, 3, 4, 5]},
      expected: {prices: {_includes: [100]}},
      diffs: [{path: '.prices', actual: 'Item not found in array', expected: 100}],
    },
    '_includes (4)': {
      actual: {prices: ['0', '1', '2', '3', '4', '5']},
      expected: {prices: {_includes: [/\d/, /\d/, /\d/, /\d/, /\d/, /\d/]}},
      diffs: null,
    },
    '_includes (object)': {
      actual: {'0-alpha': 1, '1-beta': 2, '3-gamma': 3},
      expected: {_includes: [
        ['0-alpha', '<2'],
        [/[0-9]-beta/, 2],
      ]},
      diffs: null,
    },

    '_excludes (1)': {
      actual: {prices: [0, 1, 2, 3, 4, 5]},
      expected: {prices: {_excludes: [100]}},
      diffs: null,
    },
    '_excludes (2)': {
      actual: {prices: [0, 1, 2, 3, 4, 5]},
      expected: {prices: {_excludes: [2]}},
      diffs: [{path: '.prices', actual: 2, expected: {
        expectedExclusion: 2,
        message: 'Expected to not find matching entry via _excludes',
      }}],
    },
    '_excludes (object)': {
      actual: {'0-alpha': 1, '1-beta': 2, '3-gamma': 3},
      expected: {_excludes: [
        [/[0-9]-beta/, 2],
      ]},
      diffs: [{path: '', actual: ['1-beta', 2], expected: {
        expectedExclusion: [/[0-9]-beta/, 2],
        message: 'Expected to not find matching entry via _excludes',
      }}],
    },

    '_includes and _excludes (1)': {
      actual: {prices: [0, 1, 2, 3, 4, 5]},
      expected: {prices: {_includes: [2], _excludes: [2]}},
      diffs: null,
    },
    // Order matters.
    '_includes and _excludes (2)': {
      actual: {prices: [0, 1, 2, 3, 4, 5]},
      expected: {prices: {_excludes: [2], _includes: [2]}},
      diffs: [{path: '.prices', actual: 2, expected: {
        expectedExclusion: 2,
        message: 'Expected to not find matching entry via _excludes',
      }}],
    },
    '_includes and _excludes (3)': {
      actual: {prices: [0, 1, 2, 3, 4, 5]},
      expected: {prices: {_includes: [2], _excludes: [2, 1]}},
      diffs: [{path: '.prices', actual: 1, expected: {
        expectedExclusion: 1,
        message: 'Expected to not find matching entry via _excludes',
      }}],
    },
    '_includes and _excludes (object)': {
      actual: {'0-alpha': 1, '1-beta': 2, '3-gamma': 3},
      expected: {
        _includes: [
          ['0-alpha', '<2'],
        ],
        _excludes: [
          [/[0-9]-alpha/, 1],
          [/[0-9]-beta/, 2],
        ],
      },
      diffs: [{path: '', actual: ['1-beta', 2], expected: {
        expectedExclusion: [/[0-9]-beta/, 2],
        message: 'Expected to not find matching entry via _excludes',
      }}],
    },
  };

  for (const [testName, {actual, expected, diffs}] of Object.entries(testCases)) {
    it(testName, () => {
      expect(findDifferences('', actual, expected)).toEqual(diffs);
    });
  }
});

/**
 * Removes ANSI codes.
 * TODO: should make it so logger can disable these.
 * @param {string} text
 */
function clean(text) {
  return text
    .replace(/\x1B.*?m/g, '')
    .replace(/\x1b.*?m/g, '')
    .replace(/[✘×]/g, 'X')
    .trim();
}

describe('getAssertionReport', () => {
  const lhr = readJson('core/test/results/sample_v2.json');
  const artifacts = readJson('core/test/results/artifacts/artifacts.json');

  it('works (trivial passing)', () => {
    const report = getAssertionReport({lhr, artifacts}, {
      lhr: {
        audits: {},
        requestedUrl: 'http://localhost:10200/dobetterweb/dbw_tester.html',
        finalDisplayedUrl: 'http://localhost:10200/dobetterweb/dbw_tester.html',
      },
    });
    expect(report).toMatchObject({passed: 3, failed: 0, log: ''});
  });

  it('works (trivial failing)', () => {
    const report = getAssertionReport({lhr, artifacts}, {
      lhr: {
        audits: {
          'cumulative-layout-shift': {
            details: {
              items: [],
            },
          },
        },
        requestedUrl: 'http://localhost:10200/dobetterweb/dbw_tester.html',
        finalDisplayedUrl: 'http://localhost:10200/dobetterweb/dbw_tester.html',
      },
    });
    expect(report).toMatchObject({passed: 3, failed: 1});
    expect(clean(report.log)).toMatchSnapshot();
  });

  it('works (trivial failing, actual undefined)', () => {
    const report = getAssertionReport({lhr, artifacts}, {
      lhr: {
        audits: {
          'cumulative-layout-shift-no-exist': {
            details: {
              items: [],
            },
          },
        },
        requestedUrl: 'http://localhost:10200/dobetterweb/dbw_tester.html',
        finalDisplayedUrl: 'http://localhost:10200/dobetterweb/dbw_tester.html',
      },
    });
    expect(report).toMatchObject({passed: 3, failed: 1});
    expect(clean(report.log)).toMatchSnapshot();
  });

  it('works (multiple failing)', () => {
    const report = getAssertionReport({lhr, artifacts}, {
      lhr: {
        audits: {
          'cumulative-layout-shift': {
            details: {
              items: [],
              blah: 123,
            },
          },
        },
        requestedUrl: 'http://localhost:10200/dobetterweb/dbw_tester.html',
        finalDisplayedUrl: 'http://localhost:10200/dobetterweb/dbw_tester.html',
      },
    });
    expect(report).toMatchObject({passed: 3, failed: 1});
    expect(clean(report.log)).toMatchSnapshot();
  });
});
