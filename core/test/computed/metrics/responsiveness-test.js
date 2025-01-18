/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import {Responsiveness} from '../../../computed/metrics/responsiveness.js';
import {createTestTrace} from '../../create-test-trace.js';
import {readJson} from '../../test-utils.js';

const interactionTrace = readJson('../../fixtures/traces/timespan-responsiveness-m103.trace.json', import.meta);
const noInteractionTrace = readJson('../../fixtures/traces/frame-metrics-m89.json', import.meta);

const childFrameId = 'CAF4634127666E186C9C8B35627DBF0B';

/**
 * @param {Array<{maxDuration: number, ts: number, interactionType?: 'keyboard'|'tapOrClick', inChildFrame?: boolean}>} interactionEventsData
 */
function makeTrace(interactionEventsData) {
  let needsChildFrame = false;
  let lastTs = 0;
  for (const evtData of interactionEventsData) {
    if (evtData.inChildFrame) needsChildFrame = true;
    lastTs = Math.max(lastTs, evtData.ts);
  }

  // If there are non-mainFrame events, create a child frame in trace to add those events to.
  const childFrames = needsChildFrame ? [{frame: childFrameId}] : [];
  const trace = createTestTrace({traceEnd: lastTs + 10_000, childFrames});

  const navigationStartEvt = trace.traceEvents.find(e => e.name === 'navigationStart');
  assert(navigationStartEvt?.args?.frame);
  const mainFrameId = navigationStartEvt.args.frame;
  const {pid, tid} = navigationStartEvt;

  /** @type {Array<LH.TraceEvent>} */
  const interactionEvents = interactionEventsData.flatMap((data, index) => {
    const {
      maxDuration,
      ts,
      interactionType = 'keyboard',
      inChildFrame = false,
    } = data;

    const frame = inChildFrame ? childFrameId : mainFrameId;
    const interactionTimeStamp = (ts - navigationStartEvt.ts) / 1000;

    return [{
      name: 'Responsiveness.Renderer.UserInteraction',
      cat: 'devtools.timeline',
      ph: 'X',
      pid,
      tid,
      ts: ts,
      tts: ts,
      dur: 14,
      tdur: 14,
      args: {
        frame,
        data: {
          interactionType,
          maxDuration,
        },
      },
    }, {
      // TODO(bckenny): dynamically add all events for an interaction.
      name: 'EventTiming',
      cat: 'devtools.timeline',
      ph: 'b',
      pid,
      tid,
      ts: ts,
      id: `0x${(415583518 + index).toString(16)}`,
      scope: 'devtools.timeline',
      args: {
        data: {
          frame,
          timeStamp: interactionTimeStamp,
          processingStart: interactionTimeStamp + Math.floor(maxDuration / 3),
          processingEnd: interactionTimeStamp + Math.floor(2 * maxDuration / 3),
          duration: maxDuration,
          nodeId: 1,
          type: interactionType === 'keyboard' ? 'keydown' : 'pointerup',
          interactionId: 1,
        },
      },
    }];
  });

  trace.traceEvents.push(...interactionEvents);
  return trace;
}

