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
    /**
     * Execute `cb(traceEngineI18nObject)` on every i18n object, recursively. The cb return
     * value replaces traceEngineI18nObject.
     * @param {any} obj
     * @param {(traceEngineI18nObject: {i18nId: string, values?: {}}) => LH.IcuMessage} cb
     * @param {Set<object>} seen
     */
    function recursiveReplaceLocalizableStrings(obj, cb, seen) {
      if (seen.has(seen)) {
        return;
      }

      seen.add(obj);

      if (obj instanceof Map) {
        for (const [key, value] of obj) {
          if (value && typeof value === 'object' && 'i18nId' in value) {
            obj.set(key, cb(value));
          } else {
            recursiveReplaceLocalizableStrings(value, cb, seen);
          }
        }
      } else if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        Object.keys(obj).forEach(key => {
          const value = obj[key];
          if (value && typeof value === 'object' && 'i18nId' in value) {
            obj[key] = cb(value);
          } else {
            recursiveReplaceLocalizableStrings(value, cb, seen);
          }
        });
      } else if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
          const value = obj[i];
          if (value && typeof value === 'object' && 'i18nId' in value) {
            obj[i] = cb(value);
          } else {
            recursiveReplaceLocalizableStrings(value, cb, seen);
          }
        }
      }
    }

    for (const insightSet of insightSets.values()) {
      for (const [name, model] of Object.entries(insightSet.model)) {
        if (model instanceof Error) {
          continue;
        }

        /** @type {Record<string, string>} */
        let traceEngineUIStrings;
        if (name in TraceEngine.Insights.Models) {
          const nameAsKey = /** @type {keyof typeof TraceEngine.Insights.Models} */ (name);
          traceEngineUIStrings = TraceEngine.Insights.Models[nameAsKey].UIStrings;
        } else {
          throw new Error(`insight missing UIStrings: ${name}`);
        }

        const key = `node_modules/@paulirish/trace_engine/models/trace/insights/${name}.js`;
        const str_ = i18n.createIcuMessageFn(key, traceEngineUIStrings);

        // Pass `{i18nId: string, values?: {}}` through Lighthouse's i18n pipeline.
        // This is equivalent to if we directly did `str_(UIStrings.whatever, ...)`
        recursiveReplaceLocalizableStrings(model, (traceEngineI18nObject) => {
          let values = traceEngineI18nObject.values;
          if (values) {
            values = structuredClone(values);
            for (const [key, value] of Object.entries(values)) {
              if (value && typeof value === 'object' && '__i18nBytes' in value) {
                // @ts-expect-error
                values[key] = value.__i18nBytes;
                // TODO: use an actual byte formatter. Right now, this shows the exact number of bytes.
              }
            }
          }

          return str_(traceEngineI18nObject.i18nId, values);
        }, new Set());
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
