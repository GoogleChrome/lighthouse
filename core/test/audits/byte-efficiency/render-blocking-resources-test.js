/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import assert from 'assert/strict';

import RenderBlockingResourcesAudit from '../../../audits/byte-efficiency/render-blocking-resources.js'; // eslint-disable-line max-len
import * as constants from '../../../config/constants.js';
import {NetworkNode} from '../../../lib/dependency-graph/network-node.js';
import {CPUNode} from '../../../lib/dependency-graph/cpu-node.js';
import {Simulator} from '../../../lib/dependency-graph/simulator/simulator.js';
import {NetworkRequest} from '../../../lib/network-request.js';
import {getURLArtifactFromDevtoolsLog, readJson} from '../../test-utils.js';

const trace = readJson('../../fixtures/traces/progressive-app-m60.json', import.meta);
const devtoolsLog = readJson('../../fixtures/traces/progressive-app-m60.devtools.log.json', import.meta);
const ampTrace = readJson('../../fixtures/traces/amp-m86.trace.json', import.meta);
const ampDevtoolsLog = readJson('../../fixtures/traces/amp-m86.devtoolslog.json', import.meta);

const mobileSlow4G = constants.throttling.mobileSlow4G;

describe('Render blocking resources audit', () => {
  it('evaluates http2 input correctly', async () => {
    const artifacts = {
      URL: getURLArtifactFromDevtoolsLog(devtoolsLog),
      GatherContext: {gatherMode: 'navigation'},
      traces: {defaultPass: trace},
      devtoolsLogs: {defaultPass: devtoolsLog},
      TagsBlockingFirstPaint: [
        {
          tag: {url: 'https://pwa.rocks/script.js'},
          transferSize: 621,
        },
      ],
    };

    const settings = {throttlingMethod: 'simulate', throttling: mobileSlow4G};
    const computedCache = new Map();
    const result = await RenderBlockingResourcesAudit.audit(artifacts, {settings, computedCache});
    assert.equal(result.score, 1);
    assert.equal(result.numericValue, 0);
  });

  it('evaluates amp page correctly', async () => {
    const artifacts = {
      URL: getURLArtifactFromDevtoolsLog(ampDevtoolsLog),
      GatherContext: {gatherMode: 'navigation'},
      traces: {defaultPass: ampTrace},
      devtoolsLogs: {defaultPass: ampDevtoolsLog},
      TagsBlockingFirstPaint: [
        {
          tag: {
            url:
              'https://fonts.googleapis.com/css?family=Fira+Sans+Condensed%3A400%2C400i%2C600%2C600i&subset=latin%2Clatin-ext&display=swap',
          },
          transferSize: 621,
        },
        {
          tag: {url: 'https://fonts.googleapis.com/css?family=Montserrat'},
          transferSize: 621,
        },
      ],
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
    expect(result.numericValue).toMatchInlineSnapshot(`450`);
    expect(result.details.items).toMatchObject([
      {
        'totalBytes': 621,
        'url': 'https://fonts.googleapis.com/css?family=Fira+Sans+Condensed%3A400%2C400i%2C600%2C600i&subset=latin%2Clatin-ext&display=swap',
        'wastedMs': 440,
      },
      // Due to internal H2 simulation details, parallel HTTP/2 requests are pipelined which makes
      // it look like Montserrat starts after Fira Sans finishes. It would be preferred
      // if eventual simulation improvements list Montserrat here as well.
    ]);
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
        return Object.assign({parsedURL, requestId: requestId++}, props, {protocol});
      };
      recordSlow = props => {
        const parsedURL = {host: 'slow.com', scheme, securityOrigin: 'http://slow.com'};
        return Object.assign({parsedURL, requestId: requestId++}, props, {protocol});
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
