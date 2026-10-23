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

/**
 * ResourceSendRequest URLs in the trace retain #hash fragments, whereas CDP
 * Network.requestWillBeSent, Page.frameNavigated, initiator.url, documentURL,
 * and V8 script events strip #hash fragments, and Lantern's NetworkAnalyzer
 * requires request.url not to have a fragment.
 * TODO: Remove once @paulirish/trace_engine includes the fix in LanternComputationData.
 * @param {string} urlStr
 * @return {string}
 */
function stripUrlHash(urlStr) {
  if (!urlStr.includes('#')) return urlStr;
  try {
    const url = new URL(urlStr);
    url.hash = '';
    return url.href;
  } catch {
    return urlStr;
  }
}

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
      let parsedTrace = traceEngineResult.data;
      if (parsedTrace.NetworkRequests.byTime.some(
        r => r.args.data.url.includes('#') ||
          r.args.data.redirects.some(red => red.url.includes('#'))
      )) {
        const byTime = parsedTrace.NetworkRequests.byTime.map(request => {
          const url = stripUrlHash(request.args.data.url);
          const redirects = request.args.data.redirects.map(redirect => ({
            ...redirect,
            url: stripUrlHash(redirect.url),
          }));
          if (url === request.args.data.url &&
              redirects.every((red, i) => red.url === request.args.data.redirects[i].url)) {
            return request;
          }
          return {
            ...request,
            args: {
              ...request.args,
              data: {
                ...request.args.data,
                url,
                redirects,
              },
            },
          };
        });
        parsedTrace = {
          ...parsedTrace,
          NetworkRequests: {
            ...parsedTrace.NetworkRequests,
            byTime,
          },
        };
      }
      const requests =
        Lantern.TraceEngineComputationData.createNetworkRequests(trace, parsedTrace);
      const graph =
        Lantern.TraceEngineComputationData.createGraph(requests, trace, parsedTrace, URL);
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
