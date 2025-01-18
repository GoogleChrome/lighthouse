/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import ServerResponseTime from '../../audits/server-response-time.js';
import {networkRecordsToDevtoolsLog} from '../network-records-to-devtools-log.js';
describe('Performance: server-response-time audit', () => {
  afterEach(() => {
    global.isLightrider = undefined;
  });

  it('fails when response time of root document is higher than 600ms', async () => {
    const mainResource = {
      url: 'https://example.com/',
      requestId: '0',
      timing: {receiveHeadersStart: 830, sendEnd: 200},
    };
    const devtoolsLog = networkRecordsToDevtoolsLog([mainResource]);

    const artifacts = {
      devtoolsLogs: {[ServerResponseTime.DEFAULT_PASS]: devtoolsLog},
      URL: {mainDocumentUrl: 'https://example.com/'},
      GatherContext: {gatherMode: 'navigation'},
    };

    const result = await ServerResponseTime.audit(artifacts, {computedCache: new Map()});
    expect(result).toMatchObject({
      score: 0,
      numericValue: 630,
      details: {
        overallSavingsMs: 530,
        items: [{url: 'https://example.com/', responseTime: 630}],
      },
      metricSavings: {
        FCP: 530,
        LCP: 530,
      },
    });
  });

  it('succeeds when response time of root document is lower than 600ms', async () => {
    const mainResource = {
      url: 'https://example.com/',
      requestId: '0',
      timing: {receiveHeadersStart: 400, sendEnd: 200},
    };
    const devtoolsLog = networkRecordsToDevtoolsLog([mainResource]);

    const artifacts = {
      devtoolsLogs: {[ServerResponseTime.DEFAULT_PASS]: devtoolsLog},
      URL: {mainDocumentUrl: 'https://example.com/'},
      GatherContext: {gatherMode: 'navigation'},
    };

    const result = await ServerResponseTime.audit(artifacts, {computedCache: new Map()});
    expect(result).toMatchObject({
      numericValue: 200,
      score: 1,
      metricSavings: {
        FCP: 100,
        LCP: 100,
      },
    });
  });

  it('use timing from lrStatistics when available', async () => {
    global.isLightrider = true;
    const mainResource = {
      url: 'https://example.com/',
      requestId: '0',
      responseHeaders: [
        {name: 'X-RequestMs', value: '1000'},
        // Only to pass the checksum in _updateTimingsForLightrider.
        {name: 'X-ResponseMs', value: '4000'},
        {name: 'X-TotalMs', value: '5000'},
      ],
    };
    const devtoolsLog = networkRecordsToDevtoolsLog([mainResource]);

    const artifacts = {
      devtoolsLogs: {[ServerResponseTime.DEFAULT_PASS]: devtoolsLog},
      URL: {mainDocumentUrl: 'https://example.com/'},
      GatherContext: {gatherMode: 'navigation'},
    };

    const result = await ServerResponseTime.audit(artifacts, {computedCache: new Map()});
    expect(result).toMatchObject({
      numericValue: 1000,
      score: 0,
      metricSavings: {
        FCP: 900,
        LCP: 900,
      },
    });
  });

  // TODO(compat): remove M116. See _backfillReceiveHeaderStartTiming.
  // eslint-disable-next-line max-len
  it('succeeds when response time of root document is lower than 600ms (receiveHeadersEnd fallback)', async () => {
    const mainResource = {
      url: 'https://example.com/',
      requestId: '0',
      timing: {receiveHeadersEnd: 400, sendEnd: 200},
    };
    const devtoolsLog = networkRecordsToDevtoolsLog([mainResource]);

    const artifacts = {
      devtoolsLogs: {[ServerResponseTime.DEFAULT_PASS]: devtoolsLog},
      URL: {mainDocumentUrl: 'https://example.com/'},
      GatherContext: {gatherMode: 'navigation'},
    };

    const result = await ServerResponseTime.audit(artifacts, {computedCache: new Map()});
    expect(result).toMatchObject({
      numericValue: 200,
      score: 1,
      metricSavings: {
        FCP: 100,
        LCP: 100,
      },
    });
  });

  it('throws error if no main resource', async () => {
    const devtoolsLog = networkRecordsToDevtoolsLog([]);

    const artifacts = {
      devtoolsLogs: {[ServerResponseTime.DEFAULT_PASS]: devtoolsLog},
      URL: {mainDocumentUrl: 'https://example.com/'},
      GatherContext: {gatherMode: 'navigation'},
    };

    const resultPromise = ServerResponseTime.audit(artifacts, {computedCache: new Map()});
    await expect(resultPromise).rejects.toThrow(/Unable to identify the main resource/);
  });
});