describe('Metric: Responsiveness', () => {
  it('should return null if there were no interactions', async () => {
    const metricInputData = {
      trace: makeTrace([]),
      settings: {throttlingMethod: 'provided'},
    };
    const context = {computedCache: new Map()};
    const event = await Responsiveness.request(metricInputData, context);
    expect(event).toEqual(null);
  });

  it('should select the 98th percentile interaction', async () => {
    for (let eventCount = 1; eventCount < 601; eventCount++) {
      const interactionEvents = [];
      for (let i = 0; i < eventCount; i++) {
        interactionEvents.push({
          ts: i * (i + 3) / 2, // End of the last event + 1ms.
          maxDuration: i + 1, // Identify events by unique maxDuration.
        });
      }
      const metricInputData = {
        trace: makeTrace(interactionEvents),
        settings: {throttlingMethod: 'provided'},
      };

      // For a list labeled 1-n, result will be `Math.ceil(0.98 * n)`th element
      // until n > 500, when it becomes capped at the 10th worst duration.
      let expectedTiming = Math.ceil(0.98 * eventCount);
      if (eventCount >= 500) {
        expectedTiming = eventCount - 9;
      }

      const context = {computedCache: new Map()};
      const event = await Responsiveness.request(metricInputData, context);
      assert.equal(event.args.data.duration, expectedTiming, `error at ${eventCount} events`);
    }
  });

  it('should consider interaction events across the frame tree', async () => {
    const interactionEvents = [];
    for (let i = 0; i < 50; i++) {
      const maxDuration = i + 1;
      interactionEvents.push({
        ts: i * 100,
        maxDuration,
        inChildFrame: Boolean(maxDuration % 2),
      });
    }

    const trace = makeTrace(interactionEvents);
    // Ensure the high-percentile responsiveness event is where it's expected.
    const targetEvent = trace.traceEvents.find(evt => {
      return evt.name === 'Responsiveness.Renderer.UserInteraction' &&
          evt.args.data?.maxDuration === 49;
    });
    expect(targetEvent?.args.frame).toEqual(childFrameId);

    const metricInputData = {
      trace,
      settings: {throttlingMethod: 'provided'},
    };
    const context = {computedCache: new Map()};
    const event = await Responsiveness.request(metricInputData, context);
    expect(event.args.data).toMatchObject({duration: 49, frame: childFrameId});
  });

  it('throws on attempting with a simulated timespan', async () => {
    const metricInputData = {
      trace: makeTrace([]),
      settings: {throttlingMethod: 'simulate'},
    };
    await expect(Responsiveness.request(metricInputData, {computedCache: new Map()}))
      .rejects.toThrow();
  });

  it('throws if there are Responsiveness events but no EventTiming events', async () => {
    const interactionEvents = [{
      ts: 500,
      maxDuration: 200,
    }];
    const trace = makeTrace(interactionEvents);
    trace.traceEvents = trace.traceEvents.filter(e => e.name !== 'EventTiming');

    const metricInputData = {
      trace,
      settings: {throttlingMethod: 'provided'},
    };
    await expect(Responsiveness.request(metricInputData, {computedCache: new Map()}))
      .rejects.toThrow(`no interaction event found for responsiveness type 'keyboard'`);
  });

  it('throws if there are Responsiveness events but no EventTiming of matching type', async () => {
    const trace = makeTrace([{
      ts: 500,
      maxDuration: 200,
    }]);
    const interactionEvents = trace.traceEvents.filter(e => e.name === 'EventTiming');
    assert(interactionEvents.length > 0);
    for (const event of interactionEvents) {
      event.args.data.type = 'pointerdown';
    }

    const metricInputData = {
      trace,
      settings: {throttlingMethod: 'provided'},
    };
    await expect(Responsiveness.request(metricInputData, {computedCache: new Map()}))
      .rejects.toThrow(`no interaction event found for responsiveness type 'keyboard'`);
  });

  it('throws if there are no EventTiming events within 5ms of maxDuration', async () => {
    const trace = makeTrace([{
      ts: 500,
      maxDuration: 200,
    }]);
    const interactionEvents = trace.traceEvents.filter(e => e.name === 'EventTiming');
    assert(interactionEvents.length > 0);
    for (const event of interactionEvents) {
      event.args.data.duration = 500;
    }

    const metricInputData = {
      trace,
      settings: {throttlingMethod: 'provided'},
    };
    await expect(Responsiveness.request(metricInputData, {computedCache: new Map()}))
      .rejects.toThrow('no interaction event found within 5ms of responsiveness maxDuration (max: 200, closest 500)'); // eslint-disable-line max-len
  });

  it('throws if responsiveness event is of unexpected interactionType', async () => {
    const interactionEvents = [{
      ts: 500,
      maxDuration: 200,
      interactionType: 'brainWave',
    }];

    const metricInputData = {
      trace: makeTrace(interactionEvents),
      settings: {throttlingMethod: 'provided'},
    };
    await expect(Responsiveness.request(metricInputData, {computedCache: new Map()}))
      .rejects.toThrow(`unexpected responsiveness interactionType 'brainWave'`);
  });

  it('only finds interaction events from the same frame as the responsiveness event', async () => {
    const maxDuration = 200;
    const interactionEvents = [{
      ts: 500,
      maxDuration,
    }];
    const trace = makeTrace(interactionEvents);
    const interactionEvent = trace.traceEvents.find(e => {
      return e.name === 'EventTiming' && e.args.data.duration === maxDuration;
    });
    assert(interactionEvent);
    const clonedInteractionEvent = JSON.parse(JSON.stringify(interactionEvent));

    // Move original event to another frame.
    interactionEvent.args.data.frame = 'ANEWFRAMEID';

    // Make clonedEvent 1ms different in duration so it wouldn't be selected over original.
    clonedInteractionEvent.args.data.duration += 1;
    clonedInteractionEvent.args.data.nodeId = 55;
    trace.traceEvents.push(clonedInteractionEvent);

    const metricInputData = {
      trace,
      settings: {throttlingMethod: 'provided'},
    };
    const event = await Responsiveness.request(metricInputData, {computedCache: new Map()});
    expect(event.args.data).toMatchObject({
      duration: maxDuration + 1,
      nodeId: 55,
    });
  });

  it('only finds interaction events of types compatible with responsiveness event', async () => {
    const maxDuration = 200;
    const interactionEvents = [{
      ts: 500,
      maxDuration,
    }];
    const trace = makeTrace(interactionEvents);
    const interactionEvent = trace.traceEvents.find(e => {
      return e.name === 'EventTiming' && e.args.data.duration === maxDuration;
    });
    assert(interactionEvent);
    const clonedInteractionEvent = JSON.parse(JSON.stringify(interactionEvent));

    // Make original event a mouse event.
    interactionEvent.args.data.type = 'mousedown';

    // Make clonedEvent 1ms different in duration so it wouldn't be selected over original.
    clonedInteractionEvent.args.data.duration += 1;
    clonedInteractionEvent.args.data.nodeId = 55;
    trace.traceEvents.push(clonedInteractionEvent);

    const metricInputData = {
      trace,
      settings: {throttlingMethod: 'provided'},
    };
    const event = await Responsiveness.request(metricInputData, {computedCache: new Map()});
    expect(event.args.data).toMatchObject({
      duration: maxDuration + 1,
      nodeId: 55,
    });
  });

  it('selects the closest interaction duration to responsiveness maxDuration', async () => {
    const maxDuration = 200;
    const interactionEvents = [{
      ts: 500,
      maxDuration,
    }];
    const trace = makeTrace(interactionEvents);
    const interactionEvent = trace.traceEvents.find(e => {
      return e.name === 'EventTiming' && e.args.data.duration === maxDuration;
    });
    assert(interactionEvent);
    const clonedInteractionEvent = JSON.parse(JSON.stringify(interactionEvent));

    // Invalidate original event.
    interactionEvent.args.data.type = 'notApplicable';

    // Closest is maxDuration - 1.
    for (const offset of [-4, -2, -1, 2, 3]) {
      const newClone = JSON.parse(JSON.stringify(clonedInteractionEvent));
      newClone.args.data.duration = maxDuration + offset;
      newClone.args.data.nodeId = offset;
      trace.traceEvents.push(newClone);
    }

    const metricInputData = {
      trace,
      settings: {throttlingMethod: 'provided'},
    };
    const event = await Responsiveness.request(metricInputData, {computedCache: new Map()});
    expect(event.args.data).toMatchObject({
      duration: maxDuration - 1,
      nodeId: -1,
    });
  });

  it('evaluates from a real trace', async () => {
    const metricInputData = {
      trace: interactionTrace,
      settings: {throttlingMethod: 'provided'},
    };
    const context = {computedCache: new Map()};
    const event = await Responsiveness.request(metricInputData, context);
    expect(event).toMatchObject({
      name: 'EventTiming',
      ts: 633282566296,
      args: {
        data: {
          timeStamp: 5646,
          duration: 368,
          frame: '2F500B02691F5A39562731E977A0202C',
          type: 'mousedown',
        },
      },
    });
  });

  it('evaluates from a real trace with no interaction events', async () => {
    const metricInputData = {
      trace: noInteractionTrace,
      settings: {throttlingMethod: 'provided'},
    };
    const context = {computedCache: new Map()};
    const event = await Responsiveness.request(metricInputData, context);
    expect(event).toEqual(null);
  });
});
