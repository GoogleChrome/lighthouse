/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Lantern from './types/lantern.js';
import {NetworkRequestTypes} from './lantern.js';
import {NetworkNode} from './network-node.js';
import {CPUNode} from './cpu-node.js';
import {TraceProcessor} from '../tracehouse/trace-processor.js';
import {NetworkAnalyzer} from './simulator/network-analyzer.js';
import {RESOURCE_TYPES} from '../network-request.js';

/** @typedef {import('./base-node.js').Node} Node */
/** @typedef {Omit<LH.Artifacts['URL'], 'finalDisplayedUrl'>} URLArtifact */

/**
 * @typedef {Object} NetworkNodeOutput
 * @property {Array<NetworkNode>} nodes
 * @property {Map<string, NetworkNode>} idToNodeMap
 * @property {Map<string, Array<NetworkNode>>} urlToNodeMap
 * @property {Map<string, NetworkNode|null>} frameIdToNodeMap
 */

// Shorter tasks have negligible impact on simulation results.
const SIGNIFICANT_DUR_THRESHOLD_MS = 10;

// TODO: video files tend to be enormous and throw off all graph traversals, move this ignore
//    into estimation logic when we use the dependency graph for other purposes.
const IGNORED_MIME_TYPES_REGEX = /^video/;

class PageDependencyGraph {
  /**
   * @param {Lantern.NetworkRequest} record
   * @return {Array<string>}
   */
  static getNetworkInitiators(record) {
    if (!record.initiator) return [];
    if (record.initiator.url) return [record.initiator.url];
    if (record.initiator.type === 'script') {
      // Script initiators have the stack of callFrames from all functions that led to this request.
      // If async stacks are enabled, then the stack will also have the parent functions that asynchronously
      // led to this request chained in the `parent` property.
      /** @type {Set<string>} */
      const scriptURLs = new Set();
      let stack = record.initiator.stack;
      while (stack) {
        const callFrames = stack.callFrames || [];
        for (const frame of callFrames) {
          if (frame.url) scriptURLs.add(frame.url);
        }

        stack = stack.parent;
      }

      return Array.from(scriptURLs);
    }

    return [];
  }

  /**
   * @param {Array<Lantern.NetworkRequest>} networkRecords
   * @return {NetworkNodeOutput}
   */
  static getNetworkNodeOutput(networkRecords) {
    /** @type {Array<NetworkNode>} */
    const nodes = [];
    /** @type {Map<string, NetworkNode>} */
    const idToNodeMap = new Map();
    /** @type {Map<string, Array<NetworkNode>>} */
    const urlToNodeMap = new Map();
    /** @type {Map<string, NetworkNode|null>} */
    const frameIdToNodeMap = new Map();

    networkRecords.forEach(record => {
      if (IGNORED_MIME_TYPES_REGEX.test(record.mimeType)) return;
      if (record.fromWorker) return;

      // Network record requestIds can be duplicated for an unknown reason
      // Suffix all subsequent records with `:duplicate` until it's unique
      // NOTE: This should never happen with modern NetworkRequest library, but old fixtures
      // might still have this issue.
      while (idToNodeMap.has(record.requestId)) {
        record.requestId += ':duplicate';
      }

      const node = new NetworkNode(record);
      nodes.push(node);

      const urlList = urlToNodeMap.get(record.url) || [];
      urlList.push(node);

      idToNodeMap.set(record.requestId, node);
      urlToNodeMap.set(record.url, urlList);

      // If the request was for the root document of an iframe, save an entry in our
      // map so we can link up the task `args.data.frame` dependencies later in graph creation.
      if (record.frameId &&
          record.resourceType === NetworkRequestTypes.Document &&
          record.documentURL === record.url) {
        // If there's ever any ambiguity, permanently set the value to `false` to avoid loops in the graph.
        const value = frameIdToNodeMap.has(record.frameId) ? null : node;
        frameIdToNodeMap.set(record.frameId, value);
      }
    });

    return {nodes, idToNodeMap, urlToNodeMap, frameIdToNodeMap};
  }

