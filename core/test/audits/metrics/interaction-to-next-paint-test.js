/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import InteractionToNextPaint from '../../../audits/metrics/interaction-to-next-paint.js';
import {readJson} from '../../test-utils.js';

const interactionTrace = readJson('../../fixtures/traces/timespan-responsiveness-m103.trace.json', import.meta);
const noInteractionTrace = readJson('../../fixtures/traces/jumpy-cls-m90.json', import.meta);

describe('Interaction to Next Paint', () => {
  function getTestData() {
    const artifacts = {
      traces: {
        [InteractionToNextPaint.DEFAULT_PASS]: interactionTrace,
      },
    };

    const context = {
      settings: {throttlingMethod: 'devtools'},
      computedCache: new Map(),
      options: InteractionToNextPaint.defaultOptions,
    };

    return {artifacts, context};
  }

  it('evaluates INP correctly', async () => {
    const {artifacts, context} = getTestData();
    const result = await InteractionToNextPaint.audit(artifacts, context);
    expect(result).toEqual({
      score: 0.66,
      numericValue: 368,
      numericUnit: 'millisecond',
      displayValue: expect.toBeDisplayString('370 ms'),
    });
  });

  it('throw error if no m103 EventTiming events', async () => {
    const {artifacts, context} = getTestData();
    const clonedTrace = JSON.parse(JSON.stringify(artifacts.traces.defaultPass));
    for (let i = 0; i < clonedTrace.traceEvents.length; i++) {
      if (clonedTrace.traceEvents[i].name !== 'EventTiming') continue;
      clonedTrace.traceEvents[i].args = {};
    }
    artifacts.traces.defaultPass = clonedTrace;

    const promise = InteractionToNextPaint.audit(artifacts, context);
    await expect(promise).rejects.toThrow('UNSUPPORTED_OLD_CHROME');
  });

  it('is not applicable if using simulated throttling', async () => {
    const {artifacts, context} = getTestData();
    context.settings.throttlingMethod = 'simulate';
    const result = await InteractionToNextPaint.audit(artifacts, context);
    expect(result).toMatchObject({
      score: null,
      notApplicable: true,
    });
  });

  it('is not applicable if no interactions occurred in trace', async () => {
    const {artifacts, context} = getTestData();
    artifacts.traces[InteractionToNextPaint.DEFAULT_PASS] = noInteractionTrace;
    const result = await InteractionToNextPaint.audit(artifacts, context);
    expect(result).toMatchObject({
      score: null,
      notApplicable: true,
    });
  });
});
