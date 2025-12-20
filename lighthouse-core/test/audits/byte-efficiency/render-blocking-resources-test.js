/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const RenderBlockingResourcesAudit = require('../../../audits/byte-efficiency/render-blocking-resources.js'); // eslint-disable-line max-len

const mobileSlow4G = require('../../../config/constants.js').throttling.mobileSlow4G;
const NetworkNode = require('../../../lib/dependency-graph/network-node.js');
const CPUNode = require('../../../lib/dependency-graph/cpu-node.js');
const Simulator = require('../../../lib/dependency-graph/simulator/simulator.js');
const NetworkRequest = require('../../../lib/network-request.js');
const assert = require('assert').strict;

const trace = require('../../fixtures/traces/progressive-app-m60.json');
const devtoolsLog = require('../../fixtures/traces/progressive-app-m60.devtools.log.json');

/* eslint-env jest */

describe('Render blocking resources audit', () => {
  it('evaluates http2 input correctly', async () => {
    const artifacts = {
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

  describe('#estimateSavingsWithGraphs', () => {
    const estimate = RenderBlockingResourcesAudit.estimateSavingsWithGraphs;

    let requestId;
    let record;

    beforeEach(() => {
      requestId = 1;
      record = props => {
        const parsedURL = {host: 'example.com', securityOrigin: 'http://example.com'};
        return Object.assign({parsedURL, requestId: requestId++}, props);
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

      documentNode.addDependent(scriptNode);
      documentNode.addDependent(styleNode);
      documentNode.addDependent(scriptExecution);
      const result = estimate(simulator, documentNode, deferredIds, wastedBytesMap);
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
      documentNode.addDependent(styleNode);

      const result = estimate(simulator, documentNode, deferredIds, wastedBytesMap);
      // Saving 1000 + 1000 + 100ms for TCP handshake + 1 RT savings + server response time
      assert.equal(result, 2100);
    });
  });
});
