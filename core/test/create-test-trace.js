/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {getNormalizedRequestTiming} from './network-records-to-devtools-log.js';

const pid = 1111;
const tid = 222;
const browserPid = 13725;
const rootFrame = 'ROOT_FRAME';
const navigationId = 'NAVIGATION_ID';
const defaultUrl = 'https://example.com/';
const lcpNodeId = 16;
const lcpImageUrl = 'http://www.example.com/image.png';

/** @typedef {import('../lib/network-request.js').NetworkRequest} NetworkRequest */
/** @typedef {{ts: number, duration: number, children?: Array<ChildTaskDef>}} TopLevelTaskDef */
/** @typedef {{ts: number, duration: number, url: string | undefined, eventName?: string}} ChildTaskDef */
/** @typedef {{frame: string}} ChildFrame */
/**
 * @typedef TraceOptions
 * @property {string} [frameUrl]
 * @property {number} [timeOrigin]
 * @property {number} [largestContentfulPaint]
 * @property {number} [firstContentfulPaint]
 * @property {number} [traceEnd]
 * @property {Array<TopLevelTaskDef>} [topLevelTasks]
 * @property {Array<ChildFrame>} [childFrames] Add a child frame with a known `frame` id for easy insertion of child frame events.
 * @property {Array<NetworkRequest>=} networkRecords
 */

/**
 * @param {TopLevelTaskDef} options
 * @return {LH.TraceEvent}
 */
function getTopLevelTask({ts, duration}) {
  return {
    name: 'RunTask',
    ts: ts * 1000,
    dur: duration * 1000,
    pid,
    tid,
    ph: 'X',
    cat: 'disabled-by-default-devtools.timeline',
    args: {},
  };
}

/**
 * @param {ChildTaskDef} options
 * @return {LH.TraceEvent}
 */
function getChildTask({ts, duration, url, eventName}) {
  return {
    name: eventName ?? 'FunctionCall',
    ts: ts * 1000,
    dur: duration * 1000,
    pid,
    tid,
    ph: 'X',
    cat: 'devtools.timeline',
    args: {
      data: {
        url,
        functionName: 'fakeFunction',
      },
    },
  };
}

/**
 * Creates a simple trace that fits the desired options. Useful for basic trace
 * generation, e.g a trace that will result in particular long-task quiet
 * periods. Input times should be in milliseconds.
 * @param {TraceOptions} options
 * @return {{traceEvents: LH.TraceEvent[]}}
 */
