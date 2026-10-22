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
        expect.objectContaining({
          transferMode: 'ReturnAsStream',
        })
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
    it('should read trace from stream when stream handle is returned', async () => {
      const session = context.driver.defaultSession;
      session.sendCommand
        .mockResponse('Tracing.end')
        .mockResponse('IO.read', {data: '{"traceEvents":[1,2,', eof: false})
        .mockResponse('IO.read', {
          data: Buffer.from('3,4,5,6]}').toString('base64'),
          base64Encoded: true,
          eof: true,
        })
        .mockResponse('IO.close');

      const stopPromise = makePromiseInspectable(
        gatherer.stopSensitiveInstrumentation(context.asContext())
      );

      const completeListener = session.once.findListener('Tracing.tracingComplete');
      completeListener({dataLossOccurred: false, stream: 'stream-1'});
      await flushAllTimersAndMicrotasks();
      expect(stopPromise).toBeDone();

      await stopPromise;
      expect(session.sendCommand).toHaveBeenCalledWith('IO.read', {handle: 'stream-1'});
      expect(session.sendCommand).toHaveBeenCalledWith('IO.close', {handle: 'stream-1'});
      expect(gatherer.getArtifact()).toEqual({traceEvents: [1, 2, 3, 4, 5, 6]});
    });

    it('should incrementally parse newline-delimited Perfetto trace chunks', async () => {
      const session = context.driver.defaultSession;
      const chunk1 = '{"traceEvents":[\n{"pid":1,"name":"first"},\n{"pid":2,"name":"sec';
      const chunk2 =
        'ond [with] brackets"},\n{"pid":3,"name":"third"}],"metadata":\n{"cpu-family":6}}';
      session.sendCommand
        .mockResponse('Tracing.end')
        .mockResponse('IO.read', {data: chunk1, eof: false})
        .mockResponse('IO.read', {data: chunk2, eof: true})
        .mockResponse('IO.close');

      const stopPromise = gatherer.stopSensitiveInstrumentation(context.asContext());
      const completeListener = session.once.findListener('Tracing.tracingComplete');
      completeListener({dataLossOccurred: false, stream: 'stream-2'});
      await stopPromise;

      expect(gatherer.getArtifact()).toEqual({
        traceEvents: [
          {pid: 1, name: 'first'},
          {pid: 2, name: 'second [with] brackets'},
          {pid: 3, name: 'third'},
        ],
        metadata: {'cpu-family': 6},
      });
    });
  });
});
