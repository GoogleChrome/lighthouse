/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/** @typedef {import('./lantern/lantern.js').Simulation.CompleteNodeTiming} CompleteNodeTiming */

/**
 * @param {Map<LH.Gatherer.Simulation.GraphNode, CompleteNodeTiming>} nodeTimings
 * @return {LH.Trace}
 */
function convertNodeTimingsToTrace(nodeTimings) {
  /** @type {LH.TraceEvent[]} */
  const traceEvents = [];
  const baseTs = 1e9;
  const baseEvent = {pid: 1, tid: 1, cat: 'devtools.timeline'};
  const frame = 'A00001';
  /** @param {number} ms */
  const toMicroseconds = ms => baseTs + ms * 1000;

  traceEvents.push(createFakeTracingStartedEvent());
  traceEvents.push({...createFakeTracingStartedEvent(), name: 'TracingStartedInBrowser'});

  // Create a fake requestId counter
  let requestId = 1;
  let lastEventEndTime = 0;
  for (const [node, timing] of nodeTimings.entries()) {
    lastEventEndTime = Math.max(lastEventEndTime, timing.endTime);
    if (node.type === 'cpu') {
      // Represent all CPU work that was bundled in a task as an EvaluateScript event
      traceEvents.push(...createFakeTaskEvents(node, timing));
    } else {
      /** @type {LH.Artifacts.NetworkRequest} */
      const record = node.rawRequest;
      // Ignore data URIs as they don't really add much value
      if (/^data/.test(record.url)) continue;
      traceEvents.push(...createFakeNetworkEvents(requestId, record, timing));
      requestId++;
    }
  }

  // Create a fake task event ~1s after the trace ends for a sane default bounds in DT
  traceEvents.push(
    ...createFakeTaskEvents(
      // @ts-expect-error
      {childEvents: [], event: {}},
      {
        startTime: lastEventEndTime + 1000,
        endTime: lastEventEndTime + 1001,
      }
    )
  );

  return {traceEvents};

  /**
   * @return {LH.TraceEvent}
   */
  function createFakeTracingStartedEvent() {
    const argsData = {
      frameTreeNodeId: 1,
      sessionId: '1.1',
      page: frame,
      persistentIds: true,
      frames: [{frame, url: 'about:blank', name: '', processId: 1}],
    };

    return {
      ...baseEvent,
      ts: baseTs - 1e5,
      ph: 'I',
      s: 't',
      cat: 'disabled-by-default-devtools.timeline',
      name: 'TracingStartedInPage',
      args: {data: argsData},
      dur: 0,
    };
  }

  /**
   * @param {LH.Gatherer.Simulation.GraphCPUNode} cpuNode
   * @param {{startTime: number, endTime: number}} timing
   * @return {LH.TraceEvent[]}
   */
  function createFakeTaskEvents(cpuNode, timing) {
    const argsData = {
      url: '',
      frame,
      lineNumber: 0,
      columnNumber: 0,
    };

    const eventTs = toMicroseconds(timing.startTime);

    /** @type {LH.TraceEvent[]} */
    const events = [
      {
        ...baseEvent,
        ph: 'X',
        name: 'Task',
        ts: eventTs,
        dur: (timing.endTime - timing.startTime) * 1000,
        args: {data: argsData},
      },
    ];

    const nestedBaseTs = cpuNode.event.ts || 0;
    const multiplier = (timing.endTime - timing.startTime) * 1000 / cpuNode.event.dur;
    // https://github.com/ChromeDevTools/devtools-frontend/blob/5429ac8a61ad4fa/front_end/timeline_model/TimelineModel.js#L1129-L1130
    const netReqEvents = new Set(['ResourceSendRequest', 'ResourceFinish',
      'ResourceReceiveResponse', 'ResourceReceivedData']);
    for (const event of cpuNode.childEvents) {
      if (netReqEvents.has(event.name)) continue;
      const ts = eventTs + (event.ts - nestedBaseTs) * multiplier;
      const newEvent = {...event, ...{pid: baseEvent.pid, tid: baseEvent.tid}, ts};
      if (event.dur) newEvent.dur = event.dur * multiplier;
      events.push(/** @type {LH.TraceEvent} */(newEvent));
    }

    return events;
  }

  /**
   * @param {number} requestId
   * @param {LH.Artifacts.NetworkRequest} record
   * @param {CompleteNodeTiming} timing
   * @return {LH.TraceEvent}
   */
  function createWillSendRequestEvent(requestId, record, timing) {
    return {
      ...baseEvent,
      ph: 'I',
      s: 't',
      // No `dur` on network instant events but add to keep types happy.
      dur: 0,
      name: 'ResourceWillSendRequest',
      ts: toMicroseconds(timing.startTime),
      args: {data: {requestId: String(requestId)}},
    };
  }

  /**
   * @param {number} requestId
   * @param {LH.Artifacts.NetworkRequest} record
   * @param {CompleteNodeTiming} timing
   * @return {LH.TraceEvent[]}
   */
  function createFakeNetworkEvents(requestId, record, timing) {
    if (!('connectionTiming' in timing)) {
      throw new Error('Network node timing incomplete');
    }

    // 0ms requests get super-messed up rendering
    // Use 0.3ms instead so they're still hoverable, https://github.com/GoogleChrome/lighthouse/pull/5350#discussion_r194563201
    let {startTime, endTime} = timing;
    if (startTime === endTime) endTime += 0.3;

    const requestData = {requestId: requestId.toString(), frame};
    // No `dur` on network instant events but add to keep types happy.
    /** @type {LH.Util.StrictOmit<LH.TraceEvent, 'name'|'ts'|'args'>} */
    const baseRequestEvent = {...baseEvent, ph: 'I', s: 't', dur: 0};

    const sendRequestData = {
      ...requestData,
      requestMethod: record.requestMethod,
      url: record.url,
      priority: record.priority,
    };

    const {dnsResolutionTime, connectionTime, sslTime, timeToFirstByte} = timing.connectionTiming;
    let sslStart = -1;
    let sslEnd = -1;
    if (connectionTime !== undefined && sslTime !== undefined) {
      sslStart = connectionTime - sslTime;
      sslEnd = connectionTime;
    }
    const receiveResponseData = {
      ...requestData,
      statusCode: record.statusCode,
      mimeType: record.mimeType,
      encodedDataLength: record.transferSize,
      fromCache: record.fromDiskCache,
      fromServiceWorker: record.fetchedViaServiceWorker,
      timing: {
        // `requestTime` is in seconds.
        requestTime: toMicroseconds(startTime) / (1000 * 1000),
        // Remaining values are milliseconds after `requestTime`.
        dnsStart: dnsResolutionTime === undefined ? -1 : 0,
        dnsEnd: dnsResolutionTime ?? -1,
        connectStart: dnsResolutionTime ?? -1,
        connectEnd: connectionTime ?? -1,
        sslStart,
        sslEnd,
        sendStart: connectionTime ?? 0,
        sendEnd: connectionTime ?? 0,
        receiveHeadersEnd: timeToFirstByte,
        workerStart: -1,
        workerReady: -1,
        proxyStart: -1,
        proxyEnd: -1,
        pushStart: 0,
        pushEnd: 0,
      },
    };

    const resourceFinishData = {
      requestId: requestId.toString(),
      encodedDataLength: record.transferSize,
      decodedBodyLength: record.resourceSize,
      didFail: !!record.failed,
      finishTime: toMicroseconds(endTime) / (1000 * 1000),
    };

    /** @type {LH.TraceEvent[]} */
    const events = [];

    // Navigation request needs an additional ResourceWillSendRequest event.
    if (requestId === 1) {
      events.push(createWillSendRequestEvent(requestId, record, timing));
    }

    events.push(
      {
        ...baseRequestEvent,
        name: 'ResourceSendRequest',
        ts: toMicroseconds(startTime),
        args: {data: sendRequestData},
      },
      {
        ...baseRequestEvent,
        name: 'ResourceFinish',
        ts: toMicroseconds(endTime),
        args: {data: resourceFinishData},
      }
    );

    if (!record.failed) {
      events.push({
        ...baseRequestEvent,
        name: 'ResourceReceiveResponse',
        // Event `ts` isn't meaningful, so just pick a time.
        ts: toMicroseconds((startTime + endTime) / 2),
        args: {data: receiveResponseData},
      });
    }

    return events;
  }
}

export default {
  simulationNamesToIgnore: [
    'unlabeled',
    // These node timings should be nearly identical to the ones produced for Interactive
    'optimisticSpeedIndex',
    'pessimisticSpeedIndex',
  ],
  convertNodeTimingsToTrace,
};
