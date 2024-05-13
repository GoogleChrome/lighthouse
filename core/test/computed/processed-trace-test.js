/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {ProcessedTrace} from '../../computed/processed-trace.js';
import {readJson} from '../test-utils.js';

const pwaTrace = readJson('../fixtures/artifacts/progressive-app/trace.json', import.meta);

describe('ProcessedTrace', () => {
  it('computes the artifact', async () => {
    const context = {computedCache: new Map()};
    const processedTrace = await ProcessedTrace.request(pwaTrace, context);

    expect(processedTrace.processEvents.length).toEqual(12865);
    expect(processedTrace.mainThreadEvents.length).toEqual(7629);

    delete processedTrace.processEvents;
    delete processedTrace.mainThreadEvents;
    delete processedTrace.frameTreeEvents;
    delete processedTrace.frameEvents;
    delete processedTrace._keyEvents;

    expect(processedTrace).toMatchObject({
      mainFrameInfo: {
        frameId: '0x25a638821e30',
        startingPid: 44277,
      },
      timeOriginEvt: {
        args: {
          frame: '0x25a638821e30',
        },
        cat: 'blink.user_timing',
        name: 'navigationStart',
        ph: 'R',
        pid: 44277,
        tid: 775,
        ts: 225414172015,
        tts: 455539,
      },
      frames: [],
      timestamps: {
        timeOrigin: 225414172015,
        traceEnd: 225426711887,
      },
      timings: {
        timeOrigin: 0,
        traceEnd: 12539.872,
      },
    });
  });

  it('fails with NO_TRACING_STARTED', async () => {
    const context = {computedCache: new Map()};
    const noTracingStartedTrace = {
      traceEvents: pwaTrace.traceEvents.filter(event => {
        if (event.name === 'TracingStartedInBrowser' ||
            event.name === 'TracingStartedInPage' ||
            event.name === 'ResourceSendRequest') {
          return false;
        }

        return true;
      }),
    };

    await expect(ProcessedTrace.request(noTracingStartedTrace, context))
      .rejects.toMatchObject({code: 'NO_TRACING_STARTED'});
  });
});
