/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {makePromiseInspectable, flushAllTimersAndMicrotasks, timers} from '../../test-utils.js';
import {createMockContext} from '../mock-driver.js';
import TraceGatherer from '../../../gather/gatherers/trace.js';

describe('TraceGatherer', () => {
  before(() => timers.useFakeTimers());
  after(() => timers.dispose());

  let gatherer = new TraceGatherer();
  let context = createMockContext();

  beforeEach(() => {
    gatherer = new TraceGatherer();
    context = createMockContext();
  });

  describe('startSensitiveInstrumentation', () => {
    beforeEach(() => {
      context.driver.defaultSession.sendCommand
        .mockResponse('Page.enable')
        .mockResponse('Tracing.start');
    });

    it('should start tracing', async () => {
      await gatherer.startSensitiveInstrumentation(context.asContext());
      expect(context.driver.defaultSession.sendCommand).toHaveBeenCalledWith(
        'Tracing.start',
        expect.anything()
      );
    });

    it('should use custom categories', async () => {
      context.settings.additionalTraceCategories = 'madeup-category,othercategory';
      await gatherer.startSensitiveInstrumentation(context.asContext());

      const session = context.driver.defaultSession;
      const traceStartInvocation = session.sendCommand.findInvocation('Tracing.start');
      if (!traceStartInvocation) throw new Error('Did not call Tracing.start');

      const categories = traceStartInvocation.categories.split(',');
      expect(categories).toContain('devtools.timeline'); // original category
      expect(categories).toContain('madeup-category'); // additional
      expect(categories).toContain('othercategory'); // additional
    });

    it('should add a clock sync marker in timespan mode', async () => {
      context.gatherMode = 'timespan';
      context.driver.defaultSession.sendCommand.mockResponse('Tracing.recordClockSyncMarker');

      await gatherer.startSensitiveInstrumentation(context.asContext());
      expect(context.driver.defaultSession.sendCommand).toHaveBeenCalledWith(
        'Tracing.recordClockSyncMarker',
        expect.anything()
      );
    });
  });

  describe('stopSensitiveInstrumentation', () => {
    it('should collect events on Trace.dataCollected', async () => {
      const session = context.driver.defaultSession;
      session.sendCommand.mockResponse('Tracing.end');

      const stopPromise = makePromiseInspectable(
        gatherer.stopSensitiveInstrumentation(context.asContext())
      );

      const dataListener = session.on.findListener('Tracing.dataCollected');
      const completeListener = session.once.findListener('Tracing.tracingComplete');

      dataListener({value: [1, 2, 3]});
      await flushAllTimersAndMicrotasks();
      expect(stopPromise).not.toBeDone();

      dataListener({value: [4, 5, 6]});
      await flushAllTimersAndMicrotasks();
      expect(stopPromise).not.toBeDone();

      completeListener();
      await flushAllTimersAndMicrotasks();
      expect(stopPromise).toBeDone();
      expect(session.off).toHaveBeenCalled();

      await stopPromise;
      expect(await gatherer.getArtifact()).toEqual({traceEvents: [1, 2, 3, 4, 5, 6]});
    });
  });
});