  /**
   * @param {LH.TraceEvent[]} mainThreadEvents
   * @return {Array<CPUNode>}
   */
  static getCPUNodes(mainThreadEvents) {
    /** @type {Array<CPUNode>} */
    const nodes = [];
    let i = 0;

    TraceProcessor.assertHasToplevelEvents(mainThreadEvents);

    while (i < mainThreadEvents.length) {
      const evt = mainThreadEvents[i];
      i++;

      // Skip all trace events that aren't schedulable tasks with sizable duration
      if (!TraceProcessor.isScheduleableTask(evt) || !evt.dur) {
        continue;
      }

      /** @type {number|undefined} */
      let correctedEndTs = undefined;

      // Capture all events that occurred within the task
      /** @type {Array<LH.TraceEvent>} */
      const children = [];
      for (
        const endTime = evt.ts + evt.dur;
        i < mainThreadEvents.length && mainThreadEvents[i].ts < endTime;
        i++
      ) {
        // Temporary fix for a Chrome bug where some RunTask events can be overlapping.
        // We correct that here be ensuring each RunTask ends at least 1 microsecond before the next
        // https://github.com/GoogleChrome/lighthouse/issues/15896
        // https://issues.chromium.org/issues/329678173
        if (TraceProcessor.isScheduleableTask(mainThreadEvents[i]) && mainThreadEvents[i].dur) {
          correctedEndTs = mainThreadEvents[i].ts - 1;
          break;
        }

        children.push(mainThreadEvents[i]);
      }

      nodes.push(new CPUNode(evt, children, correctedEndTs));
    }

    return nodes;
  }

  /**
   * @param {NetworkNode} rootNode
   * @param {NetworkNodeOutput} networkNodeOutput
   */
  static linkNetworkNodes(rootNode, networkNodeOutput) {
    networkNodeOutput.nodes.forEach(node => {
      const directInitiatorRequest = node.request.initiatorRequest || rootNode.request;
      const directInitiatorNode =
        networkNodeOutput.idToNodeMap.get(directInitiatorRequest.requestId) || rootNode;
      const canDependOnInitiator =
        !directInitiatorNode.isDependentOn(node) &&
        node.canDependOn(directInitiatorNode);
      const initiators = PageDependencyGraph.getNetworkInitiators(node.request);
      if (initiators.length) {
        initiators.forEach(initiator => {
          const parentCandidates = networkNodeOutput.urlToNodeMap.get(initiator) || [];
          // Only add the edge if the parent is unambiguous with valid timing and isn't circular.
          if (parentCandidates.length === 1 &&
              parentCandidates[0].startTime <= node.startTime &&
              !parentCandidates[0].isDependentOn(node)) {
            node.addDependency(parentCandidates[0]);
          } else if (canDependOnInitiator) {
            directInitiatorNode.addDependent(node);
          }
        });
      } else if (canDependOnInitiator) {
        directInitiatorNode.addDependent(node);
      }

      // Make sure the nodes are attached to the graph if the initiator information was invalid.
      if (node !== rootNode && node.getDependencies().length === 0 && node.canDependOn(rootNode)) {
        node.addDependency(rootNode);
      }

      if (!node.request.redirects) return;

      const redirects = [...node.request.redirects, node.request];
      for (let i = 1; i < redirects.length; i++) {
        const redirectNode = networkNodeOutput.idToNodeMap.get(redirects[i - 1].requestId);
        const actualNode = networkNodeOutput.idToNodeMap.get(redirects[i].requestId);
        if (actualNode && redirectNode) {
          actualNode.addDependency(redirectNode);
        }
      }
    });
  }

