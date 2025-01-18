/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import NetworkRTT from '../../audits/network-rtt.js';
import {readJson} from '../test-utils.js';

const acceptableDevToolsLog = readJson('../fixtures/traces/progressive-app-m60.devtools.log.json', import.meta);

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

  it('should return n/a if no network records', async () => {
    const artifacts = {devtoolsLogs: {defaultPass: []}};
    const result = await NetworkRTT.audit(artifacts, {computedCache: new Map()});

    expect(result).toEqual({
      notApplicable: true,
      score: 1,
    });
  });
});
