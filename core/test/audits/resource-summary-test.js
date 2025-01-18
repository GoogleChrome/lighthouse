/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import ResourceSummaryAudit from '../../audits/resource-summary.js';
import {networkRecordsToDevtoolsLog} from '../network-records-to-devtools-log.js';

describe('Performance: Resource summary audit', () => {
  let artifacts;
  let context;
  beforeEach(() => {
    context = {computedCache: new Map()};

    artifacts = {
      devtoolsLogs: {
        defaultPass: networkRecordsToDevtoolsLog([
          {url: 'http://example.com/file.html', resourceType: 'Document', transferSize: 30},
          {url: 'http://example.com/app.js', resourceType: 'Script', transferSize: 10},
          {url: 'http://my-cdn.com/bin.js', resourceType: 'Script', transferSize: 25},
          {url: 'http://third-party.com/script.js', resourceType: 'Script', transferSize: 50},
          {url: 'http://third-party.com/file.jpg', resourceType: 'Image', transferSize: 70},
        ]),
      },
      URL: {requestedUrl: 'http://example.com', mainDocumentUrl: 'http://example.com', finalDisplayedUrl: 'http://example.com'},
    };
  });
  it('has three table columns', async () => {
    const result = await ResourceSummaryAudit.audit(artifacts, context);
    expect(result.details.headings).toHaveLength(3);
  });

  it('has the correct score', async () => {
    const result = await ResourceSummaryAudit.audit(artifacts, context);
    expect(result.score).toBe(null);
  });

  it('includes the correct properties for each table item', async () => {
    const result = await ResourceSummaryAudit.audit(artifacts, context);
    const item = result.details.items[0];
    expect(item.resourceType).toEqual('total');
    expect(item.label).toBeDisplayString('Total');
    expect(item.requestCount).toBe(5);
    expect(item.transferSize).toBe(185);
  });

  it('includes all resource types, regardless of whether page contains them', async () => {
    const result = await ResourceSummaryAudit.audit(artifacts, context);
    expect(Object.keys(result.details.items)).toHaveLength(9);
  });

  it('it displays "0" if there are no resources of that type', async () => {
    const result = await ResourceSummaryAudit.audit(artifacts, context);
    const fontItem = result.details.items.find(item => item.resourceType === 'font');
    expect(fontItem.requestCount).toBe(0);
    expect(fontItem.transferSize).toBe(0);
  });
  describe('third-party resource identification', () => {
    it('is based on root domain if firstPartyHostnames is NOT set', async () => {
      const result = await ResourceSummaryAudit.audit(artifacts, context);
      const thirdParty = result.details.items
        .find(item => item.resourceType === 'third-party');
      expect(thirdParty.transferSize).toBe(145);
      expect(thirdParty.requestCount).toBe(3);
    });
  });

  describe('table ordering', () => {
    it('except for the last row, it sorts items by size (descending)', async () => {
      const result = await ResourceSummaryAudit.audit(artifacts, context);
      const items = result.details.items;
      items.slice(0, -2).forEach((item, index) => {
        expect(item.transferSize).toBeGreaterThanOrEqual(items[index + 1].transferSize);
      });
    });

    it('"Total" is the first row', async () => {
      const result = await ResourceSummaryAudit.audit(artifacts, context);
      expect(result.details.items[0].resourceType).toBe('total');
    });

    it('"Third-party" is the last-row', async () => {
      const result = await ResourceSummaryAudit.audit(artifacts, context);
      const items = result.details.items;
      expect(items[items.length - 1].resourceType).toBe('third-party');
    });
  });
});
