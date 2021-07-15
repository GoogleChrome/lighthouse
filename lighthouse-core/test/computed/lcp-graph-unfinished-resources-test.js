/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

'use strict';

/* eslint-env jest */

const NetworkRequest = require('../../lib/network-request.js');
const BaseNode = require('../../lib/dependency-graph/base-node.js');
const PageDependencyGraph = require('../../computed/page-dependency-graph.js');
const LanternLCP = require('../../computed/metrics/lantern-largest-contentful-paint.js');

const TOPLEVEL_TASK_NAME = 'TaskQueueManager::ProcessTaskFromWorkQueue';

function getComputedGraphs(networkRecords, lcpTimestamp) {
  const traceOfTab = {
    timestamps: {largestContentfulPaint: lcpTimestamp},
    mainThreadEvents: [
      {
        name: TOPLEVEL_TASK_NAME,
        tid: 1,
        ts: 1,
        dur: 1,
        args: {},
      },
    ],
  };

  const dependencyGraph = PageDependencyGraph.createGraph(traceOfTab, networkRecords);

  const optimisticGraph = LanternLCP.getOptimisticGraph(
    dependencyGraph,
    traceOfTab
  );

  const pessimisticGraph = LanternLCP.getPessimisticGraph(
    dependencyGraph,
    traceOfTab
  );

  return {
    optimisticGraph,
    pessimisticGraph,
  };
}

function createRequest(
  requestId,
  url,
  startTime = 0,
  endTime = null,
  initiator = null,
  resourceType = NetworkRequest.TYPES.Document
) {
  if (endTime === null) {
    endTime = startTime + 0.05;
  }
  return {requestId, url, startTime, endTime, initiator, resourceType};
}

describe('Exclude unfinished resources from graph', () => {
  it('shouldn\'t be included in the graph if start time is past the paint timestamp', async () => {
    const networkRecords = [
      createRequest(0, '0', 0),
      createRequest(1, '1', 0.4, -1, null, NetworkRequest.TYPES.Other),
    ];
    const lcpTimestamp = 0.3 * 1000000;

    const {
      optimisticGraph,
      pessimisticGraph,
    } = getComputedGraphs(
      networkRecords,
      lcpTimestamp
    );

    let optimisticGraphContains = false;
    let pessimisticGraphContains = false;

    optimisticGraph.traverse(node => {
      if (node.type === BaseNode.TYPES.NETWORK && node._record.requestId === 1) {
        optimisticGraphContains = true;
      }
    });

    pessimisticGraph.traverse(node => {
      if (node.type === BaseNode.TYPES.NETWORK && node._record.requestId === 1) {
        pessimisticGraphContains = true;
      }
    });

    expect(optimisticGraphContains).toBe(false);
    expect(pessimisticGraphContains).toBe(false);
  });

  it('should be included in the graph if start time is before the paint timestamp', async () => {
    const networkRecords = [
      createRequest(0, '0', 0),
      createRequest(1, '1', 0.2, -1, null, NetworkRequest.TYPES.Other),
    ];
    const lcpTimestamp = 0.3 * 1000000;

    const {
      optimisticGraph,
      pessimisticGraph,
    } = getComputedGraphs(
      networkRecords,
      lcpTimestamp
    );

    let optimisticGraphContains = false;
    let pessimisticGraphContains = false;

    optimisticGraph.traverse(node => {
      if (node.type === BaseNode.TYPES.NETWORK && node._record.requestId === 1) {
        optimisticGraphContains = true;
      }
    });

    pessimisticGraph.traverse(node => {
      if (node.type === BaseNode.TYPES.NETWORK && node._record.requestId === 1) {
        pessimisticGraphContains = true;
      }
    });

    expect(optimisticGraphContains).toBe(true);
    expect(pessimisticGraphContains).toBe(true);
  });
});
