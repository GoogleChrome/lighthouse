/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import log from 'lighthouse-logger';

import {ProcessedTrace} from '../processed-trace.js';
import {ProcessedNavigation} from '../processed-navigation.js';
import {Speedline} from '../speedline.js';
import {FirstContentfulPaint} from './first-contentful-paint.js';
import {FirstContentfulPaintAllFrames} from './first-contentful-paint-all-frames.js';
import {LargestContentfulPaint} from './largest-contentful-paint.js';
import {LargestContentfulPaintAllFrames} from './largest-contentful-paint-all-frames.js';
import {Interactive} from './interactive.js';
import {CumulativeLayoutShift} from './cumulative-layout-shift.js';
import {SpeedIndex} from './speed-index.js';
import {MaxPotentialFID} from './max-potential-fid.js';
import {TotalBlockingTime} from './total-blocking-time.js';
import {makeComputedArtifact} from '../computed-artifact.js';
import {TimeToFirstByte} from './time-to-first-byte.js';
import {LCPBreakdown} from './lcp-breakdown.js';

class TimingSummary {
  /**
     * @param {LH.Trace} trace
     * @param {LH.DevtoolsLog} devtoolsLog
     * @param {LH.Artifacts['GatherContext']} gatherContext
     * @param {LH.Util.ImmutableObject<LH.Config.Settings>} settings
     * @param {LH.Artifacts['URL']} URL
     * @param {LH.Artifacts['SourceMaps']} SourceMaps
     * @param {LH.Artifacts.ComputedContext} context
     * @return {Promise<{metrics: LH.Artifacts.TimingSummary, debugInfo: Record<string,boolean>}>}
     */
  static async summarize(trace, devtoolsLog, gatherContext, settings, URL, SourceMaps, context) {
    const metricComputationData =
      {trace, devtoolsLog, gatherContext, settings, URL, SourceMaps, simulator: null};

    /**
     * @template TArtifacts
     * @template TReturn
     * @param {{request: (artifact: TArtifacts, context: LH.Artifacts.ComputedContext) => Promise<TReturn>}} Artifact
     * @param {TArtifacts} artifact
     * @return {Promise<TReturn|undefined>}
     */
    const requestOrUndefined = (Artifact, artifact) => {
      return Artifact.request(artifact, context).catch(err => {
        log.error('lh:computed:TimingSummary', err);
        return undefined;
      });
    };

    /* eslint-disable max-len */

    const processedTrace = await ProcessedTrace.request(trace, context);
    const processedNavigation = await requestOrUndefined(ProcessedNavigation, trace);
    const speedline = await Speedline.request(trace, context);
    const firstContentfulPaint = await requestOrUndefined(FirstContentfulPaint, metricComputationData);
    const firstContentfulPaintAllFrames = await requestOrUndefined(FirstContentfulPaintAllFrames, metricComputationData);
    const largestContentfulPaint = await requestOrUndefined(LargestContentfulPaint, metricComputationData);
    const largestContentfulPaintAllFrames = await requestOrUndefined(LargestContentfulPaintAllFrames, metricComputationData);
    const interactive = await requestOrUndefined(Interactive, metricComputationData);
    const cumulativeLayoutShiftValues = await requestOrUndefined(CumulativeLayoutShift, trace);
    const maxPotentialFID = await requestOrUndefined(MaxPotentialFID, metricComputationData);
    const speedIndex = await requestOrUndefined(SpeedIndex, metricComputationData);
    const totalBlockingTime = await requestOrUndefined(TotalBlockingTime, metricComputationData);
    const lcpBreakdown = await requestOrUndefined(LCPBreakdown, metricComputationData);
    const ttfb = await requestOrUndefined(TimeToFirstByte, metricComputationData);

    const {
      cumulativeLayoutShift,
      cumulativeLayoutShiftMainFrame,
    } = cumulativeLayoutShiftValues || {};

    /** @type {LH.Artifacts.TimingSummary} */
    const metrics = {
      // Include the simulated/observed performance metrics
      firstContentfulPaint: firstContentfulPaint?.timing,
      firstContentfulPaintTs: firstContentfulPaint?.timestamp,
      firstContentfulPaintAllFrames: firstContentfulPaintAllFrames?.timing,
      firstContentfulPaintAllFramesTs: firstContentfulPaintAllFrames?.timestamp,
      largestContentfulPaint: largestContentfulPaint?.timing,
      largestContentfulPaintTs: largestContentfulPaint?.timestamp,
      largestContentfulPaintAllFrames: largestContentfulPaintAllFrames?.timing,
      largestContentfulPaintAllFramesTs: largestContentfulPaintAllFrames?.timestamp,
      interactive: interactive?.timing,
      interactiveTs: interactive?.timestamp,
      speedIndex: speedIndex?.timing,
      speedIndexTs: speedIndex?.timestamp,
      totalBlockingTime: totalBlockingTime?.timing,
      maxPotentialFID: maxPotentialFID?.timing,
      cumulativeLayoutShift,
      cumulativeLayoutShiftMainFrame,

      lcpLoadStart: lcpBreakdown?.loadStart,
      lcpLoadEnd: lcpBreakdown?.loadEnd,

      timeToFirstByte: ttfb?.timing,
      timeToFirstByteTs: ttfb?.timestamp,

      // Include all timestamps of interest from the processed trace
      observedTimeOrigin: processedTrace.timings.timeOrigin,
      observedTimeOriginTs: processedTrace.timestamps.timeOrigin,
      // For now, navigationStart is always timeOrigin.
      observedNavigationStart: processedNavigation?.timings.timeOrigin,
      observedNavigationStartTs: processedNavigation?.timestamps.timeOrigin,
      observedFirstPaint: processedNavigation?.timings.firstPaint,
      observedFirstPaintTs: processedNavigation?.timestamps.firstPaint,
      observedFirstContentfulPaint: processedNavigation?.timings.firstContentfulPaint,
      observedFirstContentfulPaintTs: processedNavigation?.timestamps.firstContentfulPaint,
      observedFirstContentfulPaintAllFrames: processedNavigation?.timings.firstContentfulPaintAllFrames,
      observedFirstContentfulPaintAllFramesTs: processedNavigation?.timestamps.firstContentfulPaintAllFrames,
      observedLargestContentfulPaint: processedNavigation?.timings.largestContentfulPaint,
      observedLargestContentfulPaintTs: processedNavigation?.timestamps.largestContentfulPaint,
      observedLargestContentfulPaintAllFrames: processedNavigation?.timings.largestContentfulPaintAllFrames,
      observedLargestContentfulPaintAllFramesTs: processedNavigation?.timestamps.largestContentfulPaintAllFrames,
      observedTraceEnd: processedTrace.timings.traceEnd,
      observedTraceEndTs: processedTrace.timestamps.traceEnd,
      observedLoad: processedNavigation?.timings.load,
      observedLoadTs: processedNavigation?.timestamps.load,
      observedDomContentLoaded: processedNavigation?.timings.domContentLoaded,
      observedDomContentLoadedTs: processedNavigation?.timestamps.domContentLoaded,
      observedCumulativeLayoutShift: cumulativeLayoutShift,
      observedCumulativeLayoutShiftMainFrame: cumulativeLayoutShiftMainFrame,

      // Include some visual metrics from speedline
      observedFirstVisualChange: speedline.first,
      observedFirstVisualChangeTs: (speedline.first + speedline.beginning) * 1000,
      observedLastVisualChange: speedline.complete,
      observedLastVisualChangeTs: (speedline.complete + speedline.beginning) * 1000,
      observedSpeedIndex: speedline.speedIndex,
      observedSpeedIndexTs: (speedline.speedIndex + speedline.beginning) * 1000,
    };

    /* eslint-enable max-len */

    /** @type {Record<string,boolean>} */
    const debugInfo = {
      lcpInvalidated: !!processedNavigation?.lcpInvalidated,
    };

    return {metrics, debugInfo};
  }
  /**
   * @param {{trace: LH.Trace, devtoolsLog: LH.DevtoolsLog, gatherContext: LH.Artifacts['GatherContext']; settings: LH.Util.ImmutableObject<LH.Config.Settings>, URL: LH.Artifacts['URL'], SourceMaps: LH.Artifacts['SourceMaps']}} data
   * @param {LH.Artifacts.ComputedContext} context
   * @return {Promise<{metrics: LH.Artifacts.TimingSummary, debugInfo: Record<string,boolean>}>}
   */
  static async compute_(data, context) {
    return TimingSummary.summarize(
      data.trace,
      data.devtoolsLog,
      data.gatherContext,
      data.settings,
      data.URL,
      data.SourceMaps,
      context
    );
  }
}

const TimingSummaryComputed = makeComputedArtifact(
  TimingSummary,
  ['devtoolsLog', 'gatherContext', 'settings', 'trace', 'URL', 'SourceMaps']
);
export {TimingSummaryComputed as TimingSummary};
