/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import RedirectsAudit from '../../audits/redirects.js';
import {networkRecordsToDevtoolsLog} from '../network-records-to-devtools-log.js';
import {createTestTrace} from '../create-test-trace.js';

const FAILING_THREE_REDIRECTS = [{
  requestId: '1',
  networkRequestTime: 0,
  priority: 'VeryHigh',
  url: 'http://example.com/',
  timing: {receiveHeadersEnd: 11},
}, {
  requestId: '1:redirect',
  networkRequestTime: 1000,
  priority: 'VeryHigh',
  url: 'https://example.com/',
  timing: {receiveHeadersEnd: 12},
}, {
  requestId: '1:redirect:redirect',
  networkRequestTime: 2000,
  priority: 'VeryHigh',
  url: 'https://m.example.com/',
  timing: {receiveHeadersEnd: 17},
}, {
  requestId: '1:redirect:redirect:redirect',
  networkRequestTime: 3000,
  priority: 'VeryHigh',
  url: 'https://m.example.com/final',
  timing: {receiveHeadersEnd: 19},
  transferSize: 1000,
}];

const FAILING_TWO_REDIRECTS = [{
  requestId: '1',
  networkRequestTime: 445_000,
  priority: 'VeryHigh',
  url: 'http://lisairish.com/',
  timing: {receiveHeadersEnd: 446},
}, {
  requestId: '1:redirect',
  networkRequestTime: 446_000,
  priority: 'VeryHigh',
  url: 'https://lisairish.com/',
  timing: {receiveHeadersEnd: 447},
}, {
  requestId: '1:redirect:redirect',
  networkRequestTime: 447_000,
  priority: 'VeryHigh',
  url: 'https://www.lisairish.com/',
  timing: {receiveHeadersEnd: 448},
  transferSize: 1000,
}];

const SUCCESS_ONE_REDIRECT = [{
  requestId: '1',
  networkRequestTime: 135_000,
  priority: 'VeryHigh',
  url: 'https://lisairish.com/',
  timing: {receiveHeadersEnd: 136},
}, {
  requestId: '1:redirect',
  networkRequestTime: 136_000,
  priority: 'VeryHigh',
  url: 'https://www.lisairish.com/',
  timing: {receiveHeadersEnd: 139},
  transferSize: 1000,
}];

const SUCCESS_NOREDIRECT = [{
  requestId: '1',
  networkRequestTime: 135_873,
  priority: 'VeryHigh',
  url: 'https://www.google.com/',
  timing: {receiveHeadersEnd: 140},
  transferSize: 1000,
}];

const FAILING_CLIENTSIDE = [
  {
    requestId: '1',
    networkRequestTime: 445_000,
    priority: 'VeryHigh',
    url: 'http://lisairish.com/',
    timing: {receiveHeadersEnd: 446},
  },
  {
    requestId: '1:redirect',
    networkRequestTime: 446_000,
    priority: 'VeryHigh',
    url: 'https://lisairish.com/',
    timing: {receiveHeadersEnd: 447},
    transferSize: 1000,
  },
  {
    requestId: '2',
    networkRequestTime: 447_000,
    priority: 'VeryHigh',
    url: 'https://www.lisairish.com/',
    timing: {receiveHeadersEnd: 448},
    transferSize: 1000,
  },
];

const FAILING_SELF_REDIRECT = [{
  requestId: '1',
  url: 'https://redirect.test/',
  priority: 'VeryHigh',
  networkRequestTime: 0,
  responseHeadersEndTime: 500,
  transferSize: 1000,
},
{
  requestId: '2',
  url: 'https://redirect.test/',
  priority: 'VeryHigh',
  networkRequestTime: 1000,
  responseHeadersEndTime: 1500,
  transferSize: 1000,
},
{
  requestId: '3',
  url: 'https://redirect.test/',
  priority: 'VeryHigh',
  networkRequestTime: 3000,
  responseHeadersEndTime: 3500,
  transferSize: 1000,
}];