function createTestTrace(options) {
  const frameUrl = options.frameUrl ?? defaultUrl;
  const timeOrigin = (options.timeOrigin || 0) * 1000;

  /** @type {LH.TraceEvent[]} */
  const traceEvents = [{
    name: 'TracingStartedInBrowser',
    ts: timeOrigin,
    pid: browserPid,
    tid,
    ph: 'I',
    cat: 'disabled-by-default-devtools.timeline',
    dur: 0,
    args: {
      data: {
        frameTreeNodeId: 6,
        persistentIds: true,
        frames: [{frame: rootFrame, url: 'about:blank', name: '', processId: pid}],
      },
    },
    s: 't',
  }, {
    name: 'navigationStart',
    ts: timeOrigin,
    pid,
    tid,
    ph: 'R',
    cat: 'blink.user_timing',
    dur: 0,
    args: {
      frame: rootFrame,
      data: {
        documentLoaderURL: frameUrl,
        isLoadingMainFrame: true,
        navigationId,
      },
    },
  }, {
    // Needed to identify main thread for TracingStartedInBrowser.
    name: 'thread_name',
    ts: timeOrigin,
    pid,
    tid,
    ph: 'M',
    cat: '__metadata',
    dur: 0,
    args: {name: 'CrRendererMain'},
  }, {
    // Used for identifying frame tree.
    name: 'FrameCommittedInBrowser',
    ts: timeOrigin,
    pid: browserPid,
    tid,
    ph: 'I',
    cat: 'disabled-by-default-devtools.timeline',
    dur: 0,
    args: {
      data: {frame: rootFrame, url: frameUrl, name: '', processId: pid},
    },
  }, {
    name: 'domContentLoadedEventEnd',
    ts: timeOrigin + 10,
    pid,
    tid,
    ph: 'R',
    cat: 'blink.user_timing,rail',
    dur: 0,
    args: {frame: rootFrame},
  }, {
    name: 'firstContentfulPaint',
    ts: options.firstContentfulPaint ? options.firstContentfulPaint * 1000 : timeOrigin + 10,
    pid,
    tid,
    ph: 'R',
    cat: 'loading,rail,devtools.timeline',
    dur: 0,
    args: {frame: rootFrame, data: {navigationId}},
  }];

  if (options.childFrames) {
    for (const childFrame of options.childFrames) {
      traceEvents.push({
        name: 'FrameCommittedInBrowser',
        ts: timeOrigin + 20,
        pid: browserPid,
        tid,
        ph: 'I',
        cat: 'disabled-by-default-devtools.timeline',
        dur: 0,
        args: {
          data: {
            frame: childFrame.frame,
            parent: rootFrame,
            url: `${frameUrl}${childFrame.frame}`,
            name: '',
            processId: pid,
          },
        },
      });
    }
  }

  if (options.largestContentfulPaint) {
    traceEvents.push({
      name: 'largestContentfulPaint::Candidate',
      ts: options.largestContentfulPaint * 1000,
      pid,
      tid,
      ph: 'R',
      cat: 'loading,rail,devtools.timeline',
      dur: 0,
      args: {
        frame: rootFrame,
        data: {
          isMainFrame: true,
          nodeId: lcpNodeId,
          size: 50,
          type: 'image',
          navigationId,
          candidateIndex: 1,
        },
      },
    });

    traceEvents.push({
      name: 'LargestImagePaint::Candidate',
      ts: options.largestContentfulPaint * 1000,
      pid,
      tid,
      ph: 'R',
      cat: 'loading',
      dur: 0,
      args: {
        frame: rootFrame,
        data: {
          DOMNodeId: lcpNodeId,
          size: 50,
          imageUrl: lcpImageUrl,
          candidateIndex: 1,
        },
      },
    });
  }

  if (options.topLevelTasks) {
    for (const task of options.topLevelTasks) {
      traceEvents.push(getTopLevelTask(task));
      if (task.children?.length) {
        for (const child of task.children) {
          traceEvents.push(getChildTask(child));
        }
      }
    }
  }

  if (options.traceEnd) {
    // Insert a top level short task to extend trace to requested end.
    traceEvents.push(getTopLevelTask({ts: options.traceEnd - 1, duration: 1}));
  }

  const networkRecords = options.networkRecords || [];
  for (const record of networkRecords) {
    // `requestId` is optional in the input test records.
    const requestId = record.requestId ?
      record.requestId.replaceAll(':redirect', '') :
      String(networkRecords.indexOf(record));

    let willBeRedirected = false;
    if (record.requestId) {
      const redirectedRequestId = record.requestId + ':redirect';
      willBeRedirected = networkRecords.some(r => r.requestId === redirectedRequestId);
    }

    const times = getNormalizedRequestTiming(record);
    const willSendTime = times.rendererStartTime * 1000;
    const sendTime = times.networkRequestTime * 1000;
    const recieveResponseTime = times.responseHeadersEndTime * 1000;
    const endTime = times.networkEndTime * 1000;

    if (times.timing.receiveHeadersStart === undefined) {
      times.timing.receiveHeadersStart = times.timing.receiveHeadersEnd;
    }

    if (!willBeRedirected) {
      traceEvents.push({
        name: 'ResourceWillSendRequest',
        ts: willSendTime,
        pid,
        tid,
        ph: 'I',
        cat: 'devtools.timeline',
        dur: 0,
        args: {
          data: {
            requestId,
            frame: record.frameId,
          },
        },
      });
    }

    traceEvents.push({
      name: 'ResourceSendRequest',
      ts: sendTime,
      pid,
      tid,
      ph: 'I',
      cat: 'devtools.timeline',
      dur: 0,
      args: {
        data: {
          requestId,
          frame: record.frameId,
          initiator: record.initiator ?? {type: 'other'},
          priority: record.priority,
          requestMethod: record.requestMethod,
          resourceType: record.resourceType ?? 'Document',
          url: record.url,
        },
      },
    });

    if (willBeRedirected) {
      continue;
    }

    traceEvents.push({
      name: 'ResourceReceiveResponse',
      ts: recieveResponseTime,
      pid,
      tid,
      ph: 'I',
      cat: 'devtools.timeline',
      dur: 0,
      args: {
        data: {
          requestId,
          frame: record.frameId,
          fromCache: record.fromDiskCache || record.fromMemoryCache,
          fromServiceWorker: record.fromWorker,
          mimeType: record.mimeType ?? 'text/html',
          statusCode: record.statusCode ?? 200,
          timing: times.timing,
          connectionId: record.connectionId ?? 140,
          connectionReused: record.connectionReused ?? false,
          protocol: record.protocol ?? 'http/1.1',
        },
      },
    });

    traceEvents.push({
      name: 'ResourceFinish',
      ts: endTime,
      pid,
      tid,
      ph: 'I',
      cat: 'devtools.timeline',
      dur: 0,
      args: {
        data: {
          requestId,
          frame: record.frameId,
          finishTime: endTime / 1000 / 1000,
          encodedDataLength: record.transferSize ?? 0,
          decodedBodyLength: record.resourceSize ?? 0,
        },
      },
    });
  }

  return {
    traceEvents,
  };
}

export {
  createTestTrace,
  rootFrame,
};