  /**
   * @param {Node} rootNode
   * @param {NetworkNodeOutput} networkNodeOutput
   * @param {Array<CPUNode>} cpuNodes
   */
  static linkCPUNodes(rootNode, networkNodeOutput, cpuNodes) {
    /** @type {Set<LH.Crdp.Network.ResourceType|undefined>} */
    const linkableResourceTypes = new Set([
      NetworkRequestTypes.XHR, NetworkRequestTypes.Fetch, NetworkRequestTypes.Script,
    ]);

    /** @param {CPUNode} cpuNode @param {string} reqId */
    function addDependentNetworkRequest(cpuNode, reqId) {
      const networkNode = networkNodeOutput.idToNodeMap.get(reqId);
      if (!networkNode ||
          // Ignore all network nodes that started before this CPU task started
          // A network request that started earlier could not possibly have been started by this task
          networkNode.startTime <= cpuNode.startTime) return;
      const {request} = networkNode;
      const resourceType = request.resourceType ||
        request.redirectDestination?.resourceType;
      if (!linkableResourceTypes.has(resourceType)) {
        // We only link some resources to CPU nodes because we observe LCP simulation
        // regressions when including images, etc.
        return;
      }
      cpuNode.addDependent(networkNode);
    }

    /**
     * If the node has an associated frameId, then create a dependency on the root document request
     * for the frame. The task obviously couldn't have started before the frame was even downloaded.
     *
     * @param {CPUNode} cpuNode
     * @param {string|undefined} frameId
     */
    function addDependencyOnFrame(cpuNode, frameId) {
      if (!frameId) return;
      const networkNode = networkNodeOutput.frameIdToNodeMap.get(frameId);
      if (!networkNode) return;
      // Ignore all network nodes that started after this CPU task started
      // A network request that started after could not possibly be required this task
      if (networkNode.startTime >= cpuNode.startTime) return;
      cpuNode.addDependency(networkNode);
    }

    /** @param {CPUNode} cpuNode @param {string} url */
    function addDependencyOnUrl(cpuNode, url) {
      if (!url) return;
      // Allow network requests that end up to 100ms before the task started
      // Some script evaluations can start before the script finishes downloading
      const minimumAllowableTimeSinceNetworkNodeEnd = -100 * 1000;
      const candidates = networkNodeOutput.urlToNodeMap.get(url) || [];

      let minCandidate = null;
      let minDistance = Infinity;
      // Find the closest request that finished before this CPU task started
      for (const candidate of candidates) {
        // Explicitly ignore all requests that started after this CPU node
        // A network request that started after this task started cannot possibly be a dependency
        if (cpuNode.startTime <= candidate.startTime) return;

        const distance = cpuNode.startTime - candidate.endTime;
        if (distance >= minimumAllowableTimeSinceNetworkNodeEnd && distance < minDistance) {
          minCandidate = candidate;
          minDistance = distance;
        }
      }

      if (!minCandidate) return;
      cpuNode.addDependency(minCandidate);
    }

    /** @type {Map<string, CPUNode>} */
    const timers = new Map();
    for (const node of cpuNodes) {
      for (const evt of node.childEvents) {
        if (!evt.args.data) continue;

        const argsUrl = evt.args.data.url;
        const stackTraceUrls = (evt.args.data.stackTrace || []).map(l => l.url).filter(Boolean);

        switch (evt.name) {
          case 'TimerInstall':
            // @ts-expect-error - 'TimerInstall' event means timerId exists.
            timers.set(evt.args.data.timerId, node);
            stackTraceUrls.forEach(url => addDependencyOnUrl(node, url));
            break;
          case 'TimerFire': {
            // @ts-expect-error - 'TimerFire' event means timerId exists.
            const installer = timers.get(evt.args.data.timerId);
            if (!installer || installer.endTime > node.startTime) break;
            installer.addDependent(node);
            break;
          }

          case 'InvalidateLayout':
          case 'ScheduleStyleRecalculation':
            addDependencyOnFrame(node, evt.args.data.frame);
            stackTraceUrls.forEach(url => addDependencyOnUrl(node, url));
            break;

          case 'EvaluateScript':
            addDependencyOnFrame(node, evt.args.data.frame);
            // @ts-expect-error - 'EvaluateScript' event means argsUrl is defined.
            addDependencyOnUrl(node, argsUrl);
            stackTraceUrls.forEach(url => addDependencyOnUrl(node, url));
            break;

          case 'XHRReadyStateChange':
            // Only create the dependency if the request was completed
            // 'XHRReadyStateChange' event means readyState is defined.
            if (evt.args.data.readyState !== 4) break;

            // @ts-expect-error - 'XHRReadyStateChange' event means argsUrl is defined.
            addDependencyOnUrl(node, argsUrl);
            stackTraceUrls.forEach(url => addDependencyOnUrl(node, url));
            break;

          case 'FunctionCall':
          case 'v8.compile':
            addDependencyOnFrame(node, evt.args.data.frame);
            // @ts-expect-error - events mean argsUrl is defined.
            addDependencyOnUrl(node, argsUrl);
            break;

          case 'ParseAuthorStyleSheet':
            addDependencyOnFrame(node, evt.args.data.frame);
            // @ts-expect-error - 'ParseAuthorStyleSheet' event means styleSheetUrl is defined.
            addDependencyOnUrl(node, evt.args.data.styleSheetUrl);
            break;

          case 'ResourceSendRequest':
            addDependencyOnFrame(node, evt.args.data.frame);
            // @ts-expect-error - 'ResourceSendRequest' event means requestId is defined.
            addDependentNetworkRequest(node, evt.args.data.requestId);
            stackTraceUrls.forEach(url => addDependencyOnUrl(node, url));
            break;
        }
      }

      // Nodes starting before the root node cannot depend on it.
      if (node.getNumberOfDependencies() === 0 && node.canDependOn(rootNode)) {
        node.addDependency(rootNode);
      }
    }

    // Second pass to prune the graph of short tasks.
    const minimumEvtDur = SIGNIFICANT_DUR_THRESHOLD_MS * 1000;
    let foundFirstLayout = false;
    let foundFirstPaint = false;
    let foundFirstParse = false;

    for (const node of cpuNodes) {
      // Don't prune if event is the first ParseHTML/Layout/Paint.
      // See https://github.com/GoogleChrome/lighthouse/issues/9627#issuecomment-526699524 for more.
      let isFirst = false;
      if (!foundFirstLayout && node.childEvents.some(evt => evt.name === 'Layout')) {
        isFirst = foundFirstLayout = true;
      }
      if (!foundFirstPaint && node.childEvents.some(evt => evt.name === 'Paint')) {
        isFirst = foundFirstPaint = true;
      }
      if (!foundFirstParse && node.childEvents.some(evt => evt.name === 'ParseHTML')) {
        isFirst = foundFirstParse = true;
      }

      if (isFirst || node.duration >= minimumEvtDur) {
        // Don't prune this node. The task is long / important so it will impact simulation.
        continue;
      }

      // Prune the node if it isn't highly connected to minimize graph size. Rewiring the graph
      // here replaces O(M + N) edges with (M * N) edges, which is fine if either  M or N is at
      // most 1.
      if (node.getNumberOfDependencies() === 1 || node.getNumberOfDependents() <= 1) {
        PageDependencyGraph._pruneNode(node);
      }
    }
  }

