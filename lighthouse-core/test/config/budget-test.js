/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Budget = require('../../config/budget.js');
const assert = require('assert').strict;
/* eslint-env jest */

describe('Budget', () => {
  let budgets;
  beforeEach(() => {
    budgets = [
      {
        options: {
          firstPartyHostnames: ['example.com'],
        },
        resourceSizes: [
          {
            resourceType: 'script',
            budget: 123,
          },
          {
            resourceType: 'image',
            budget: 456,
          },
        ],
        resourceCounts: [
          {
            resourceType: 'total',
            budget: 100,
          },
          {
            resourceType: 'third-party',
            budget: 10,
          },
        ],
        timings: [
          {
            metric: 'interactive',
            budget: 2000,
          },
          {
            metric: 'first-contentful-paint',
            budget: 1000,
          },
        ],
      },
      {
        path: '/second-path',
        resourceSizes: [
          {
            resourceType: 'script',
            budget: 1000,
          },
        ],
      },
    ];
  });

  it('initializes correctly', () => {
    const result = Budget.initializeBudget(budgets);
    assert.equal(result.length, 2);

    // Sets options correctly
    assert.equal(result[0].options.firstPartyHostnames[0], 'example.com');

    // Missing paths are not overwritten
    assert.equal(result[0].path, undefined);
    // Sets path correctly
    assert.equal(result[1].path, '/second-path');

    // Sets resources sizes correctly
    assert.equal(result[0].resourceSizes.length, 2);
    assert.equal(result[0].resourceSizes[0].resourceType, 'script');
    assert.equal(result[0].resourceSizes[0].budget, 123);

    // Sets resource counts correctly
    assert.equal(result[0].resourceCounts.length, 2);
    assert.equal(result[0].resourceCounts[0].resourceType, 'total');
    assert.equal(result[0].resourceCounts[0].budget, 100);

    // Sets timings correctly
    assert.equal(result[0].timings.length, 2);
    assert.deepStrictEqual(result[0].timings[0], {
      metric: 'interactive',
      budget: 2000,
    });
    assert.deepStrictEqual(result[0].timings[1], {
      metric: 'first-contentful-paint',
      budget: 1000,
    });

    // Does not set unsupplied result
    assert.equal(result[1].timings, undefined);
  });

  it('accepts an empty array', () => {
    const result = Budget.initializeBudget([]);
    assert.deepStrictEqual(result, []);
  });

  it('throws error if an unsupported budget property is used', () => {
    budgets[0].sizes = [];
    assert.throws(_ => Budget.initializeBudget(budgets),
      /Budget has unrecognized properties: \[sizes\]/);
  });

  describe('top-level validation', () => {
    it('throws when provided an invalid budget array', () => {
      assert.throws(_ => Budget.initializeBudget(55),
        /Budget file is not defined as an array of/);

      assert.throws(_ => Budget.initializeBudget(['invalid123']),
        /Budget file is not defined as an array of/);

      assert.throws(_ => Budget.initializeBudget([null]),
        /Budget file is not defined as an array of/);
    });

    it('throws when budget contains invalid resourceSizes entry', () => {
      budgets[0].resourceSizes = 55;
      assert.throws(_ => Budget.initializeBudget(budgets),
        /^Error: Invalid resourceSizes entry in budget at index 0$/);
    });

    it('throws when budget contains invalid resourceCounts entry', () => {
      budgets[0].resourceCounts = 'A string';
      assert.throws(_ => Budget.initializeBudget(budgets),
        /^Error: Invalid resourceCounts entry in budget at index 0$/);
    });

    it('throws when budget contains invalid timings entry', () => {
      budgets[1].timings = false;
      assert.throws(_ => Budget.initializeBudget(budgets),
        /^Error: Invalid timings entry in budget at index 1$/);
    });

    it('throws when budget contains an invalid options entry', () => {
      budgets[0].options = 'Turtles';
      assert.throws(_ => Budget.initializeBudget(budgets),
        /^Error: Invalid options property in budget at index 0$/);
    });
  });

  describe('firstPartyHostname validation', () => {
    it('with valid inputs', () => {
      const validHostnames = [
        'yolo.com',
        'so.many.subdomains.org',
        '127.0.0.1',
        'localhost',
        '*.example.gov.uk',
        '*.example.com',
      ];
      budgets[0].options = {firstPartyHostnames: validHostnames};

      const result = Budget.initializeBudget(budgets);
      expect(result[0].options.firstPartyHostnames).toEqual(validHostnames);
    });

    it('validates that input does not include a protocol', () => {
      budgets[0].options = {firstPartyHostnames: ['https://yolo.com']};
      assert.throws(_ => Budget.initializeBudget(budgets),
        /https:\/\/yolo.com is not a valid hostname./);
    });

    it('validates that input does not include ports', () => {
      budgets[0].options = {firstPartyHostnames: ['yolo.com:8080']};
      assert.throws(_ => Budget.initializeBudget(budgets),
        /yolo.com:8080 is not a valid hostname./);
    });

    it('validates that input does not include path', () => {
      budgets[0].options = {firstPartyHostnames: ['dogs.com/fido']};
      assert.throws(_ => Budget.initializeBudget(budgets),
        /dogs.com\/fido is not a valid hostname./);
    });

    it('validates that input does not include a trailing slash', () => {
      budgets[0].options = {firstPartyHostnames: ['dogs.com/']};
      assert.throws(_ => Budget.initializeBudget(budgets),
        /dogs.com\/ is not a valid hostname./);
    });

    describe('wild card validation', () => {
      it('validates that a wildcard is only used once', () => {
        budgets[0].options = {firstPartyHostnames: ['*.*.com']};
        assert.throws(_ => Budget.initializeBudget(budgets),
          /\*.\*.com is not a valid hostname./);
      });

      it('validates that a wildcard is only used at the start of the hostname', () => {
        budgets[0].options = {firstPartyHostnames: ['cats.*.com']};
        assert.throws(_ => Budget.initializeBudget(budgets),
          /cats.\*.com is not a valid hostname./);
      });
    });
  });

  describe('resource budget validation', () => {
    it('throws when an invalid resource type is supplied', () => {
      budgets[0].resourceSizes[0].resourceType = 'movies';
      assert.throws(_ => Budget.initializeBudget(budgets),
        // eslint-disable-next-line max-len
        /Invalid resource type: movies. \nValid resource types are: total, document,/);
    });

    it('throws when an invalid budget is supplied', () => {
      budgets[0].resourceSizes[0].budget = '100 MB';
      assert.throws(_ => Budget.initializeBudget(budgets), /Invalid budget: 100 MB/);
    });

    it('throws when an invalid property is supplied', () => {
      budgets[0].resourceSizes[0].browser = 'Chrome';
      assert.throws(_ => Budget.initializeBudget(budgets),
        /Resource Budget has unrecognized properties: \[browser\]/);
    });

    it('throws when a duplicate resourceType is specified in resourceSizes', () => {
      budgets[1].resourceSizes.push({resourceType: 'script', budget: 100});
      assert.throws(_ => Budget.initializeBudget(budgets),
        /has duplicate entry of type 'script'/);
    });

    it('throws when a duplicate resourceType is specified in resourceCounts', () => {
      budgets[0].resourceCounts.push({resourceType: 'third-party', budget: 100});
      assert.throws(_ => Budget.initializeBudget(budgets),
        /has duplicate entry of type 'third-party'/);
    });
  });

  describe('timing budget validation', () => {
    it('supports all timing metrics', () => {
      budgets[0].timings = [{metric: 'blah', budget: 0}];
      const metrics = [
        'first-contentful-paint',
        'first-cpu-idle',
        'interactive',
        'first-meaningful-paint',
        'max-potential-fid',
        'estimated-input-latency',
        'total-blocking-time',
        'speed-index',
        'largest-contentful-paint',
        'cumulative-layout-shift',
      ];
      for (const metric of metrics) {
        budgets[0].timings[0].metric = metric;
        const result = Budget.initializeBudget(budgets);
        expect(result[0].timings[0].metric).toEqual(metric);
      }
    });
    it('throws when an invalid metric is supplied', () => {
      budgets[0].timings[0].metric = 'medianMeaningfulPaint';
      assert.throws(_ => Budget.initializeBudget(budgets),
        // eslint-disable-next-line max-len
        /Invalid timing metric: medianMeaningfulPaint. \nValid timing metrics are: first-contentful-paint, /);
    });

    it('throws when an invalid budget is supplied', () => {
      budgets[0].timings[0].budget = '100KB';
      assert.throws(_ => Budget.initializeBudget(budgets), /Invalid budget: 100KB/);
    });

    it('throws when a tolerance is supplied', () => {
      budgets[0].timings[0].tolerance = '100ms';
      assert.throws(_ => Budget.initializeBudget(budgets), /unrecognized properties/);
    });

    it('throws when an invalid property is supplied', () => {
      budgets[0].timings[0].device = 'Phone';
      budgets[0].timings[0].location = 'The middle somewhere, I don\'t know';
      assert.throws(_ => Budget.initializeBudget(budgets),
        /Timing Budget has unrecognized properties: \[device, location\]/);
    });

    it('throws when a duplicate metric type is specified in timings', () => {
      budgets[0].timings.push({metric: 'interactive', budget: 1000});
      assert.throws(_ => Budget.initializeBudget(budgets),
        /has duplicate entry of type 'interactive'/);
    });
  });

  describe('budget matching', () => {
    const budgets = [{
      path: '/',
      resourceSizes: [
        {
          resourceType: 'script',
          budget: 0,
        },
      ],
    },
    {
      path: '/file.html',
      resourceSizes: [
        {
          resourceType: 'image',
          budget: 0,
        },
      ],
    },
    {
      path: '/not-a-match',
      resourceSizes: [
        {
          resourceType: 'document',
          budget: 0,
        },
      ],
    },
    ];
    it('returns the last matching budget', () => {
      const budget = Budget.getMatchingBudget(budgets, 'http://example.com/file.html');
      expect(budget).toEqual(budgets[1]);
    });

    it('does not mutate the budget config', async () => {
      const configBefore = JSON.parse(JSON.stringify(budgets));
      Budget.getMatchingBudget(configBefore, 'https://example.com');
      const configAfter = JSON.parse(JSON.stringify(budgets));
      expect(configBefore).toEqual(configAfter);
    });

    it('returns "undefined" when there is no budget config', () => {
      const budget = Budget.getMatchingBudget(null, 'https://example.com');
      expect(budget).toEqual(undefined);
    });
  });

  describe('path validation', () => {
    it('recognizes valid budgets', () => {
      let budgets = [{path: '/'}];
      let result = Budget.initializeBudget(budgets);
      assert.equal(budgets[0].path, result[0].path);

      budgets = [{path: '/*'}];
      result = Budget.initializeBudget(budgets);
      assert.equal(budgets[0].path, result[0].path);

      budgets = [{path: '/end$'}];
      result = Budget.initializeBudget(budgets);
      assert.equal(budgets[0].path, result[0].path);

      budgets = [{path: '/fish*.php'}];
      result = Budget.initializeBudget(budgets);
      assert.equal(budgets[0].path, result[0].path);

      budgets = [{path: '/*.php$'}];
      result = Budget.initializeBudget(budgets);
      assert.equal(budgets[0].path, result[0].path);
    });

    it('invalidates paths missing leading "/"', () => {
      let budgets = [{path: ''}];
      assert.throws(_ => Budget.initializeBudget(budgets), /Invalid path/);

      budgets = [{path: 'cat'}];
      assert.throws(_ => Budget.initializeBudget(budgets), /Invalid path/);
    });

    it('invalidates paths with multiple * characters', () => {
      budgets = [{path: '/cat*cat*cat'}];
      assert.throws(_ => Budget.initializeBudget(budgets), /Invalid path/);
    });

    it('invalidates paths with multiple $ characters', () => {
      budgets = [{path: '/cat$cat$'}];
      assert.throws(_ => Budget.initializeBudget(budgets), /Invalid path/);
    });

    it('invalidates paths with $ character in the wrong location', () => {
      budgets = [{path: '/cat$html'}];
      assert.throws(_ => Budget.initializeBudget(budgets), /Invalid path/);
    });

    it('does not throw if no path is specified', () => {
      const budgets = [{}];
      const result = Budget.initializeBudget(budgets);
      assert.equal(result[0].path, undefined);
    });
  });

  describe('path matching', () => {
    const pathMatch = (path, pattern) => {
      const origin = 'https://example.com';
      return Budget.urlMatchesPattern(origin + path, pattern);
    };

    it('matches root', () => {
      assert.ok(Budget.urlMatchesPattern('https://google.com', '/'));
    });

    it('ignores origin', () => {
      assert.equal(Budget.urlMatchesPattern('https://go.com/dogs', '/go'), false);
      assert.equal(Budget.urlMatchesPattern('https://yt.com/videos?id=', '/videos'), true);
    });

    it('is case-sensitive', () => {
      assert.equal(Budget.urlMatchesPattern('https://abc.com/aaa', '/aaa'), true);
      assert.equal(Budget.urlMatchesPattern('https://abc.com/AAA', '/aaa'), false);
      assert.equal(Budget.urlMatchesPattern('https://abc.com/aaa', '/AAA'), false);
    });

    it('matches all pages if path is not defined', () => {
      assert.ok(Budget.urlMatchesPattern('https://example.com', undefined), true);
      assert.ok(Budget.urlMatchesPattern('https://example.com/dogs', undefined), true);
    });

    it('handles patterns that do not contain * or $', () => {
      assert.equal(pathMatch('/anything', '/'), true);
      assert.equal(pathMatch('/anything', '/any'), true);
      assert.equal(pathMatch('/anything', '/anything'), true);
      assert.equal(pathMatch('/anything', '/anything1'), false);
    });

    it('handles patterns that do not contain * but contain $', () => {
      assert.equal(pathMatch('/fish.php', '/fish.php$'), true);
      assert.equal(pathMatch('/Fish.PHP', '/fish.php$'), false);
    });

    it('handles patterns that contain * but do not contain $', () => {
      assert.equal(pathMatch('/anything', '/*'), true);
      assert.equal(pathMatch('/fish', '/fish*'), true);
      assert.equal(pathMatch('/fishfood', '/*food'), true);
      assert.equal(pathMatch('/fish/food/and/other/things', '/*food'), true);
      assert.equal(pathMatch('/fis/', '/fish*'), false);
      assert.equal(pathMatch('/fish', '/fish*fish'), false);
    });

    it('handles patterns that contain * and $', () => {
      assert.equal(pathMatch('/fish.php', '/*.php$'), true);
      assert.equal(pathMatch('/folder/filename.php', '/folder*.php$'), true);
      assert.equal(pathMatch('/folder/filename.php', '/folder/filename*.php$'), true);
      assert.equal(pathMatch('/fish.php?species=', '/*.php$'), false);
      assert.equal(pathMatch('/filename.php/', '/folder*.php$'), false);
      assert.equal(pathMatch('/folder', '/folder*folder$'), false);
    });
  });
});
