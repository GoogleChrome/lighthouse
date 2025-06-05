/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import log from 'lighthouse-logger';

import * as i18n from '../lib/i18n/i18n.js';
import * as TraceEngine from '../lib/trace-engine.js';
import {makeComputedArtifact} from './computed-artifact.js';
import {CumulativeLayoutShift} from './metrics/cumulative-layout-shift.js';
import {ProcessedTrace} from './processed-trace.js';
import SDK from '../lib/cdt/SDK.js';
import * as LH from '../../types/lh.js';

/**
 * @fileoverview Processes trace with the shared trace engine.
 */
class TraceEngineResult {
  /**
   * @param {LH.TraceEvent[]} traceEvents
   * @param {LH.Audit.Context['settings']} settings
   * @param {LH.Artifacts['SourceMaps']} SourceMaps
   * @return {Promise<LH.Artifacts.TraceEngineResult>}
   */
  static async runTraceEngine(traceEvents, settings, SourceMaps) {
    const processor = new TraceEngine.TraceProcessor(TraceEngine.TraceHandlers);

    const lanternSettings = {};
    if (settings.throttlingMethod) lanternSettings.throttlingMethod = settings.throttlingMethod;
    if (settings.throttling) lanternSettings.throttling = settings.throttling;
    if (settings.precomputedLanternData) {
      lanternSettings.precomputedLanternData = settings.precomputedLanternData;
    }

    // eslint-disable-next-line max-len
    await processor.parse(/** @type {import('@paulirish/trace_engine').Types.Events.Event[]} */ (
      traceEvents
    ), {
      logger: {
        start(id) {
          const logId = `lh:computed:TraceEngineResult:${id}`;
          log.time({msg: `Trace Engine ${id}`, id: logId});
        },
        end(id) {
          const logId = `lh:computed:TraceEngineResult:${id}`;
          log.timeEnd({msg: `Trace Engine ${id}`, id: logId});
        },
      },
      lanternSettings,
      async resolveSourceMap(params) {
        const sourceMap = SourceMaps.find(sm => sm.scriptId === params.scriptId);
        if (!sourceMap || !sourceMap.map) {
          return null;
        }

        const compiledUrl = sourceMap.scriptUrl || 'compiled.js';
        const mapUrl = sourceMap.sourceMapUrl || 'compiled.js.map';
        return new SDK.SourceMap(compiledUrl, mapUrl, sourceMap.map);
      },
    });
    if (!processor.parsedTrace) throw new Error('No data');
    if (!processor.insights) throw new Error('No insights');
    this.localizeInsights(processor.insights);
    return {data: processor.parsedTrace, insights: processor.insights};
  }

  /**
   * Adapts the given DevTools function that returns a localized string to one
   * that returns a LH.IcuMessage.
   *
   * @template {any[]} Args
   * @template {import('../lib/trace-engine.js').DevToolsIcuMessage} Ret
   * @param {ReturnType<i18n.createIcuMessageFn>} str_
   * @param {(...args: Args) => Ret} fn
   * @return {(...args: Args) => LH.IcuMessage}
   */
  static localizeFunction(str_, fn) {
    return (...args) => this.localize(str_, fn(...args));
  }

  /**
   * Converts the input parameters given to `i18nString` usages in DevTools to a
   * LH.IcuMessage.
   *
   * @param {ReturnType<i18n.createIcuMessageFn>} str_
   * @param {import('../lib/trace-engine.js').DevToolsIcuMessage} traceEngineI18nObject
   * @return {LH.IcuMessage}
   */
  static localize(str_, traceEngineI18nObject) {
    /** @type {Record<string, string|number>|undefined} */
    let values;
    if (traceEngineI18nObject.values) {
      values = {};
      for (const [key, value] of Object.entries(traceEngineI18nObject.values)) {
        if (value && typeof value === 'object' && '__i18nBytes' in value) {
          values[key] = value.__i18nBytes;
          // TODO: use an actual byte formatter. Right now, this shows the exact number of bytes.
        } else if (value && typeof value === 'object' && '__i18nMillis' in value) {
          values[key] = `${value.__i18nMillis} ms`;
          // TODO: use an actual time formatter.
        } else if (value && typeof value === 'object' && 'i18nId' in value) {
          // TODO: add support for str_ values to be IcuMessage. For now, we translate it here.
          // This means that locale swapping won't work for this portion of the IcuMessage.
          // @ts-expect-error
          values[key] = str_(value.i18nId, value.values).formattedDefault;
        } else {
          values[key] = value;
        }
      }
    }

    return str_(traceEngineI18nObject.i18nId, values);
  }

  /**
   * Recursively finds all DevToolsIcuMessage objects and replaces them with LH.IcuMessage.
   *
   * @param {ReturnType<i18n.createIcuMessageFn>} str_
   * @param {object} object
   */
  static localizeObject(str_, object) {
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

    // Pass `{i18nId: string, values?: {}}` through Lighthouse's i18n pipeline.
    // This is equivalent to if we directly did `str_(UIStrings.whatever, ...)`
    recursiveReplaceLocalizableStrings(object, (traceEngineI18nObject) => {
      let values = traceEngineI18nObject.values;
      if (values) {
        values = structuredClone(values);
        for (const [key, value] of Object.entries(values)) {
          if (value && typeof value === 'object' && '__i18nBytes' in value) {
            // @ts-expect-error
            values[key] = value.__i18nBytes;
            // TODO: use an actual byte formatter. Right now, this shows the exact number of bytes.
          } else if (value && typeof value === 'object' && '__i18nMillis' in value) {
            // @ts-expect-error
            values[key] = `${value.__i18nMillis} ms`;
            // TODO: use an actual time formatter.
          } else if (value && typeof value === 'object' && 'i18nId' in value) {
            // TODO: add support for str_ values to be IcuMessage.
            // @ts-expect-error
            values[key] = str_(value.i18nId, value.values).formattedDefault;
          }
        }
      }

      return str_(traceEngineI18nObject.i18nId, values);
    }, new Set());
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
        this.localizeObject(str_, model);
      }
    }
  }

  /**
   * @param {{trace: LH.Trace, settings: LH.Audit.Context['settings'], SourceMaps: LH.Artifacts['SourceMaps']}} data
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

    const result =
      await TraceEngineResult.runTraceEngine(traceEvents, data.settings, data.SourceMaps);
    return result;
  }
}

const TraceEngineResultComputed =
  makeComputedArtifact(TraceEngineResult, ['trace', 'settings', 'SourceMaps']);
export {TraceEngineResultComputed as TraceEngineResult};