  /**
   * Removes the given node from the graph, but retains all paths between its dependencies and
   * dependents.
   * @param {Node} node
   */
  static _pruneNode(node) {
    const dependencies = node.getDependencies();
    const dependents = node.getDependents();
    for (const dependency of dependencies) {
      node.removeDependency(dependency);
      for (const dependent of dependents) {
        dependency.addDependent(dependent);
      }
    }
    for (const dependent of dependents) {
      node.removeDependent(dependent);
    }
  }

  /**
   * TODO(15841): remove when CDT backend is gone. until then, this is a useful debugging tool
   * to find delta between using CDP or the trace to create the network requests.
   * 
   * When a test fails using the trace backend, I enabled this debug method and copied the network
   * requests when CDP was used, then when trace is used, and diff'd them. This method helped
   * remove non-logical differences from the comparison (order of properties, slight rounding
   * discrepancies, removing object cycles, etc).
   * 
   * When using for a unit test, make sure to do `.only` so you are getting what you expect.
   * @param {Lantern.NetworkRequest[]} lanternRequests
   * @return {never}
   */
  static _debugNormalizeRequests(lanternRequests) {
    for (const request of lanternRequests) {
      request.rendererStartTime = Math.round(request.rendererStartTime * 1000) / 1000;
      request.networkRequestTime = Math.round(request.networkRequestTime * 1000) / 1000;
      request.responseHeadersEndTime = Math.round(request.responseHeadersEndTime * 1000) / 1000;
      request.networkEndTime = Math.round(request.networkEndTime * 1000) / 1000;
    }

    for (const r of lanternRequests) {
      delete r.record;
      if (r.initiatorRequest) {
        // @ts-expect-error
        r.initiatorRequest = {id: r.initiatorRequest.requestId};
      }
      if (r.redirectDestination) {
        // @ts-expect-error
        r.redirectDestination = {id: r.redirectDestination.requestId};
      }
      if (r.redirectSource) {
        // @ts-expect-error
        r.redirectSource = {id: r.redirectSource.requestId};
      }
      if (r.redirects) {
        // @ts-expect-error
        r.redirects = r.redirects.map(r2 => r2.requestId);
      }
    }
    const requests = lanternRequests.map(r => ({
      requestId: r.requestId,
      connectionId: r.connectionId,
      connectionReused: r.connectionReused,
      url: r.url,
      protocol: r.protocol,
      parsedURL: r.parsedURL,
      documentURL: r.documentURL,
      rendererStartTime: r.rendererStartTime,
      networkRequestTime: r.networkRequestTime,
      responseHeadersEndTime: r.responseHeadersEndTime,
      networkEndTime: r.networkEndTime,
      transferSize: r.transferSize,
      resourceSize: r.resourceSize,
      fromDiskCache: r.fromDiskCache,
      fromMemoryCache: r.fromMemoryCache,
      finished: r.finished,
      statusCode: r.statusCode,
      redirectSource: r.redirectSource,
      redirectDestination: r.redirectDestination,
      redirects: r.redirects,
      failed: r.failed,
      initiator: r.initiator,
      timing: r.timing ? {
        requestTime: r.timing.requestTime,
        proxyStart: r.timing.proxyStart,
        proxyEnd: r.timing.proxyEnd,
        dnsStart: r.timing.dnsStart,
        dnsEnd: r.timing.dnsEnd,
        connectStart: r.timing.connectStart,
        connectEnd: r.timing.connectEnd,
        sslStart: r.timing.sslStart,
        sslEnd: r.timing.sslEnd,
        workerStart: r.timing.workerStart,
        workerReady: r.timing.workerReady,
        workerFetchStart: r.timing.workerFetchStart,
        workerRespondWithSettled: r.timing.workerRespondWithSettled,
        sendStart: r.timing.sendStart,
        sendEnd: r.timing.sendEnd,
        pushStart: r.timing.pushStart,
        pushEnd: r.timing.pushEnd,
        receiveHeadersStart: r.timing.receiveHeadersStart,
        receiveHeadersEnd: r.timing.receiveHeadersEnd,
      } : r.timing,
      resourceType: r.resourceType,
      mimeType: r.mimeType,
      priority: r.priority,
      initiatorRequest: r.initiatorRequest,
      frameId: r.frameId,
      fromWorker: r.fromWorker,
      isLinkPreload: r.isLinkPreload,
      serverResponseTime: r.serverResponseTime,
    })).filter(r => !r.fromWorker);
    // eslint-disable-next-line no-unused-vars
    const debug = requests;
    // Set breakpoint here.
    // Copy `debug` and compare with https://www.diffchecker.com/text-compare/
    process.exit(1);
  }

