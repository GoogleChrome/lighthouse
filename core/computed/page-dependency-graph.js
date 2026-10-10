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

class PageDependencyGraph {
  /**
   * @param {{trace: LH.Trace, devtoolsLog: LH.DevtoolsLog, settings: LH.Audit.Context['settings'], URL: LH.Artifacts['URL'], SourceMaps: LH.Artifacts['SourceMaps'], HostDPR: LH.Artifacts['HostDPR'], fromTrace: boolean}} data
   * @param {LH.Artifacts.ComputedContext} context
   * @return {Promise<LH.Gatherer.Simulation.GraphNode>}
   */
  static async compute_(data, context) {
    const {trace, settings, devtoolsLog, URL, SourceMaps, HostDPR} = data;
    const [{mainThreadEvents}, networkRecords] = await Promise.all([
      ProcessedTrace.request(trace, context),
      NetworkRecords.request(devtoolsLog, context),
    ]);

    if (data.fromTrace) {
      const traceEngineResult =
        await TraceEngineResult.request({trace, settings, SourceMaps, HostDPR}, context);
      const parsedTrace = traceEngineResult.data;
      const requests =
        Lantern.TraceEngineComputationData.createNetworkRequests(trace, parsedTrace);
      let url = URL;
      if (
        url?.requestedUrl &&
        !Lantern.Core.NetworkAnalyzer.findResourceForUrl(requests, url.requestedUrl) &&
        requests.length
      ) {
        const originUrl = new globalThis.URL(url.requestedUrl).origin + '/';
        const rootRequest =
          Lantern.Core.NetworkAnalyzer.findResourceForUrl(requests, originUrl) || requests[0];
        url = {
          ...url,
          requestedUrl: rootRequest.url,
        };
      }
      const graph =
        Lantern.TraceEngineComputationData.createGraph(requests, trace, parsedTrace, url);
      // @ts-expect-error for now, ignore that this is a SyntheticNetworkEvent instead of LH's NetworkEvent.
      return graph;
    }

    const lanternRequests = networkRecords.map(NetworkRequest.asLanternNetworkRequest);
    return Lantern.Graph.PageDependencyGraph.createGraph(mainThreadEvents, lanternRequests, URL);
  }
}

const PageDependencyGraphComputed = makeComputedArtifact(PageDependencyGraph,
  ['devtoolsLog', 'settings', 'trace', 'URL', 'SourceMaps', 'HostDPR', 'fromTrace']);
export {PageDependencyGraphComputed as PageDependencyGraph};
