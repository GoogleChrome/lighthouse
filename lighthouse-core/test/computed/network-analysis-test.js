/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const NetworkAnalysis = require('../../computed/network-analysis.js');

const acceptableDevToolsLog = require('../fixtures/traces/progressive-app-m60.devtools.log.json');

/* eslint-env jest */

describe('Network analysis computed', () => {
  it('should return network analysis', async () => {
    const result = await NetworkAnalysis.request(acceptableDevToolsLog, {computedCache: new Map()});

    expect(Math.round(result.rtt)).toEqual(3);
    expect(Math.round(result.throughput)).toEqual(1628070);
    expect(result.additionalRttByOrigin).toMatchInlineSnapshot(`
Map {
  "https://pwa.rocks" => 0.3960000176447025,
  "https://www.googletagmanager.com" => 0,
  "https://www.google-analytics.com" => 1.0450000117997007,
  "__SUMMARY__" => 0,
}
`);
    expect(result.serverResponseTimeByOrigin).toMatchInlineSnapshot(`
Map {
  "https://pwa.rocks" => 159.42199996789026,
  "https://www.googletagmanager.com" => 153.03200000198592,
  "https://www.google-analytics.com" => 159.5549999910874,
  "__SUMMARY__" => 159.42199996789026,
}
`);
  });

  it('should be robust enough to handle missing data', async () => {
    const mutatedLog = acceptableDevToolsLog.map(entry => {
      if (entry.method !== 'Network.responseReceived') return entry;
      if (!entry.params.response.url.includes('google-analytics')) return entry;

      const clonedEntry = JSON.parse(JSON.stringify(entry));
      const invalidTimings = {sslStart: -1, sslEnd: -1, connectStart: -1, connectEnd: -1};
      Object.assign(clonedEntry.params.response.timing, invalidTimings);

      return clonedEntry;
    });

    const result = await NetworkAnalysis.request(mutatedLog, {computedCache: new Map()});
    expect(result.additionalRttByOrigin.get('https://www.google-analytics.com')).toEqual(0);
  });
});