  /**
   * @param {LH.TraceEvent[]} mainThreadEvents
   * @param {Array<Lantern.NetworkRequest>} networkRecords
   * @param {URLArtifact} URL
   * @return {Node}
   */
  static createGraph(mainThreadEvents, networkRecords, URL) {
    // This is for debugging trace/devtoolslog network records.
    // const debug = PageDependencyGraph._debugNormalizeRequests(networkRecords);
    const networkNodeOutput = PageDependencyGraph.getNetworkNodeOutput(networkRecords);
    const cpuNodes = PageDependencyGraph.getCPUNodes(mainThreadEvents);
    const {requestedUrl, mainDocumentUrl} = URL;
    if (!requestedUrl) throw new Error('requestedUrl is required to get the root request');
    if (!mainDocumentUrl) throw new Error('mainDocumentUrl is required to get the main resource');

    const rootRequest = NetworkAnalyzer.findResourceForUrl(networkRecords, requestedUrl);
    if (!rootRequest) throw new Error('rootRequest not found');
    const rootNode = networkNodeOutput.idToNodeMap.get(rootRequest.requestId);
    if (!rootNode) throw new Error('rootNode not found');
    const mainDocumentRequest =
      NetworkAnalyzer.findLastDocumentForUrl(networkRecords, mainDocumentUrl);
    if (!mainDocumentRequest) throw new Error('mainDocumentRequest not found');
    const mainDocumentNode = networkNodeOutput.idToNodeMap.get(mainDocumentRequest.requestId);
    if (!mainDocumentNode) throw new Error('mainDocumentNode not found');

    PageDependencyGraph.linkNetworkNodes(rootNode, networkNodeOutput);
    PageDependencyGraph.linkCPUNodes(rootNode, networkNodeOutput, cpuNodes);
    mainDocumentNode.setIsMainDocument(true);

    if (NetworkNode.hasCycle(rootNode)) {
      throw new Error('Invalid dependency graph created, cycle detected');
    }

    return rootNode;
  }

