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

    expect(processedTrace.processEvents.length).toEqual(30050);
    expect(processedTrace.mainThreadEvents.length).toEqual(14970);

    delete processedTrace.processEvents;
    delete processedTrace.mainThreadEvents;
    delete processedTrace.frameTreeEvents;
    delete processedTrace.frameEvents;
    delete processedTrace._keyEvents;

    expect(processedTrace).toMatchObject({
      mainFrameInfo: {
        frameId: 'B252105E12E98AFD5BC5DCC4D6F4813F',
        startingPid: 13956,
      },
      timeOriginEvt: {
        args: {
          frame: 'B252105E12E98AFD5BC5DCC4D6F4813F',
        },
        cat: 'blink.user_timing',
        name: 'navigationStart',
        ph: 'R',
        pid: 13958,
        tid: 259,
        ts: 350560155528,
        tts: 34613,
      },
      frames: [{
        id: 'B252105E12E98AFD5BC5DCC4D6F4813F',
        url: 'https://squoosh.app/',
      }],
      timestamps: {
        timeOrigin: 350560155528,
        traceEnd: 350562869197,
      },
      timings: {
        timeOrigin: 0,
        traceEnd: 2713.669,
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
