/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import log from 'lighthouse-logger';

import {TraceProcessor} from '../tracehouse/trace-processor.js';

/**
 * @param {LH.Result['audits']} auditResults
 * @return {LH.Artifacts.TimingSummary|undefined}
 */
function getUberMetrics(auditResults) {
  const metricsAudit = auditResults.metrics;
  if (!metricsAudit || !metricsAudit.details || !('items' in metricsAudit.details)) return;

  return metricsAudit.details.items[0];
}

class MetricTraceEvents {
  /**
   * @param {Array<LH.TraceEvent>} traceEvents
   * @param {LH.Result['audits']} auditResults
   */
  constructor(traceEvents, auditResults) {
    this._traceEvents = traceEvents;
    this._auditResults = auditResults;
  }

  /**
   * Returns simplified representation of all metrics
   * @return {Array<{id: string, name: string, tsKey: keyof LH.Artifacts.TimingSummary}>} metrics to consider
   */
  static get metricsDefinitions() {
    return [
      {
        name: 'Time Origin',
        id: 'timeorigin',
        tsKey: 'observedTimeOriginTs',
      },
      {
        name: 'First Contentful Paint',
        id: 'ttfcp',
        tsKey: 'observedFirstContentfulPaintTs',
      },
      {
        name: 'Speed Index',
        id: 'si',
        tsKey: 'observedSpeedIndexTs',
      },
      {
        name: 'First Visual Change',
        id: 'fv',
        tsKey: 'observedFirstVisualChangeTs',
      },
      {
        name: 'Visually Complete 100%',
        id: 'vc100',
        tsKey: 'observedLastVisualChangeTs',
      },
      {
        name: 'Interactive',
        id: 'tti',
        tsKey: 'interactiveTs',
      },
      {
        name: 'End of Trace',
        id: 'eot',
        tsKey: 'observedTraceEndTs',
      },
      {
        name: 'On Load',
        id: 'onload',
        tsKey: 'observedLoadTs',
      },
      {
        name: 'DOM Content Loaded',
        id: 'dcl',
        tsKey: 'observedDomContentLoadedTs',
      },
    ];
  }

  /**
   * Returns simplified representation of all metrics' timestamps from monotonic clock
   * @return {Array<{ts: number, id: string, name: string}>} metrics to consider
   */
  gatherMetrics() {
    const uberMetrics = getUberMetrics(this._auditResults);
    if (!uberMetrics) {
      return [];
    }

    /** @type {Array<{ts: number, id: string, name: string}>} */
    const resolvedMetrics = [];
    MetricTraceEvents.metricsDefinitions.forEach(metric => {
      // Skip if auditResults is missing a particular audit result
      const ts = uberMetrics[metric.tsKey];
      if (ts === undefined) {
        log.error('pwmetrics-events', `${metric.name} timestamp not found`);
        return;
      }

      resolvedMetrics.push({
        id: metric.id,
        name: metric.name,
        ts,
      });
    });

    return resolvedMetrics;
  }

  /**
   * Get the trace event data for our timeOrigin
   * @param {Array<{ts: number, id: string, name: string}>} metrics
   * @return {{pid: number, tid: number, ts: number} | {errorMessage: string}}
   */
  getTimeOriginEvt(metrics) {
    const timeOriginMetric = metrics.find(e => e.id === 'timeorigin');
    if (!timeOriginMetric) return {errorMessage: 'timeorigin Metric not found in definitions'};
    try {
      const frameIds = TraceProcessor.findMainFrameIds(this._traceEvents);
      return {pid: frameIds.startingPid, tid: 1, ts: timeOriginMetric.ts};
    } catch (err) {
      return {errorMessage: err.message};
    }
  }

  /**
   * Constructs performance.measure trace events, which have start/end events as follows:
   *     { "pid": 89922,"tid":1295,"ts":77176783452,"ph":"b","cat":"blink.user_timing","name":"innermeasure","args":{},"tts":1257886,"id":"0xe66c67"}
   *     { "pid": 89922,"tid":1295,"ts":77176882592,"ph":"e","cat":"blink.user_timing","name":"innermeasure","args":{},"tts":1257898,"id":"0xe66c67"}
   * @param {{ts: number, id: string, name: string}} metric
   * @param {{pid: number, tid: number, ts: number}} timeOriginEvt
   * @return {Array<LH.TraceEvent>} Pair of trace events (start/end)
   */
  synthesizeEventPair(metric, timeOriginEvt) {
    // We'll masquerade our fake events to look mostly like the timeOrigin event
    const eventBase = {
      pid: timeOriginEvt.pid,
      tid: timeOriginEvt.tid,
      cat: 'blink.user_timing',
      name: metric.name,
      args: {},
      // randomized id is same for the pair
      id: `0x${((Math.random() * 1000000) | 0).toString(16)}`,
    };
    const fakeMeasureStartEvent = Object.assign({}, eventBase, {
      ts: timeOriginEvt.ts,
      ph: 'b',
    });
    const fakeMeasureEndEvent = Object.assign({}, eventBase, {
      ts: metric.ts,
      ph: 'e',
    });
    return /** @type {Array<LH.TraceEvent>} */ ([fakeMeasureStartEvent, fakeMeasureEndEvent]);
  }

  /**
   * @return {Array<LH.TraceEvent>} User timing raw trace event pairs
   */
  generateFakeEvents() {
    const metrics = this.gatherMetrics();
    if (metrics.length === 0) {
      log.error('metrics-events', 'Metrics collection had errors, not synthetizing trace events');
      return [];
    }

    const timeOriginEvt = this.getTimeOriginEvt(metrics);
    if ('errorMessage' in timeOriginEvt) {
      log.error('pwmetrics-events', `Reference timeOrigin error: ${timeOriginEvt.errorMessage}`);
      return [];
    }

    /** @type {Array<LH.TraceEvent>} */
    const fakeEvents = [];
    metrics.forEach(metric => {
      if (metric.id === 'timeorigin') {
        return;
      }
      if (!metric.ts) {
        log.error('pwmetrics-events', `(${metric.name}) missing timestamp. Skipping…`);
        return;
      }
      log.verbose('pwmetrics-events', `Sythesizing trace events for ${metric.name}`);
      fakeEvents.push(...this.synthesizeEventPair(metric, timeOriginEvt));
    });
    return fakeEvents;
  }
}

export {MetricTraceEvents};