  /**
   * @param {Lantern.NetworkRequest} record The record to find the initiator of
   * @param {Map<string, Lantern.NetworkRequest[]>} recordsByURL
   * @return {Lantern.NetworkRequest|null}
   */
  static chooseInitiatorRequest(record, recordsByURL) {
    if (record.redirectSource) {
      return record.redirectSource;
    }

    const initiatorURL = PageDependencyGraph.getNetworkInitiators(record)[0];
    let candidates = recordsByURL.get(initiatorURL) || [];
    // The (valid) initiator must come before the initiated request.
    candidates = candidates.filter(c => {
      return c.responseHeadersEndTime <= record.rendererStartTime &&
          c.finished && !c.failed;
    });
    if (candidates.length > 1) {
      // Disambiguate based on prefetch. Prefetch requests have type 'Other' and cannot
      // initiate requests, so we drop them here.
      const nonPrefetchCandidates = candidates.filter(
          cand => cand.resourceType !== RESOURCE_TYPES.Other);
      if (nonPrefetchCandidates.length) {
        candidates = nonPrefetchCandidates;
      }
    }
    if (candidates.length > 1) {
      // Disambiguate based on frame. It's likely that the initiator comes from the same frame.
      const sameFrameCandidates = candidates.filter(cand => cand.frameId === record.frameId);
      if (sameFrameCandidates.length) {
        candidates = sameFrameCandidates;
      }
    }
    if (candidates.length > 1 && record.initiator.type === 'parser') {
      // Filter to just Documents when initiator type is parser.
      const documentCandidates = candidates.filter(cand =>
        cand.resourceType === RESOURCE_TYPES.Document);
      if (documentCandidates.length) {
        candidates = documentCandidates;
      }
    }
    if (candidates.length > 1) {
      // If all real loads came from successful preloads (url preloaded and
      // loads came from the cache), filter to link rel=preload request(s).
      const linkPreloadCandidates = candidates.filter(c => c.isLinkPreload);
      if (linkPreloadCandidates.length) {
        const nonPreloadCandidates = candidates.filter(c => !c.isLinkPreload);
        const allPreloaded = nonPreloadCandidates.every(c => c.fromDiskCache || c.fromMemoryCache);
        if (nonPreloadCandidates.length && allPreloaded) {
          candidates = linkPreloadCandidates;
        }
      }
    }

    // Only return an initiator if the result is unambiguous.
    return candidates.length === 1 ? candidates[0] : null;
  }

  /**
   * @param {LH.Trace} trace
   * @return {Map<number, number[]>}
   */
  static _findServiceWorkerThreads(trace) {
    // TODO: trace engine should provide a map of service workers, like it does for workers.
    const serviceWorkerThreads = new Map();

    for (const event of trace.traceEvents) {
      if (!(event.name === 'thread_name' && event.args.name === 'ServiceWorker thread')) {
        continue;
      }

      const tids = serviceWorkerThreads.get(event.pid);
      if (tids) {
        tids.push(event.tid);
      } else {
        serviceWorkerThreads.set(event.pid, [event.tid]);
      }
    }

    return serviceWorkerThreads;
  }

