/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import ServerLatency from '../../audits/network-server-latency.js';
import {readJson} from '../test-utils.js';

const acceptableDevToolsLog = readJson('../fixtures/traces/progressive-app-m60.devtools.log.json', import.meta);

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
        origin: 'https://pwa.rocks',
        serverResponseTime: 159.7,
      },
      {
        origin: 'https://www.google-analytics.com',
        serverResponseTime: 159.55,
      },
      {
        origin: 'https://www.googletagmanager.com',
        serverResponseTime: 153.03,
      },
    ]);
  });

  it('should return n/a if no network records', async () => {
    const artifacts = {devtoolsLogs: {defaultPass: []}};
    const result = await ServerLatency.audit(artifacts, {computedCache: new Map()});

    expect(result).toEqual({
      notApplicable: true,
      score: 1,
    });
  });
});
