/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import RenderBlockingResourcesAudit from '../../../audits/byte-efficiency/render-blocking-resources.js'; // eslint-disable-line max-len
import * as constants from '../../../config/constants.js';
import * as Lantern from '../../../lib/lantern/lantern.js';
import {NetworkRequest} from '../../../lib/network-request.js';
import {getURLArtifactFromDevtoolsLog, readJson} from '../../test-utils.js';

const {NetworkNode, CPUNode} = Lantern.Graph;
const {Simulator} = Lantern.Simulation;

const trace = readJson('../../fixtures/artifacts/render-blocking/trace.json', import.meta);
const devtoolsLog = readJson('../../fixtures/artifacts/render-blocking/devtoolslog.json', import.meta);
const lrTrace = readJson('../../fixtures/artifacts/lr/trace.json.gz', import.meta);
const lrDevtoolsLog = readJson('../../fixtures/artifacts/lr/devtoolslog.json.gz', import.meta);

const mobileSlow4G = constants.throttling.mobileSlow4G;

describe('Render blocking resources audit', () => {
  it('evaluates render blocking input correctly', async () => {
    const artifacts = {
      URL: getURLArtifactFromDevtoolsLog(devtoolsLog),
      GatherContext: {gatherMode: 'navigation'},
      traces: {defaultPass: trace},
      devtoolsLogs: {defaultPass: devtoolsLog},
      Stacks: [],
    };

    const settings = {throttlingMethod: 'simulate', throttling: mobileSlow4G};
    const computedCache = new Map();
    const result = await RenderBlockingResourcesAudit.audit(artifacts, {settings, computedCache});
    assert.equal(result.score, 0);
    assert.equal(result.numericValue, 300);
    assert.deepStrictEqual(result.metricSavings, {FCP: 300, LCP: 0});
  });

  describe('Lightrider', () => {
    before(() => {
      global.isLightrider = true;
    });

    after(() => {
      global.isLightrider = undefined;
    });

    it('considers X-TotalFetchedSize in its reported transfer size', async () => {
      // TODO(15841): The trace backend knows nothing of Lantern.
      if (process.env.INTERNAL_LANTERN_USE_TRACE !== undefined) {
        return;
      }

      const artifacts = {
        URL: getURLArtifactFromDevtoolsLog(lrDevtoolsLog),
        GatherContext: {gatherMode: 'navigation'},
        traces: {defaultPass: lrTrace},
        devtoolsLogs: {defaultPass: lrDevtoolsLog},
        Stacks: [],
      };

      const settings = {throttlingMethod: 'simulate', throttling: mobileSlow4G};
      const computedCache = new Map();
      const result = await RenderBlockingResourcesAudit.audit(artifacts, {settings, computedCache});
      expect(result.details.items).toMatchInlineSnapshot(`
  Array [
    Object {
      "totalBytes": 128188,
      "url": "https://www.llentab.cz/wp-content/uploads/fusion-styles/715df3f482419a9ed822189df6e57839.min.css?ver=3.11.10",
      "wastedMs": 750,
    },
  ]
  `);
      assert.equal(result.score, 0);
      assert.equal(result.numericValue, 0);
      assert.deepStrictEqual(result.metricSavings, {FCP: 0, LCP: 0});
    });
  });

  it('evaluates correct wastedMs when LCP is text', async () => {
    const textLcpTrace = JSON.parse(JSON.stringify(trace));

    // Make it look like the LCP was text in the trace
    textLcpTrace.traceEvents =
      textLcpTrace.traceEvents.filter(e => e.name !== 'LargestImagePaint::Candidate');
    const lcpEvent =
      textLcpTrace.traceEvents.find(e => e.name === 'largestContentfulPaint::Candidate');
    lcpEvent.args.data.type = 'text';
    delete lcpEvent.args.data.url;

    const artifacts = {
      URL: getURLArtifactFromDevtoolsLog(devtoolsLog),
      GatherContext: {gatherMode: 'navigation'},
      traces: {defaultPass: textLcpTrace},
      devtoolsLogs: {defaultPass: devtoolsLog},
      Stacks: [],
    };

    const settings = {throttlingMethod: 'simulate', throttling: mobileSlow4G};
    const computedCache = new Map();
    const result = await RenderBlockingResourcesAudit.audit(artifacts, {settings, computedCache});
    assert.deepStrictEqual(result.metricSavings, {FCP: 300, LCP: 300});
  });

  it('evaluates amp page correctly', async () => {
    const artifacts = {
      URL: getURLArtifactFromDevtoolsLog(devtoolsLog),
      GatherContext: {gatherMode: 'navigation'},
      traces: {defaultPass: trace},
      devtoolsLogs: {defaultPass: devtoolsLog},
      Stacks: [
        {
          detector: 'js',
          id: 'amp',
          name: 'AMP',
          version: '2006180239003',
          npm: 'https://www.npmjs.com/org/ampproject',
        },
      ],
    };

    const settings = {throttlingMethod: 'simulate', throttling: mobileSlow4G};
    const computedCache = new Map();
    const result = await RenderBlockingResourcesAudit.audit(artifacts, {settings, computedCache});
    expect(result.numericValue).toEqual(0);
    expect(result.details.items).toEqual([
      {
        totalBytes: 389629,
        url: 'http://localhost:50049/style.css',
        // This value would be higher if we didn't have a special case for AMP stylesheets
        wastedMs: 1496,
      },
      {
        totalBytes: 291,
        url: 'http://localhost:50049/script.js',
        wastedMs: 304,
      },
    ]);
    expect(result.metricSavings).toEqual({FCP: 0, LCP: 0});
  });

  describe('#estimateSavingsWithGraphs', () => {
    const estimate = RenderBlockingResourcesAudit.estimateSavingsWithGraphs;

    let requestId;
    let record;
    let recordSlow;

    beforeEach(() => {
      requestId = 1;
      const scheme = 'http';
      const protocol = 'http';
      record = props => {
        const parsedURL = {host: 'example.com', scheme, securityOrigin: 'http://example.com'};
        const record = Object.assign({parsedURL, requestId: requestId++}, props, {protocol});
        return NetworkRequest.asLanternNetworkRequest(record);
      };
      recordSlow = props => {
        const parsedURL = {host: 'slow.com', scheme, securityOrigin: 'http://slow.com'};
        const record = Object.assign({parsedURL, requestId: requestId++}, props, {protocol});
        return NetworkRequest.asLanternNetworkRequest(record);
      };
    });

    it('computes savings from deferring', () => {
      const serverResponseTimeByOrigin = new Map([['http://example.com', 100]]);
      const simulator = new Simulator({rtt: 1000, serverResponseTimeByOrigin});
      const documentNode = new NetworkNode(record({transferSize: 4000}));
      const styleNode = new NetworkNode(record({transferSize: 3000}));
      const scriptNode = new NetworkNode(record({transferSize: 1000}));
      const scriptExecution = new CPUNode({tid: 1, ts: 1, dur: 50 * 1000}, []);
      const deferredIds = new Set([2, 3]);
      const wastedBytesMap = new Map();
      const Stacks = [];

      documentNode.addDependent(scriptNode);
      documentNode.addDependent(styleNode);
      documentNode.addDependent(scriptExecution);
      const result = estimate(simulator, documentNode, deferredIds, wastedBytesMap, Stacks);
      // Saving 1000 + 1000 + 100ms for TCP handshake + request/response + server response time
      // -200 ms for the CPU task that becomes new bottleneck
      assert.equal(result, 1900);
    });

    it('computes savings from inlining', () => {
      const serverResponseTimeByOrigin = new Map([['http://example.com', 100]]);
      const simulator = new Simulator({rtt: 1000, serverResponseTimeByOrigin});
      const documentNode = new NetworkNode(record({transferSize: 10 * 1000}));
      const styleNode = new NetworkNode(
        record({transferSize: 23 * 1000, resourceType: NetworkRequest.TYPES.Stylesheet})
      ); // pushes document over 14KB
      const deferredIds = new Set([2]);
      const wastedBytesMap = new Map([[undefined, 18 * 1000]]);
      const Stacks = [];
      documentNode.addDependent(styleNode);

      const result = estimate(simulator, documentNode, deferredIds, wastedBytesMap, Stacks);
      // Saving 1000 + 100ms for 1 RT savings + server response time
      assert.equal(result, 1100);
    });

    it('does not report savings from AMP-stack when document already exceeds 2.1s', () => {
      const serverResponseTimeByOrigin = new Map([
        ['http://example.com', 100],
        ['http://slow.com', 4000],
      ]);
      const Stacks = [
        {
          detector: 'js',
          id: 'amp',
          name: 'AMP',
          version: '2006180239003',
          npm: 'https://www.npmjs.com/org/ampproject',
        },
      ];
      const simulator = new Simulator({rtt: 1000, serverResponseTimeByOrigin});
      const documentNode = new NetworkNode(record({transferSize: 4000}));
      const styleNode = new NetworkNode(
        recordSlow({
          transferSize: 3000,
          resourceType: NetworkRequest.TYPES.Stylesheet,
        })
      );
      const styleNode2 = new NetworkNode(
        recordSlow({
          transferSize: 3000,
          resourceType: NetworkRequest.TYPES.Stylesheet,
        })
      );
      const styleNode3 = new NetworkNode(
        recordSlow({
          transferSize: 3000,
          resourceType: NetworkRequest.TYPES.Stylesheet,
        })
      );
      const deferredIds = new Set([2, 3, 4]);
      const wastedBytesMap = new Map();

      documentNode.addDependent(styleNode);
      styleNode.addDependent(styleNode2);
      documentNode.addDependent(styleNode3);
      const result = estimate(simulator, documentNode, deferredIds, wastedBytesMap, Stacks);
      // Document node: 2000 + 1000 + 100 + 1000 = 4100 for dns + TCP handshake + server response + requests
      // The style nodes are loaded async after 2100 so the potential savings are 0
      assert.equal(result, 0);
    });

    it('computes savings for AMP stylesheets loaded partially before 2.1s', () => {
      const serverResponseTimeByOrigin = new Map([
        ['http://example.com', 100],
        ['http://slow.com', 4000],
      ]);
      const Stacks = [
        {
          detector: 'js',
          id: 'amp',
          name: 'AMP',
          version: '2006180239003',
          npm: 'https://www.npmjs.com/org/ampproject',
        },
      ];
      const simulator = new Simulator({rtt: 100, serverResponseTimeByOrigin});
      const documentNode = new NetworkNode(record({transferSize: 4000}));
      const styleNode = new NetworkNode(
        recordSlow({
          transferSize: 3000,
          resourceType: NetworkRequest.TYPES.Stylesheet,
        })
      );
      const styleNode2 = new NetworkNode(
        recordSlow({
          transferSize: 3000,
          resourceType: NetworkRequest.TYPES.Stylesheet,
        })
      );
      const styleNode3 = new NetworkNode(
        recordSlow({
          transferSize: 3000,
          resourceType: NetworkRequest.TYPES.Stylesheet,
        })
      );
      const deferredIds = new Set([2, 3, 4]);
      const wastedBytesMap = new Map();

      documentNode.addDependent(styleNode);
      styleNode.addDependent(styleNode2);
      documentNode.addDependent(styleNode3);
      const result = estimate(simulator, documentNode, deferredIds, wastedBytesMap, Stacks);
      // Document node: 200 + 100 + 100 + 100 = 500 for dns + TCP handshake + server response + request
      // Remaining 1600 ms can be saved before 2100 AMP stylesheet deadline
      assert.equal(result, 1600);
    });
  });
});
