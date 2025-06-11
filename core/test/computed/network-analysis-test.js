/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {NetworkAnalysis} from '../../computed/network-analysis.js';
import {readJson} from '../test-utils.js';

const acceptableDevToolsLog = readJson('../fixtures/traces/progressive-app-m60.devtools.log.json', import.meta);

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
  "https://pwa.rocks" => 159.70249997917608,
  "https://www.googletagmanager.com" => 153.03200000198592,
  "https://www.google-analytics.com" => 159.5549999910874,
  "__SUMMARY__" => 159.48849997948884,
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
    // If the connection timings were not removed, this would be the 1.045 estimate as seen in
    // the test above. However, without connection timings we fall back to a coarse estimate and
    // get this instead.
    expect(result.additionalRttByOrigin.get('https://www.google-analytics.com')).toBeCloseTo(2.86);
  });
});