describe('Performance: Redirects audit', () => {
  const mockArtifacts = (networkRecords, finalDisplayedUrl) => {
    const devtoolsLog = networkRecordsToDevtoolsLog(networkRecords);
    const frameUrl = networkRecords[0].url;

    const trace = createTestTrace({
      frameUrl,
      largestContentfulPaint: 15,
      traceEnd: 5000,
      networkRecords,
    });
    const navStart = trace.traceEvents.find(e => e.name === 'navigationStart');
    navStart.args.data.navigationId = '1';
    const fcp = trace.traceEvents.find(e => e.name === 'firstContentfulPaint');
    fcp.args.data.navigationId = '1';
    const lcp = trace.traceEvents.find(e => e.name === 'largestContentfulPaint::Candidate');
    lcp.args.data.navigationId = '1';

    return {
      GatherContext: {gatherMode: 'navigation'},
      traces: {defaultPass: trace},
      devtoolsLogs: {defaultPass: devtoolsLog},
      URL: {
        requestedUrl: networkRecords[0].url,
        mainDocumentUrl: finalDisplayedUrl,
        finalDisplayedUrl,
      },
    };
  };

  it('fails when client-side redirects detected', async () => {
    const context = {settings: {}, computedCache: new Map()};
    const artifacts = mockArtifacts(FAILING_CLIENTSIDE, 'https://www.lisairish.com/');

    const traceEvents = artifacts.traces.defaultPass.traceEvents;
    const navStart = traceEvents.find(e => e.name === 'navigationStart');
    const fcp = traceEvents.find(e => e.name === 'firstContentfulPaint');
    const lcp = traceEvents.find(e => e.name === 'largestContentfulPaint::Candidate');

    const secondNavStart = JSON.parse(JSON.stringify(navStart));
    traceEvents.push(secondNavStart);
    navStart.args.data.isLoadingMainFrame = true;
    navStart.args.data.documentLoaderURL = 'http://lisairish.com/';
    secondNavStart.ts++;
    secondNavStart.args.data.isLoadingMainFrame = true;
    secondNavStart.args.data.documentLoaderURL = 'https://www.lisairish.com/';
    secondNavStart.args.data.navigationId = '2';

    const secondFcp = JSON.parse(JSON.stringify(fcp));
    traceEvents.push(secondFcp);
    secondFcp.args.data.navigationId = '2';
    secondFcp.ts += 2;

    const secondLcp = JSON.parse(JSON.stringify(lcp));
    traceEvents.push(secondLcp);
    secondLcp.args.data.navigationId = '2';
    secondFcp.ts += 2;

    const output = await RedirectsAudit.audit(artifacts, context);
    expect(output.details.items).toHaveLength(3);
    expect(Math.round(output.score * 100) / 100).toMatchInlineSnapshot(`0`);
    expect(output.numericValue).toMatchInlineSnapshot(`2000`);
    expect(output.metricSavings).toEqual({LCP: 2000, FCP: 2000});
  });

  it('uses lantern timings when throttlingMethod is simulate', async () => {
    const artifacts = mockArtifacts(FAILING_THREE_REDIRECTS, 'https://m.example.com/final');
    const context = {settings: {throttlingMethod: 'simulate'}, computedCache: new Map()};
    const output = await RedirectsAudit.audit(artifacts, context);
    expect(output.details.items).toHaveLength(4);
    expect(output.details.items.map(item => [item.url, item.wastedMs])).toMatchInlineSnapshot(`
      Array [
        Array [
          "http://example.com/",
          630,
        ],
        Array [
          "https://example.com/",
          480,
        ],
        Array [
          "https://m.example.com/",
          780,
        ],
        Array [
          "https://m.example.com/final",
          0,
        ],
      ]
    `);
    expect(output.numericValue).toMatchInlineSnapshot(`1890`);
    expect(output.metricSavings).toEqual({LCP: 1890, FCP: 1890});
  });

  it('fails when 3 redirects detected', () => {
    const artifacts = mockArtifacts(FAILING_THREE_REDIRECTS, 'https://m.example.com/final');
    const context = {settings: {}, computedCache: new Map()};
    return RedirectsAudit.audit(artifacts, context).then(output => {
      expect(output.details.items).toHaveLength(4);
      expect(Math.round(output.score * 100) / 100).toMatchInlineSnapshot(`0`);
      expect(output.numericValue).toMatchInlineSnapshot(`3000`);
      expect(output.metricSavings).toEqual({LCP: 3000, FCP: 3000});
    });
  });

  it('fails when 2 redirects detected', () => {
    const artifacts = mockArtifacts(FAILING_TWO_REDIRECTS, 'https://www.lisairish.com/');
    const context = {settings: {}, computedCache: new Map()};
    return RedirectsAudit.audit(artifacts, context).then(output => {
      expect(output.details.items).toHaveLength(3);
      expect(Math.round(output.score * 100) / 100).toMatchInlineSnapshot(`0`);
      expect(output.numericValue).toMatchInlineSnapshot(`2000`);
      expect(output.metricSavings).toEqual({LCP: 2000, FCP: 2000});
    });
  });

  it('fails when 1 redirect detected', () => {
    const artifacts = mockArtifacts(SUCCESS_ONE_REDIRECT, 'https://www.lisairish.com/');
    const context = {settings: {}, computedCache: new Map()};
    return RedirectsAudit.audit(artifacts, context).then(output => {
      expect(output.details.items).toHaveLength(2);
      expect(output.score).toEqual(0);
      expect(output.numericValue).toMatchInlineSnapshot(`1000`);
      expect(output.metricSavings).toEqual({LCP: 1000, FCP: 1000});
    });
  });

  it('passes when no redirect detected', () => {
    const artifacts = mockArtifacts(SUCCESS_NOREDIRECT, 'https://www.google.com/');
    const context = {settings: {}, computedCache: new Map()};
    return RedirectsAudit.audit(artifacts, context).then(output => {
      assert.equal(output.score, 1);
      assert.equal(output.details.items.length, 0);
      assert.equal(output.numericValue, 0);
      assert.deepStrictEqual(output.metricSavings, {LCP: 0, FCP: 0});
    });
  });

  it('fails when client-side redirects page to itself', async () => {
    const context = {settings: {}, computedCache: new Map()};
    const artifacts = mockArtifacts(FAILING_SELF_REDIRECT, 'https://redirect.test/');

    const traceEvents = artifacts.traces.defaultPass.traceEvents;
    const navStart = traceEvents.find(e => e.name === 'navigationStart');
    const fcp = traceEvents.find(e => e.name === 'firstContentfulPaint');
    const lcp = traceEvents.find(e => e.name === 'largestContentfulPaint::Candidate');

    const secondNavStart = JSON.parse(JSON.stringify(navStart));
    traceEvents.push(secondNavStart);
    secondNavStart.args.data.navigationId = '2';

    const secondFcp = JSON.parse(JSON.stringify(fcp));
    traceEvents.push(secondFcp);
    secondFcp.args.data.navigationId = '2';

    const secondLcp = JSON.parse(JSON.stringify(lcp));
    traceEvents.push(secondLcp);
    secondLcp.args.data.navigationId = '2';

    const thirdNavStart = JSON.parse(JSON.stringify(navStart));
    traceEvents.push(thirdNavStart);
    thirdNavStart.args.data.navigationId = '3';

    const thirdFcp = JSON.parse(JSON.stringify(fcp));
    traceEvents.push(thirdFcp);
    thirdFcp.args.data.navigationId = '3';

    const thirdLcp = JSON.parse(JSON.stringify(lcp));
    traceEvents.push(thirdLcp);
    thirdLcp.args.data.navigationId = '3';

    const output = await RedirectsAudit.audit(artifacts, context);
    expect(output).toMatchObject({
      score: 0,
      numericValue: 3000,
      details: {
        items: [
          {url: 'https://redirect.test/', wastedMs: 1000},
          {url: 'https://redirect.test/', wastedMs: 2000},
          {url: 'https://redirect.test/', wastedMs: 0},
        ],
      },
      metricSavings: {
        LCP: 3000,
        FCP: 3000,
      },
    });
  });

  it('throws when no navigation requests are found', async () => {
    const artifacts = mockArtifacts(SUCCESS_NOREDIRECT, 'https://www.google.com/');
    const context = {settings: {}, computedCache: new Map()};
    const traceEvents = artifacts.traces.defaultPass.traceEvents;
    const navStart = traceEvents.find(e => e.name === 'navigationStart');
    navStart.args.data.navigationId = 'NO_MATCHY';

    await expect(RedirectsAudit.audit(artifacts, context)).rejects
        .toThrow('No navigation requests found');
  });
});
