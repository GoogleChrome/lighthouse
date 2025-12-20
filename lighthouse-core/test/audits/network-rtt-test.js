/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const NetworkRTT = require('../../audits/network-rtt.js');

const acceptableDevToolsLog = require('../fixtures/traces/progressive-app-m60.devtools.log.json');

/* eslint-env jest */

describe('Network RTT audit', () => {
  it('should work', async () => {
    const artifacts = {devtoolsLogs: {defaultPass: acceptableDevToolsLog}};
    const result = await NetworkRTT.audit(artifacts, {computedCache: new Map()});
    result.details.items.forEach(item => (item.rtt = Math.round(item.rtt * 100) / 100));

    expect(result.details.items).toEqual([
      {
        origin: 'https://www.google-analytics.com',
        rtt: 3.67,
      },
      {
        origin: 'https://pwa.rocks',
        rtt: 3.02,
      },
      {
        origin: 'https://www.googletagmanager.com',
        rtt: 2.62,
      },
    ]);
  });
});
