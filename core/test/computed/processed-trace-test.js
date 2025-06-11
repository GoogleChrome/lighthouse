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

    expect(processedTrace.processEvents.length).toEqual(118854);
    expect(processedTrace.mainThreadEvents.length).toEqual(55691);

    delete processedTrace.processEvents;
    delete processedTrace.mainThreadEvents;
    delete processedTrace.frameTreeEvents;
    delete processedTrace.frameEvents;
    delete processedTrace._keyEvents;

    expect(processedTrace).toMatchObject({
      mainFrameInfo: {
        frameId: '4445FED303BABCB702B8DAAA715B1202',
        startingPid: 87728,
      },
      timeOriginEvt: {
        args: {
          frame: '4445FED303BABCB702B8DAAA715B1202',
        },
        cat: 'blink.user_timing',
        name: 'navigationStart',
        ph: 'R',
        pid: 87730,
        tid: 259,
        ts: 376405981564,
        tts: 36028,
      },
      frames: [{
        id: '4445FED303BABCB702B8DAAA715B1202',
        url: 'https://squoosh.app/',
      }],
      timestamps: {
        timeOrigin: 376405981564,
        traceEnd: 376417286238,
      },
      timings: {
        timeOrigin: 0,
        traceEnd: 11304.674,
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
