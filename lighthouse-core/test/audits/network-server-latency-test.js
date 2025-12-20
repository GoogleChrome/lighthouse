/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ServerLatency = require('../../audits/network-server-latency.js');

const acceptableDevToolsLog = require('../fixtures/traces/progressive-app-m60.devtools.log.json');

/* eslint-env jest */

describe('Network Server Latency audit', () => {
  it('should work', async () => {
    const artifacts = {devtoolsLogs: {defaultPass: acceptableDevToolsLog}};
    const result = await ServerLatency.audit(artifacts, {computedCache: new Map()});
    result.details.items.forEach(
      item => (item.serverResponseTime = Math.round(item.serverResponseTime * 100) / 100)
    );

    // These were all from a trace that used our ancient 150ms devtools throttling which appears as
    // artifical response time = Math.max(real response time, 150ms)
    expect(result.details.items).toEqual([
      {
        origin: 'https://www.google-analytics.com',
        serverResponseTime: 159.55,
      },
      {
        origin: 'https://pwa.rocks',
        serverResponseTime: 159.42,
      },
      {
        origin: 'https://www.googletagmanager.com',
        serverResponseTime: 153.03,
      },
    ]);
  });
});
