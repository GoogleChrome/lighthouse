/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {TotalBlockingTime} from '../../computed/metrics/total-blocking-time.js';
import {TBTImpactTasks} from '../../computed/tbt-impact-tasks.js';
import {defaultSettings} from '../../config/constants.js';
import {getURLArtifactFromDevtoolsLog, readJson} from '../test-utils.js';
import {createTestTrace, rootFrame} from '../create-test-trace.js';
import {networkRecordsToDevtoolsLog} from '../network-records-to-devtools-log.js';
import {MainThreadTasks} from '../../computed/main-thread-tasks.js';

const trace = readJson('../fixtures/artifacts/cnn/defaultPass.trace.json.gz', import.meta);
const devtoolsLog = readJson('../fixtures/artifacts/cnn/defaultPass.devtoolslog.json.gz', import.meta);

describe('TBTImpactTasks', () => {
  const mainDocumentUrl = 'https://example.com';
  /** @type {LH.Config.Settings} */
  let settings;
  /** @type {LH.Artifacts.ComputedContext} */
  let context;

  beforeEach(() => {
    context = {computedCache: new Map()};
    settings = JSON.parse(JSON.stringify(defaultSettings));
  });

  describe('getTbtBounds', () => {
    /** @type {LH.Artifacts.MetricComputationDataInput} */
    let metricComputationData;

    beforeEach(() => {
      metricComputationData = {
        trace: createTestTrace({
          largestContentfulPaint: 15,
          traceEnd: 10_000,
          frameUrl: mainDocumentUrl,
          topLevelTasks: [
            // Add long task to defer TTI
            {ts: 1000, duration: 1000},
          ],
        }),
        devtoolsLog: networkRecordsToDevtoolsLog([{
          requestId: '1',
          priority: 'High',
          networkRequestTime: 0,
          networkEndTime: 500,
          transferSize: 400,
          url: mainDocumentUrl,
          frameId: rootFrame,
        }]),
        URL: {
          requestedUrl: mainDocumentUrl,
          mainDocumentUrl,
          finalDisplayedUrl: mainDocumentUrl,
        },
        gatherContext: {gatherMode: 'navigation'},
        settings,
      };
    });

    it('gets start/end times for lantern', async () => {
      const {startTimeMs, endTimeMs} =
        await TBTImpactTasks.getTbtBounds(metricComputationData, context);
      expect(startTimeMs).toEqual(780);
      expect(endTimeMs).toEqual(4780);
    });

    it('gets start/end times for DT throttling', async () => {
      settings.throttlingMethod = 'devtools';

      const {startTimeMs, endTimeMs} =
        await TBTImpactTasks.getTbtBounds(metricComputationData, context);
      expect(startTimeMs).toEqual(0.01);
      expect(endTimeMs).toEqual(2000);
    });

    it('gets start/end times for timespan mode', async () => {
      settings.throttlingMethod = 'devtools';
      metricComputationData.gatherContext.gatherMode = 'timespan';

      const {startTimeMs, endTimeMs} =
        await TBTImpactTasks.getTbtBounds(metricComputationData, context);
      expect(startTimeMs).toEqual(0);
      expect(endTimeMs).toEqual(10_000);
    });
  });

  describe('computeImpactsFromObservedTasks', () => {
    it('computes correct task impacts', async () => {
      const trace = createTestTrace({
        traceEnd: 10_000,
        topLevelTasks: [
          {
            ts: 2000,
            duration: 4000,
            children: [
              {ts: 2100, duration: 500, url: mainDocumentUrl},
              {ts: 3100, duration: 500, url: mainDocumentUrl},
            ],
          },
          {
            ts: 6000,
            duration: 3000,
          },
        ],
      });

      const tasks = await MainThreadTasks.request(trace, context);
      expect(tasks).toHaveLength(5);

      const tbtImpactTasks = TBTImpactTasks.computeImpactsFromObservedTasks(tasks, 2200, 7000);
      expect(tbtImpactTasks).toMatchObject([
        {
          tbtImpact: 3750, // 4000 (dur) - 200 (FCP cutoff) - 50 (blocking threshold)
          selfBlockingTime: 2962.5, // 4000 (dur) - 50 (blocking threshold) - 493.75 - 493.75
          selfTbtImpact: 2862.5, // 3750 - 393.75 - 493.75
        },
        {
          tbtImpact: 393.75, // 500 (dur) - 100 (FCP cutoff) - 6.25 (50 * 500 / 4000)
          selfBlockingTime: 493.75, // 500 (dur) - 6.25 (50 * 500 / 4000)
          selfTbtImpact: 393.75, // No children
        },
        {
          tbtImpact: 493.75, // 500 (dur) - 6.25 (50 * 500 / 4000)
          selfBlockingTime: 493.75, // 500 (dur) - 6.25 (50 * 500 / 4000)
          selfTbtImpact: 493.75, // No children
        },
        {
          tbtImpact: 950, // 3000 (dur) - 2000 (TTI cutoff) - 50
          selfBlockingTime: 2950, // 3000 (dur) - 50 (blocking threshold)
          selfTbtImpact: 950, // No children
        },
        {
          // Included in test trace by default
          tbtImpact: 0,
          selfBlockingTime: 0,
          selfTbtImpact: 0,
        },
      ]);
    });
  });

  describe('computeImpactsFromLantern', () => {
    /**
     * Creates a fake lantern node timings map for the given tasks.
     * Assumes the throttling scales the task timing linearly by `linearScale`.
     * @param {LH.Artifacts.TaskNode[]} tasks
     * @param {number} linearScale
     * @return {LH.Gatherer.Simulation.Result['nodeTimings']}
     */
    function mockLanternTimings(tasks, linearScale) {
      /** @type {LH.Gatherer.Simulation.Result['nodeTimings']} */
      const tbtNodeTimings = new Map();

      for (const task of tasks) {
        // Only top level tasks will have a CPU node in lantern
        if (task.parent) continue;

        /** @type {LH.Gatherer.Simulation.GraphCPUNode} */
        // @ts-expect-error fake CPU node to use as a map key
        const node = {
          type: 'cpu',
          event: task.event,
        };

        tbtNodeTimings.set(node, {
          startTime: task.startTime * linearScale,
          endTime: task.endTime * linearScale,
          duration: task.duration * linearScale,
        });
      }

      return tbtNodeTimings;
    }

    it('computes correct task impacts', async () => {
      const trace = createTestTrace({
        traceEnd: 10_000,
        topLevelTasks: [
          {
            ts: 2000, // 8000 scaled up
            duration: 4000, // 16_000 scaled up
            children: [
              // ts: 8400, dur: 2000 scaled up
              {ts: 2100, duration: 500, url: mainDocumentUrl},
              // ts: 12_400, dur: 2000 scaled up
              {ts: 3100, duration: 500, url: mainDocumentUrl},
            ],
          },
          {
            ts: 6000, // 24_000 scaled up
            duration: 3000, // 12_000 scaled up
          },
        ],
      });

      const tasks = await MainThreadTasks.request(trace, context);
      expect(tasks).toHaveLength(5);

      const tbtNodeTimings = mockLanternTimings(tasks, 4);
      expect(tbtNodeTimings.size).toEqual(3); // 2 top level tasks + 1 in the trace by default

      const tbtImpactTasks =
        TBTImpactTasks.computeImpactsFromLantern(tasks, tbtNodeTimings, 8800, 28_000);
      expect(tbtImpactTasks).toMatchObject([
        {
          tbtImpact: 15_150, // 16_000 (dur) - 800 (FCP cutoff) - 50 (blocking threshold)
          selfBlockingTime: 11_962.5, // 16_000 (dur) - 50 (blocking threshold) - 1993.75 - 1993.75
          selfTbtImpact: 11_562.5, // 15_150 - 1593.75 - 1993.75
        },
        {
          tbtImpact: 1593.75, // 2000 (dur) - 400 (FCP cutoff) - 6.25 (50 * 2000 / 16_000)
          selfBlockingTime: 1993.75, // 2000 (dur) - 6.25 (50 * 2000 / 16_000)
          selfTbtImpact: 1593.75, // No children
        },
        {
          tbtImpact: 1993.75, // 2000 (dur) - 6.25 (50 * 2000 / 16_000)
          selfBlockingTime: 1993.75, // 2000 (dur) - 6.25 (50 * 2000 / 16_000)
          selfTbtImpact: 1993.75, // No children
        },
        {
          tbtImpact: 3950, // 12_000 (dur) - 8000 (TTI cutoff) - 50
          selfBlockingTime: 11_950, // 12_000 (dur) - 50
          selfTbtImpact: 3950, // No children
        },
        {
          // Included in test trace by default
          tbtImpact: 0,
          selfBlockingTime: 0,
          selfTbtImpact: 0,
        },
      ]);
    });
  });

  describe('works on real artifacts', () => {
    it('with lantern', async () => {
      /** @type {LH.Artifacts.MetricComputationDataInput} */
      const metricComputationData = {
        trace,
        devtoolsLog,
        URL: getURLArtifactFromDevtoolsLog(devtoolsLog),
        gatherContext: {gatherMode: 'navigation'},
        settings,
      };

      const tasks = await TBTImpactTasks.request(metricComputationData, context);
      expect(tasks.every(t => t.selfTbtImpact >= 0)).toBeTruthy();

      const tasksImpactingTbt = tasks.filter(t => t.tbtImpact);
      expect(tasksImpactingTbt.length).toMatchInlineSnapshot(`7374`);

      // Only tasks with no children should have a `selfTbtImpact` that equals `tbtImpact` if
      // `tbtImpact` is nonzero.
      const tasksWithNoChildren = tasksImpactingTbt.filter(t => !t.children.length);
      const tasksWithAllSelfImpact = tasksImpactingTbt.filter(t => t.selfTbtImpact === t.tbtImpact);
      expect(tasksWithNoChildren).toEqual(tasksWithAllSelfImpact);

      const totalSelfImpact = tasksImpactingTbt.reduce((sum, t) => sum += t.selfTbtImpact, 0);
      expect(totalSelfImpact).toMatchInlineSnapshot(`2819.9999999999545`);

      // Total self blocking time is just the total self impact without factoring in the TBT
      // bounds, so it should always be greater than or equal to the total TBT self impact.
      const totalSelfBlockingTime = tasksImpactingTbt
        .reduce((sum, t) => sum += t.selfBlockingTime, 0);
      expect(totalSelfImpact).toBeGreaterThanOrEqual(totalSelfBlockingTime);

      // The total self TBT impact of every task should equal the total TBT impact of just the top level tasks.
      const topLevelTasks = tasksImpactingTbt.filter(t => !t.parent);
      const totalTopLevelImpact = topLevelTasks.reduce((sum, t) => sum += t.tbtImpact, 0);
      expect(totalTopLevelImpact).toBeCloseTo(totalSelfImpact, 0.1);

      // We use the pessimistic start/end timings to get the TBT impact of each task, so the total TBT impact
      // should be the same as the pessimistic TBT estimate.
      const tbtResult = await TotalBlockingTime.request(metricComputationData, context);
      if ('pessimisticEstimate' in tbtResult) {
        expect(totalSelfImpact).toBeGreaterThan(tbtResult.timing);
        expect(totalSelfImpact).toBeCloseTo(tbtResult.pessimisticEstimate.timeInMs, 0.1);
      } else {
        throw new Error('TBT result was not a lantern result');
      }
    });

    it('with DT throttling', async () => {
      settings.throttlingMethod = 'devtools';

      /** @type {LH.Artifacts.MetricComputationDataInput} */
      const metricComputationData = {
        trace,
        devtoolsLog,
        URL: getURLArtifactFromDevtoolsLog(devtoolsLog),
        gatherContext: {gatherMode: 'navigation'},
        settings,
      };

      const tasks = await TBTImpactTasks.request(metricComputationData, context);

      expect(tasks.every(t => t.selfTbtImpact >= 0)).toBeTruthy();

      const tasksImpactingTbt = tasks.filter(t => t.tbtImpact);
      expect(tasksImpactingTbt.length).toMatchInlineSnapshot(`1722`);

      // Only tasks with no children should have a `selfTbtImpact` that equals `tbtImpact` if
      // `tbtImpact` is nonzero.
      const tasksWithNoChildren = tasksImpactingTbt.filter(t => !t.children.length);
      const tasksWithAllSelfImpact = tasksImpactingTbt.filter(t => t.selfTbtImpact === t.tbtImpact);
      expect(tasksWithNoChildren).toEqual(tasksWithAllSelfImpact);

      const totalSelfImpact = tasksImpactingTbt.reduce((sum, t) => sum += t.selfTbtImpact, 0);
      expect(totalSelfImpact).toMatchInlineSnapshot(`400.039`);

      // Total self blocking time is just the total self impact without factoring in the TBT
      // bounds, so it should always be greater than or equal to the total TBT self impact.
      const totalSelfBlockingTime = tasksImpactingTbt
        .reduce((sum, t) => sum += t.selfBlockingTime, 0);
      expect(totalSelfImpact).toBeGreaterThanOrEqual(totalSelfBlockingTime);

      // The total self TBT impact of every task should equal the total TBT impact of just the top level tasks.
      const topLevelTasks = tasksImpactingTbt.filter(t => !t.parent);
      const totalTopLevelImpact = topLevelTasks.reduce((sum, t) => sum += t.tbtImpact, 0);
      expect(totalTopLevelImpact).toBeCloseTo(totalSelfImpact, 0.1);

      // With DT throttling, the TBT estimate from summing all self impacts should
      // be the same as our actual TBT calculation.
      const tbtResult = await TotalBlockingTime.request(metricComputationData, context);
      expect(totalSelfImpact).toBeCloseTo(tbtResult.timing, 0.1);
    });
  });
});
