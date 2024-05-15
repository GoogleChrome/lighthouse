/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {makeComputedArtifact} from './computed-artifact.js';
import {PageDependencyGraph as LanternPageDependencyGraph} from '../lib/lantern/page-dependency-graph.js';
import {NetworkRequest} from '../lib/network-request.js';
import {ProcessedTrace} from './processed-trace.js';
import {NetworkRecords} from './network-records.js';

/** @typedef {import('../lib/lantern/base-node.js').Node<LH.Artifacts.NetworkRequest>} Node */

class PageDependencyGraph {
  /**
   * @param {{trace: LH.Trace, devtoolsLog: LH.DevtoolsLog, URL: LH.Artifacts['URL']}} data
   * @param {LH.Artifacts.ComputedContext} context
   * @return {Promise<Node>}
   */
  static async compute_(data, context) {
    const {trace, devtoolsLog, URL} = data;
    const [processedTrace, networkRecords] = await Promise.all([
      ProcessedTrace.request(trace, context),
      NetworkRecords.request(devtoolsLog, context),
    ]);

    for (const request of networkRecords) {
      request.rendererStartTime = Math.round(request.rendererStartTime * 1000) / 1000;
      request.networkRequestTime = Math.round(request.networkRequestTime * 1000) / 1000;
      request.responseHeadersEndTime = Math.round(request.responseHeadersEndTime * 1000) / 1000;
      request.networkEndTime = Math.round(request.networkEndTime * 1000) / 1000;
    }
    const mainThreadEvents = processedTrace.mainThreadEvents;
    const lanternRequests = networkRecords.map(NetworkRequest.asLanternNetworkRequest);
    return LanternPageDependencyGraph.createGraph(mainThreadEvents, lanternRequests, URL);
  }
}

const PageDependencyGraphComputed =
  makeComputedArtifact(PageDependencyGraph, ['devtoolsLog', 'trace', 'URL']);
export {PageDependencyGraphComputed as PageDependencyGraph};
