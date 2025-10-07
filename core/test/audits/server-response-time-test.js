/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import ServerResponseTime from '../../audits/server-response-time.js';
import {createTestTrace} from '../create-test-trace.js';

describe('Performance: server-response-time audit', () => {
  afterEach(() => {
    global.isLightrider = undefined;
  });

  it('fails when response time of root document is higher than 600ms', async () => {
    const mainResource = {
      url: 'https://example.com/',
      requestId: 'NAVIGATION_ID',
      timing: {receiveHeadersEnd: 830, sendEnd: 200},
    };
    const trace = createTestTrace({networkRecords: [mainResource]});

    const artifacts = {
      Trace: trace,
      URL: {mainDocumentUrl: 'https://example.com/'},
      GatherContext: {gatherMode: 'navigation'},
      SourceMaps: [],
    };

    const context = {computedCache: new Map(), settings: {}};
    const result = await ServerResponseTime.audit(artifacts, context);
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
      requestId: 'NAVIGATION_ID',
      timing: {receiveHeadersEnd: 400, sendEnd: 200},
    };
    const trace = createTestTrace({networkRecords: [mainResource]});

    const artifacts = {
      Trace: trace,
      URL: {mainDocumentUrl: 'https://example.com/'},
      GatherContext: {gatherMode: 'navigation'},
      SourceMaps: [],
    };

    const context = {computedCache: new Map(), settings: {}};
    const result = await ServerResponseTime.audit(artifacts, context);
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
      requestId: 'NAVIGATION_ID',
      responseHeaders: [
        {name: 'X-ResponseMs', value: '1234'},
      ],
    };
    const trace = createTestTrace({networkRecords: [mainResource]});

    const artifacts = {
      Trace: trace,
      URL: {mainDocumentUrl: 'https://example.com/'},
      GatherContext: {gatherMode: 'navigation'},
      SourceMaps: [],
    };

    const context = {computedCache: new Map(), settings: {}};
    const result = await ServerResponseTime.audit(artifacts, context);
    expect(result).toMatchObject({
      numericValue: 1234,
      score: 0,
      metricSavings: {
        FCP: 1134,
        LCP: 1134,
      },
    });
  });

  // TODO(v13): remove M116. See _backfillReceiveHeaderStartTiming.
  // eslint-disable-next-line max-len
  it('succeeds when response time of root document is lower than 600ms (receiveHeadersEnd fallback)', async () => {
    const mainResource = {
      url: 'https://example.com/',
      requestId: 'NAVIGATION_ID',
      timing: {receiveHeadersEnd: 400, sendEnd: 200},
    };
    const trace = createTestTrace({networkRecords: [mainResource]});

    const artifacts = {
      Trace: trace,
      URL: {mainDocumentUrl: 'https://example.com/'},
      GatherContext: {gatherMode: 'navigation'},
      SourceMaps: [],
    };

    const context = {computedCache: new Map(), settings: {}};
    const result = await ServerResponseTime.audit(artifacts, context);
    expect(result).toMatchObject({
      numericValue: 200,
      score: 1,
      metricSavings: {
        FCP: 100,
        LCP: 100,
      },
    });
  });

  it('throws error if no timing could be found', async () => {
    const trace = createTestTrace({});

    const artifacts = {
      Trace: trace,
      URL: {mainDocumentUrl: 'https://example.com/'},
      GatherContext: {gatherMode: 'navigation'},
      SourceMaps: [],
    };

    const context = {computedCache: new Map(), settings: {}};
    const resultPromise = ServerResponseTime.audit(artifacts, context);
    await expect(resultPromise).rejects.toThrow(/no timing found for main resource/);
  });
});
