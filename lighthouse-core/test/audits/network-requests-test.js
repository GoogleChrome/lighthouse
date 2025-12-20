/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const NetworkRequests = require('../../audits/network-requests.js');
const networkRecordsToDevtoolsLog = require('../network-records-to-devtools-log.js');

const cutoffLoadDevtoolsLog = require('../fixtures/traces/cutoff-load-m83.devtoolslog.json');

/* eslint-env jest */
describe('Network requests audit', () => {
  it('should report finished and unfinished network requests', async () => {
    const artifacts = {
      devtoolsLogs: {
        [NetworkRequests.DEFAULT_PASS]: cutoffLoadDevtoolsLog,
      },
    };

    const output = await NetworkRequests.audit(artifacts, {computedCache: new Map()});

    expect(output.details.items[0]).toMatchObject({
      startTime: 0,
      endTime: expect.toBeApproximately(701, 0),
      finished: true,
      transferSize: 11358,
      resourceSize: 39471,
      statusCode: 200,
      mimeType: 'text/html',
      resourceType: 'Document',
    });
    expect(output.details.items[2]).toMatchObject({
      startTime: expect.toBeApproximately(711, 0),
      endTime: expect.toBeApproximately(1289, 0),
      finished: false,
      transferSize: 26441,
      resourceSize: 0,
      statusCode: 200,
      mimeType: 'image/png',
      resourceType: 'Image',
    });
    expect(output.details.items[5]).toMatchObject({
      startTime: expect.toBeApproximately(717, 0),
      endTime: expect.toBeApproximately(1296, 0),
      finished: false,
      transferSize: 58571,
      resourceSize: 0,
      statusCode: 200,
      mimeType: 'application/javascript',
      resourceType: 'Script',
    });
  });

  it('should handle times correctly', async () => {
    const records = [
      {url: 'https://example.com/0', startTime: 15.0, endTime: 15.5},
      {url: 'https://example.com/1', startTime: 15.5, endTime: -1},
    ];

    const artifacts = {
      devtoolsLogs: {
        [NetworkRequests.DEFAULT_PASS]: networkRecordsToDevtoolsLog(records),
      },
    };
    const output = await NetworkRequests.audit(artifacts, {computedCache: new Map()});

    expect(output.details.items).toMatchObject([{
      startTime: 0,
      endTime: 500,
      finished: true,
    }, {
      startTime: 500,
      endTime: undefined,
      finished: true,
    }]);
  });
});
