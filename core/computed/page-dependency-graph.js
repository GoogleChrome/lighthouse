/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Lantern from '../lib/lantern/lantern.js';
import {makeComputedArtifact} from './computed-artifact.js';
import {NetworkRequest} from '../lib/network-request.js';
import {ProcessedTrace} from './processed-trace.js';
import {NetworkRecords} from './network-records.js';
import {TraceEngineResult} from './trace-engine-result.js';

/** @typedef {import('../lib/lantern/BaseNode.js').Node<LH.Artifacts.NetworkRequest>} Node */

class PageDependencyGraph {
  /**
   * @param {{trace: LH.Trace, devtoolsLog: LH.DevtoolsLog, URL: LH.Artifacts['URL'], fromTrace?: boolean}} data
   * @param {LH.Artifacts.ComputedContext} context
   * @return {Promise<Node>}
   */
  static async compute_(data, context) {
    const {trace, devtoolsLog, URL} = data;
    const [{mainThreadEvents}, networkRecords] = await Promise.all([
      ProcessedTrace.request(trace, context),
      NetworkRecords.request(devtoolsLog, context),
    ]);

    if (data.fromTrace) {
      const traceEngineResult = await TraceEngineResult.request({trace}, context);
      const traceEngineData = traceEngineResult.data;
      const requests =
        Lantern.TraceEngineComputationData.createNetworkRequests(trace, traceEngineData);
      const graph =
        Lantern.TraceEngineComputationData.createGraph(requests, trace, traceEngineData, URL);
      return graph;
    }

    const lanternRequests = networkRecords.map(NetworkRequest.asLanternNetworkRequest);
    return Lantern.PageDependencyGraph.createGraph(mainThreadEvents, lanternRequests, URL);
  }
}

const PageDependencyGraphComputed =
  makeComputedArtifact(PageDependencyGraph, ['devtoolsLog', 'trace', 'URL', 'fromTrace']);
export {PageDependencyGraphComputed as PageDependencyGraph};