  /**
   * @param {LH.Artifacts.TraceEngineResult} traceEngineResult
   * @param {Map<number, number[]>} serviceWorkerThreads
   * @param {import('@paulirish/trace_engine/models/trace/types/TraceEvents.js').SyntheticNetworkRequest} request
   * @return {Lantern.NetworkRequest=}
   */
  static _createLanternRequest(traceEngineResult, serviceWorkerThreads, request) {
    if (request.args.data.connectionId === undefined ||
        request.args.data.connectionReused === undefined) {
      throw new Error('Trace is too old');
    }

    let url;
    try {
      url = new URL(request.args.data.url);
    } catch (e) {
      return;
    }

    const parsedURL = {
      scheme: url.protocol.split(':')[0],
      // Intentional, DevTools uses different terminology
      host: url.hostname,
      securityOrigin: url.origin,
    };

    const timing = request.args.data.timing ? {
      ...request.args.data.timing,
      // These two timings are not included in the trace.
      workerFetchStart: -1,
      workerRespondWithSettled: -1,
    } : undefined;

    const networkRequestTime = timing ?
      timing.requestTime * 1000 :
      request.args.data.syntheticData.downloadStart / 1000;

    let fromWorker = false;
    // TODO: should also check pid
    if (traceEngineResult.data.Workers.workerIdByThread.has(request.tid)) {
      fromWorker = true;
    }
    const tids = serviceWorkerThreads.get(request.pid);
    if (tids?.includes(request.tid)) {
      fromWorker = true;
    }

    // `initiator` in the trace does not contain the stack trace for JS-initiated
    // requests. Instead, that is stored in the `stackTrace` property of the SyntheticNetworkRequest.
    // There are some minor differences in the fields, accounted for here.
    // Most importantly, there seems to be fewer frames in the trace than the equivalent
    // events over the CDP. This results in less accuracy in determining the initiator request,
    // which means less edges in the graph, which mean worse results. Should fix.
    /** @type {Lantern.NetworkRequest['initiator']} */
    const initiator = request.args.data.initiator ?? {type: 'other'};
    if (request.args.data.stackTrace) {
      const callFrames = request.args.data.stackTrace.map(f => {
        return {
          scriptId: String(f.scriptId),
          url: f.url,
          lineNumber: f.lineNumber - 1,
          columnNumber: f.columnNumber - 1,
          functionName: f.functionName,
        };
      });
      initiator.stack = {callFrames};
    }

    let resourceType = request.args.data.resourceType;
    if (request.args.data.initiator?.fetchType === 'xmlhttprequest') {
      // @ts-expect-error yes XHR is a valid ResourceType. TypeScript const enums are so unhelpful.
      resourceType = 'XHR';
    }

    return {
      requestId: request.args.data.requestId,
      connectionId: request.args.data.connectionId,
      connectionReused: request.args.data.connectionReused,
      url: request.args.data.url,
      protocol: request.args.data.protocol,
      parsedURL,
      documentURL: request.args.data.requestingFrameUrl,
      rendererStartTime: request.ts / 1000,
      networkRequestTime,
      responseHeadersEndTime: request.args.data.syntheticData.downloadStart / 1000,
      networkEndTime: request.args.data.syntheticData.finishTime / 1000,
      transferSize: request.args.data.encodedDataLength,
      resourceSize: request.args.data.decodedBodyLength,
      fromDiskCache: request.args.data.syntheticData.isDiskCached,
      fromMemoryCache: request.args.data.syntheticData.isMemoryCached,
      isLinkPreload: request.args.data.isLinkPreload,
      finished: request.args.data.finished,
      failed: request.args.data.failed,
      statusCode: request.args.data.statusCode,
      initiator,
      timing,
      resourceType,
      mimeType: request.args.data.mimeType,
      priority: request.args.data.priority,
      frameId: request.args.data.frame,
      fromWorker,
      record: request,
      // Set below.
      redirects: undefined,
      redirectSource: undefined,
      redirectDestination: undefined,
      initiatorRequest: undefined,
    };
  }

