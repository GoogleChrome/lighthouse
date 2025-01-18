/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as i18n from '../lib/i18n/i18n.js';
import * as TraceEngine from '../lib/trace-engine.js';
import {makeComputedArtifact} from './computed-artifact.js';
import {CumulativeLayoutShift} from './metrics/cumulative-layout-shift.js';
import {ProcessedTrace} from './processed-trace.js';
import * as LH from '../../types/lh.js';

/**
 * @fileoverview Processes trace with the shared trace engine.
 */
class TraceEngineResult {
  /**
   * @param {LH.TraceEvent[]} traceEvents
   * @return {Promise<LH.Artifacts.TraceEngineResult>}
   */
  static async runTraceEngine(traceEvents) {
    const processor = new TraceEngine.TraceProcessor(TraceEngine.TraceHandlers);

    // eslint-disable-next-line max-len
    await processor.parse(/** @type {import('@paulirish/trace_engine').Types.Events.Event[]} */ (
      traceEvents
    ), {});
    if (!processor.parsedTrace) throw new Error('No data');
    if (!processor.insights) throw new Error('No insights');
    this.localizeInsights(processor.insights);
    return {data: processor.parsedTrace, insights: processor.insights};
  }

  /**
   * @param {import('@paulirish/trace_engine/models/trace/insights/types.js').TraceInsightSets} insightSets
   */
  static localizeInsights(insightSets) {
    for (const insightSet of insightSets.values()) {
      for (const [name, model] of Object.entries(insightSet.model)) {
        if (model instanceof Error) {
          continue;
        }

        const key = `node_modules/@paulirish/trace_engine/models/trace/insights/${name}.js`;
        const str_ = i18n.createIcuMessageFn(key, {
          title: model.title,
          description: model.description,
        });

        // @ts-expect-error coerce to string, should be fine
        model.title = str_(model.title);
        // @ts-expect-error coerce to string, should be fine
        model.description = str_(model.description);
      }
    }
  }

  /**
   * @param {{trace: LH.Trace}} data
   * @param {LH.Artifacts.ComputedContext} context
   * @return {Promise<LH.Artifacts.TraceEngineResult>}
   */
  static async compute_(data, context) {
    // In CumulativeLayoutShift.getLayoutShiftEvents we handle a bug in Chrome layout shift
    // trace events re: changing the viewport emulation resulting in incorrectly set `had_recent_input`.
    // Below, the same logic is applied to set those problem events' `had_recent_input` to false, so that
    // the trace engine will count them.
    // The trace events are copied-on-write, so the original trace remains unmodified.
    const processedTrace = await ProcessedTrace.request(data.trace, context);
    const layoutShiftEvents = new Set(
      CumulativeLayoutShift.getLayoutShiftEvents(processedTrace).map(e => e.event));

    // Avoid modifying the input array.
    const traceEvents = [...data.trace.traceEvents];
    for (let i = 0; i < traceEvents.length; i++) {
      let event = traceEvents[i];
      if (event.name !== 'LayoutShift') continue;
      if (!event.args.data) continue;

      const isConsidered = layoutShiftEvents.has(event);
      if (event.args.data.had_recent_input && isConsidered) {
        event = JSON.parse(JSON.stringify(event));
        // @ts-expect-error impossible for data to be missing.
        event.args.data.had_recent_input = false;
        traceEvents[i] = event;
      }
    }

    const result = await TraceEngineResult.runTraceEngine(traceEvents);
    return result;
  }
}

const TraceEngineResultComputed = makeComputedArtifact(TraceEngineResult, ['trace']);
export {TraceEngineResultComputed as TraceEngineResult};
