/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ResourceBudgetAudit = require('../../audits/performance-budget.js');
const networkRecordsToDevtoolsLog = require('../network-records-to-devtools-log.js');

/* eslint-env jest */

describe('Performance: Resource budgets audit', () => {
  let artifacts;
  let context;
  beforeEach(() => {
    artifacts = {
      devtoolsLogs: {
        defaultPass: networkRecordsToDevtoolsLog([
          {url: 'http://example.com', resourceType: 'Document', transferSize: 30},
          {url: 'http://example.com/app.js', resourceType: 'Script', transferSize: 10},
          {url: 'http://my-cdn.com/styles.css', resourceType: 'Stylesheet', transferSize: 25},
          {url: 'http://third-party.com/script.js', resourceType: 'Script', transferSize: 50},
          {url: 'http://third-party.com/file.jpg', resourceType: 'Image', transferSize: 70},
        ]),
      },
      URL: {requestedUrl: 'http://example.com', finalUrl: 'http://example.com'},
    };
    context = {computedCache: new Map(), settings: {}};
  });

  describe('with a budget.json', () => {
    beforeEach(() => {
      context.settings.budgets = [{
        path: '/',
        resourceSizes: [
          {
            resourceType: 'script',
            budget: 0,
          },
          {
            resourceType: 'image',
            budget: 1000,
          },
        ],
        resourceCounts: [
          {
            resourceType: 'script',
            budget: 0,
          },
          {
            resourceType: 'image',
            budget: 1000,
          },
        ],
      }];
    });

    it('includes table columns for requet & file size overages', async () => {
      const result = await ResourceBudgetAudit.audit(artifacts, context);
      expect(result.details.headings).toHaveLength(5);
    });

    it('table item information is correct', async () => {
      const result = await ResourceBudgetAudit.audit(artifacts, context);
      const item = result.details.items[0];
      expect(item.label).toBeDisplayString('Script');
      expect(item.requestCount).toBe(2);
      expect(item.transferSize).toBe(60);
      expect(item.sizeOverBudget).toBe(60);
      expect(item.countOverBudget).toBeDisplayString('2 requests');
    });

    describe('request & transfer size overage', () => {
      it('are displayed', async () => {
        const result = await ResourceBudgetAudit.audit(artifacts, context);
        const scriptRow = result.details.items.find(r => r.resourceType === 'script');
        expect(scriptRow.sizeOverBudget).toBe(60);
        expect(scriptRow.countOverBudget).toBeDisplayString('2 requests');
      });

      it('are empty for passing budgets', async () => {
        const result = await ResourceBudgetAudit.audit(artifacts, context);
        const imageRow = result.details.items.find(r => r.resourceType === 'image');
        expect(imageRow.sizeOverBudget).toBeUndefined();
        expect(imageRow.countOverBudget).toBeUndefined();
      });

      it('convert budgets from kilobytes to bytes during calculations', async () => {
        context.settings.budgets = [{
          path: '/',
          resourceSizes: [
            {
              resourceType: 'document',
              budget: 20,
            },
          ],
        }];
        const result = await ResourceBudgetAudit.audit(artifacts, context);
        expect(result.details.items[0].siveOverBudget).toBeUndefined();
      });
    });

    describe('third-party resource identification', () => {
      it('guesses root domain if firstPartyHostnames is not provided', async () => {
        context.settings.budgets = [{
          path: '/',
          resourceSizes: [
            {
              resourceType: 'third-party',
              budget: 0,
            },
          ],
          resourceCounts: [
            {
              resourceType: 'third-party',
              budget: 0,
            },
          ],
        }];
        const result = await ResourceBudgetAudit.audit(artifacts, context);
        expect(result.details.items[0].transferSize).toBe(145);
        expect(result.details.items[0].requestCount).toBe(3);
      });

      it('uses firstPartyHostnames when provided', async () => {
        context.settings.budgets = [{
          path: '/',
          options: {
            firstPartyHostnames: ['example.com', 'my-cdn.com'],
          },
          resourceSizes: [
            {
              resourceType: 'third-party',
              budget: 0,
            },
          ],
          resourceCounts: [
            {
              resourceType: 'third-party',
              budget: 0,
            },
          ],
        }];
        const result = await ResourceBudgetAudit.audit(artifacts, context);
        expect(result.details.items[0].transferSize).toBe(120);
        expect(result.details.items[0].requestCount).toBe(2);
      });
    });

    it('only includes rows for resource types with budgets', async () => {
      const result = await ResourceBudgetAudit.audit(artifacts, context);
      expect(result.details.items).toHaveLength(2);
    });

    it('sorts rows by descending file size overage', async () => {
      context.settings.budgets = [{
        path: '/',
        resourceSizes: [
          {
            resourceType: 'document',
            budget: 0,
          },
          {
            resourceType: 'script',
            budget: 0,
          },
          {
            resourceType: 'image',
            budget: 0,
          },
        ],
      }];
      const result = await ResourceBudgetAudit.audit(artifacts, context);
      const items = result.details.items;
      items.slice(0, -1).forEach((item, index) => {
        expect(item.transferSize).toBeGreaterThanOrEqual(items[index + 1].transferSize);
      });
    });
  });

  describe('budget selection', () => {
    describe('with a matching budget', () => {
      it('applies the correct budget', async () => {
        artifacts = {
          devtoolsLogs: {
            defaultPass: networkRecordsToDevtoolsLog([
              {url: 'http://example.com/file.html', resourceType: 'Document', transferSize: 30},
              {url: 'http://third-party.com/script.js', resourceType: 'Script', transferSize: 50},
            ]),
          },
          URL: {requestedUrl: 'http://example.com/file.html', finalUrl: 'http://example.com/file.html'},
        };
        context.settings.budgets = [{
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
        const result = await ResourceBudgetAudit.audit(artifacts, context);
        expect(result.details.items[0].resourceType).toBe('image');
      });
    });

    describe('without a matching budget', () => {
      it('returns "audit does not apply"', async () => {
        context.settings.budgets = [{
          path: '/not-a-match',
          resourceSizes: [
            {
              resourceType: 'script',
              budget: 0,
            },
          ],
        },
        ];
        const result = await ResourceBudgetAudit.audit(artifacts, context);
        expect(result.details).toBeUndefined();
        expect(result.notApplicable).toBe(true);
      });
    });

    describe('without a budget.json', () => {
      beforeEach(() => {
        context.settings.budgets = null;
      });

      it('returns "audit does not apply"', async () => {
        const result = await ResourceBudgetAudit.audit(artifacts, context);
        expect(result.details).toBeUndefined();
        expect(result.notApplicable).toBe(true);
      });
    });
  });
});