  /**
   *
   * @param {Lantern.NetworkRequest[]} lanternRequests
   */
  static _linkInitiators(lanternRequests) {
    /** @type {Map<string, Lantern.NetworkRequest[]>} */
    const requestsByURL = new Map();
    for (const request of lanternRequests) {
      const requests = requestsByURL.get(request.url) || [];
      requests.push(request);
      requestsByURL.set(request.url, requests);
    }

    for (const request of lanternRequests) {
      const initiatorRequest = PageDependencyGraph.chooseInitiatorRequest(request, requestsByURL);
      if (initiatorRequest) {
        request.initiatorRequest = initiatorRequest;
      }
    }
  }

  /**
   * @param {LH.TraceEvent[]} mainThreadEvents
   * @param {LH.Trace} trace
   * @param {LH.Artifacts.TraceEngineResult} traceEngineResult
   * @param {LH.Artifacts.URL} URL
   */
  static async createGraphFromTrace(mainThreadEvents, trace, traceEngineResult, URL) {
    const serviceWorkerThreads = this._findServiceWorkerThreads(trace);

    /** @type {Lantern.NetworkRequest[]} */
    const lanternRequests = [];
    for (const request of traceEngineResult.data.NetworkRequests.byTime) {
      const lanternRequest =
        this._createLanternRequest(traceEngineResult, serviceWorkerThreads, request);
      if (lanternRequest) {
        lanternRequests.push(lanternRequest);
      }
    }

    // TraceEngine consolidates all redirects into a single request object, but lantern needs
    // an entry for each redirected request.
    for (const request of [...lanternRequests]) {
      if (!request.record) continue;

      const redirects = request.record.args.data.redirects;
      if (!redirects.length) continue;

      const requestChain = [request];

      for (const redirect of redirects) {
        const redirectedRequest = structuredClone(request);
        redirectedRequest.rendererStartTime = redirect.ts / 1000;
        redirectedRequest.networkEndTime = (redirect.ts + redirect.dur) / 1000;
        redirectedRequest.url = redirect.url;
        requestChain.push(redirectedRequest);
        lanternRequests.push(redirectedRequest);
      }

      for (let i = 0; i < requestChain.length; i++) {
        const request = requestChain[i];
        if (i > 0) {
          request.redirectSource = requestChain[i - 1];
          request.redirects = requestChain.slice(0, i);
        }
        if (i !== requestChain.length - 1) {
          request.redirectDestination = requestChain[i + 1];
        }
      }

      // Apply the `:redirect` requestId convention: only redirects[0].requestId is the actual
      // requestId, all the rest have n occurences of `:redirect` as a suffix.
      requestChain.reverse();
      for (let i = 1; i < requestChain.length; i++) {
        requestChain[i].requestId = `${requestChain[i - 1].requestId}:redirect`;
      }
    }

    this._linkInitiators(lanternRequests);

    // This would already be sorted by rendererStartTime, if not for the redirect unwrapping done
    // above.
    lanternRequests.sort((a, b) => a.rendererStartTime - b.rendererStartTime);

    const graph = PageDependencyGraph.createGraph(mainThreadEvents, lanternRequests, URL);
    return {graph, records: lanternRequests};
  }

  /**
   *
   * @param {Node} rootNode
   */
  static printGraph(rootNode, widthInCharacters = 100) {
    /** @param {string} str @param {number} target */
    function padRight(str, target, padChar = ' ') {
      return str + padChar.repeat(Math.max(target - str.length, 0));
    }

    /** @type {Array<Node>} */
    const nodes = [];
    rootNode.traverse(node => nodes.push(node));
    nodes.sort((a, b) => a.startTime - b.startTime);

    const min = nodes[0].startTime;
    const max = nodes.reduce((max, node) => Math.max(max, node.endTime), 0);

    const totalTime = max - min;
    const timePerCharacter = totalTime / widthInCharacters;
    nodes.forEach(node => {
      const offset = Math.round((node.startTime - min) / timePerCharacter);
      const length = Math.ceil((node.endTime - node.startTime) / timePerCharacter);
      const bar = padRight('', offset) + padRight('', length, '=');

      // @ts-expect-error -- disambiguate displayName from across possible Node types.
      const displayName = node.request ? node.request.url : node.type;
      // eslint-disable-next-line
      console.log(padRight(bar, widthInCharacters), `| ${displayName.slice(0, 30)}`);
    });
  }
}

export {PageDependencyGraph};
