/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import UsesHTTP2Audit from '../../../audits/dobetterweb/uses-http2.js';
import {networkRecordsToDevtoolsLog} from '../../network-records-to-devtools-log.js';
import {createTestTrace} from '../../create-test-trace.js';

function buildArtifacts(networkRecords) {
  const frameUrl = networkRecords[0].url;
  const trace = createTestTrace({
    frameUrl,
    timeOrigin: 0,
    topLevelTasks: [{ts: 1000, duration: 50}],
    largestContentfulPaint: 5000,
    firstContentfulPaint: 2000,
    networkRecords,
  });
  const devtoolsLog = networkRecordsToDevtoolsLog(networkRecords);

  return {
    LinkElements: [],
    URL: {
      requestedUrl: frameUrl,
      mainDocumentUrl: frameUrl,
      finalDisplayedUrl: frameUrl,
    },
    devtoolsLogs: {defaultPass: devtoolsLog},
    traces: {defaultPass: trace},
    GatherContext: {gatherMode: 'navigation'},
  };
}

describe('Resources are fetched over http/2', () => {
  let context = {};

  beforeEach(() => {
    context = {settings: {throttlingMethod: 'simulate'}, computedCache: new Map()};
  });

  it('should pass when resources are requested via http/2', async () => {
    const networkRecords = [{
      url: 'https://www.example.com/',
      transferSize: 1000,
      priority: 'High',
      protocol: 'h2',
    },
    {
      url: 'https://www.example.com/2',
      transferSize: 1000,
      priority: 'High',
      protocol: 'h2',
    },
    {
      url: 'https://www.example.com/3',
      transferSize: 1000,
      priority: 'High',
      protocol: 'h2',
    },
    {
      url: 'https://www.example.com/4',
      transferSize: 1000,
      priority: 'High',
      protocol: 'h2',
    },
    {
      url: 'https://www.example.com/5',
      transferSize: 1000,
      priority: 'High',
      protocol: 'h2',
    },
    {
      url: 'https://www.example.com/6',
      transferSize: 1000,
      priority: 'High',
      protocol: 'h2',
    },
    ];

    const artifacts = buildArtifacts(networkRecords);

    const results = await UsesHTTP2Audit.audit(artifacts, context);
    expect(results).toHaveProperty('score', 1);
    expect(results.details.items).toHaveLength(0);
  });

  it('should fail when resources are requested via http/1.x', async () => {
    const networkRecords = [
      {
        url: 'https://www.example.com/',
        priority: 'High',
        rendererStartTime: 0,
        networkEndTime: 100,
        protocol: 'HTTP/1.1',
      },
      {
        url: 'https://www.example.com/2',
        priority: 'High',
        rendererStartTime: 200,
        networkEndTime: 300,
        protocol: 'HTTP/1.1',
      },
      {
        url: 'https://www.example.com/3',
        priority: 'High',
        rendererStartTime: 400,
        networkEndTime: 500,
        protocol: 'HTTP/1.1',
      },
      {
        url: 'https://www.example.com/4',
        transferSize: 20_000,
        rendererStartTime: 1000,
        networkEndTime: 1100,
        priority: 'High',
        protocol: 'HTTP/1.1',
      },
      {
        url: 'https://www.example.com/5',
        transferSize: 40_000,
        rendererStartTime: 4000,
        networkEndTime: 4100,
        priority: 'High',
        protocol: 'HTTP/1.1',
      },
      {
        url: 'https://www.example.com/6',
        transferSize: 50_000,
        rendererStartTime: 6000,
        networkEndTime: 6100,
        priority: 'High',
        protocol: 'HTTP/1.1',
      },
    ];
    const artifacts = buildArtifacts(networkRecords);

    const result = await UsesHTTP2Audit.audit(artifacts, context);
    const hosts = new Set(result.details.items.map(item => new URL(item.url).host));

    // make sure we don't pull in domains with only a few requests (GTM, GA)
    expect(hosts).toEqual(new Set(['www.example.com']));
    // make sure we flag all the rest
    expect(result.details.items).toHaveLength(6);
    // make sure we report savings
    expect(result.numericValue).toMatchInlineSnapshot(`630`);
    expect(result.details.overallSavingsMs).toMatchInlineSnapshot(`630`);
    // make sure we have a failing score
    // expect(result.score).toBeLessThan(0.5);
    expect(result.metricSavings).toEqual({LCP: 630, FCP: 480});
  });

  it('should ignore service worker requests', async () => {
    const networkRecords = [
      {
        url: 'https://www.example.com/',
        priority: 'High',
        rendererStartTime: 0,
        networkEndTime: 100,
        protocol: 'HTTP/1.1',
      },
      {
        url: 'https://www.example.com/2',
        priority: 'High',
        rendererStartTime: 200,
        networkEndTime: 300,
        protocol: 'HTTP/1.1',
      },
      {
        url: 'https://www.example.com/3',
        priority: 'High',
        rendererStartTime: 400,
        networkEndTime: 500,
        protocol: 'HTTP/1.1',
      },
      {
        url: 'https://www.example.com/sw',
        fetchedViaServiceWorker: true,
        protocol: 'HTTP/1.1',
        priority: 'High',
      },
      {
        url: 'https://www.example.com/sw2',
        fetchedViaServiceWorker: true,
        protocol: 'HTTP/1.1',
        priority: 'High',
      },
      {
        url: 'https://www.example.com/4',
        rendererStartTime: 2000, // after FCP
        transferSize: 50_000,
        protocol: 'HTTP/1.1',
        priority: 'High',
      },
    ];
    const artifacts = buildArtifacts(networkRecords);

    const result = await UsesHTTP2Audit.audit(artifacts, context);
    const urls = new Set(result.details.items.map(item => item.url));

    // make sure we flag only the non-sw ones
    expect(urls).not.toContain('https://www.example.com/sw');
    expect(urls).not.toContain('https://www.example.com/sw2');
    expect(result.details.items).toHaveLength(4);
    // make sure we report less savings
    expect(result.numericValue).toMatchInlineSnapshot(`630`);
    expect(result.details.overallSavingsMs).toMatchInlineSnapshot(`630`);
    expect(result.metricSavings).toEqual({LCP: 630, FCP: 480});
  });

  it('should return table items for timespan mode', async () => {
    const networkRecords = [
      {
        url: 'https://www.example.com/',
        priority: 'High',
        rendererStartTime: 0,
        networkEndTime: 100,
        protocol: 'HTTP/1.1',
      },
      {
        url: 'https://www.example.com/2',
        priority: 'High',
        rendererStartTime: 200,
        networkEndTime: 300,
        protocol: 'HTTP/1.1',
      },
      {
        url: 'https://www.example.com/3',
        priority: 'High',
        rendererStartTime: 400,
        networkEndTime: 500,
        protocol: 'HTTP/1.1',
      },
      {
        url: 'https://www.example.com/4',
        transferSize: 100_000,
        timing: {sendEnd: 0},
        priority: 'High',
        protocol: 'HTTP/1.1',
      },
      {
        url: 'https://www.example.com/5',
        transferSize: 600_000,
        priority: 'High',
        protocol: 'HTTP/1.1',
      },
      {
        url: 'https://www.example.com/6',
        transferSize: 600_000,
        priority: 'High',
        protocol: 'HTTP/1.1',
      },
    ];
    const artifacts = buildArtifacts(networkRecords);
    artifacts.GatherContext.gatherMode = 'timespan';
    const result = await UsesHTTP2Audit.audit(artifacts, context);
    const hosts = new Set(result.details.items.map(item => new URL(item.url).host));

    // make sure we don't pull in domains with only a few requests (GTM, GA)
    expect(hosts).toEqual(new Set(['www.example.com']));
    // make sure we flag all the rest
    expect(result.details.items).toHaveLength(6);
    // no savings calculated
    expect(result.numericValue).toBeUndefined();
    expect(result.details.overallSavingsMs).toBeUndefined();
    // make sure we have a failing score
    expect(result.score).toEqual(0);
    expect(result.metricSavings).toBeUndefined();
  });

  it('should identify multiplexable assets when run on recognizable 3p origins', async () => {
    const networkRecords = [
      {
        url: 'https://www.twitter.com/',
        transferSize: 1000,
        priority: 'High',
        protocol: 'HTTP/1.1',
      },
      {
        url: 'https://www.twitter.com/2',
        transferSize: 1000,
        priority: 'High',
        protocol: 'HTTP/1.1',
      },
      {
        url: 'https://www.twitter.com/3',
        transferSize: 1000,
        priority: 'High',
        protocol: 'HTTP/1.1',
      },
      {
        url: 'https://www.twitter.com/4',
        transferSize: 1000,
        priority: 'High',
        protocol: 'HTTP/1.1',
      },
      {
        url: 'https://www.twitter.com/5',
        transferSize: 1000,
        priority: 'High',
        protocol: 'HTTP/1.1',
      },
      {
        url: 'https://www.twitter.com/embed/foo',
        transferSize: 1000,
        priority: 'High',
        protocol: 'HTTP/1.1',
      },
      {
        url: 'https://www.facebook.com/embed',
        transferSize: 1000,
        protocol: 'HTTP/1.1',
        priority: 'High',
      },
    ];
    const artifacts = buildArtifacts(networkRecords);

    const result = await UsesHTTP2Audit.audit(artifacts, context);
    const urls = new Set(result.details.items.map(item => item.url));
    const hosts = new Set(result.details.items.map(item => new URL(item.url).host));

    // Make sure we don't pull in actual 3p domains.
    expect(hosts).toEqual(new Set(['www.twitter.com']));

    // Make sure we dont flag the 3rd party request for multiplexing.
    expect(urls).not.toContain('https://www.facebook.com/embed');

    expect(result.details.items).toHaveLength(6);
  });
});
