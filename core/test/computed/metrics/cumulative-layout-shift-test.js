/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {CumulativeLayoutShift} from '../../../computed/metrics/cumulative-layout-shift.js';
import {createTestTrace} from '../../create-test-trace.js';
import {readJson} from '../../test-utils.js';

const jumpyClsTrace = readJson('../../fixtures/traces/jumpy-cls-m90.json', import.meta);
const oldMetricsTrace = readJson('../../fixtures/traces/frame-metrics-m89.json', import.meta);
const allFramesMetricsTrace = readJson('../../fixtures/traces/frame-metrics-m90.json', import.meta);
const preClsTrace = readJson('../../fixtures/traces/progressive-app-m60.json', import.meta);

const childFrameId = 'CAF4634127666E186C9C8B35627DBF0B';

describe('Metrics: CLS', () => {
  const context = {
    computedCache: new Map(),
  };

  describe('real traces', () => {
    it('calculates (all main frame) CLS for a trace', async () => {
      const result = await CumulativeLayoutShift.request(jumpyClsTrace, context);
      expect(result).toEqual({
        cumulativeLayoutShift: expect.toBeApproximately(2.268816, 6),
        cumulativeLayoutShiftMainFrame: expect.toBeApproximately(2.268816, 6),
        impactByNodeId: new Map([
          [8, 4.809793674045139],
        ]),
        newEngineResult: {
          cumulativeLayoutShift: expect.toBeApproximately(2.268816, 6),
          cumulativeLayoutShiftMainFrame: expect.toBeApproximately(2.268816, 6),
        },
        newEngineResultDiffered: false,
      });
    });

    it('throws if layout shift events are found without weighted_score_delta', async () => {
      await expect(CumulativeLayoutShift.request(oldMetricsTrace, context)).rejects
          .toThrow('CLS missing weighted_score_delta');
    });

    it('calculates CLS values for a trace with CLS events over more than one frame', async () => {
      const result = await CumulativeLayoutShift.request(allFramesMetricsTrace, context);
      expect(result).toEqual({
        cumulativeLayoutShift: 0.026463014612806653,
        cumulativeLayoutShiftMainFrame: 0.0011656245471340055,
        impactByNodeId: new Map([
          [7, 0.026463014612806653],
          [8, 0.0011656245471340055],
        ]),
        newEngineResult: {
          cumulativeLayoutShift: 0.026463014612806653,
          cumulativeLayoutShiftMainFrame: 0.0011656245471340055,
        },
        newEngineResultDiffered: false,
      });
    });

    it('returns 0 for a trace with no CLS events', async () => {
      const result = await CumulativeLayoutShift.request(preClsTrace, context);
      expect(result).toEqual({
        cumulativeLayoutShift: 0,
        cumulativeLayoutShiftMainFrame: 0,
        impactByNodeId: new Map(),
        newEngineResult: {cumulativeLayoutShift: 0, cumulativeLayoutShiftMainFrame: 0},
        newEngineResultDiffered: false,
      });
    });
  });

  describe('constructed traces', () => {
    /**
     * @param {Array<{score: number, ts: number, had_recent_input?: boolean, is_main_frame?: boolean, weighted_score_delta?: number}>} shiftEventsData
     */
    function makeTrace(shiftEventsData) {
      // If there are non-is_main_frame events, create a child frame in trace to add those events to.
      const needsChildFrame = shiftEventsData.some(e => e.is_main_frame === false);
      const childFrames = needsChildFrame ? [{frame: childFrameId}] : [];

      const trace = createTestTrace({traceEnd: 30_000, childFrames});
      const navigationStartEvt = trace.traceEvents.find(e => e.name === 'navigationStart');
      const mainFrameId = navigationStartEvt.args.frame;

      let mainCumulativeScore = 0;
      let childCumulativeScore = 0;

      /* eslint-disable camelcase */
      const shiftEvents = shiftEventsData.map(data => {
        const {
          score,
          ts,
          had_recent_input = false,
          is_main_frame = true,
          weighted_score_delta = score,
        } = data;

        if (!had_recent_input) {
          if (is_main_frame) mainCumulativeScore += score;
          else childCumulativeScore += score;
        }

        return {
          name: 'LayoutShift',
          cat: 'loading',
          ph: 'I',
          pid: 1111,
          tid: 222,
          ts: ts,
          args: {
            frame: is_main_frame ? mainFrameId : childFrameId,
            data: {
              is_main_frame,
              had_recent_input,
              score,
              cumulative_score: is_main_frame ? mainCumulativeScore : childCumulativeScore,
              weighted_score_delta,
            },
          },
        };
      });
      /* eslint-enable camelcase */

      trace.traceEvents.push(...shiftEvents);
      return trace;
    }

    describe('single frame traces', () => {
      it('should count initial shift events even if input is true', async () => {
        const context = {computedCache: new Map()};
        const trace = makeTrace([
          {score: 1, ts: 1, had_recent_input: true},
          {score: 1, ts: 2, had_recent_input: true},
          {score: 1, ts: 3, had_recent_input: false},
          {score: 1, ts: 4, had_recent_input: false},
        ]);
        const result = await CumulativeLayoutShift.request(trace, context);
        expect(result).toEqual({
          cumulativeLayoutShift: 4,
          cumulativeLayoutShiftMainFrame: 4,
          impactByNodeId: new Map(),
          newEngineResult: undefined,
          newEngineResultDiffered: false,
        });
      });

      it('should not count later shift events if input is true', async () => {
        const context = {computedCache: new Map()};
        const trace = makeTrace([
          {score: 1, ts: 1, had_recent_input: true},
          {score: 1, ts: 2, had_recent_input: false},
          {score: 1, ts: 3, had_recent_input: false},
          {score: 1, ts: 4, had_recent_input: true},
          {score: 1, ts: 5, had_recent_input: true},
        ]);
        const result = await CumulativeLayoutShift.request(trace, context);
        expect(result).toEqual({
          cumulativeLayoutShift: 3,
          cumulativeLayoutShiftMainFrame: 3,
          impactByNodeId: new Map(),
          newEngineResult: undefined,
          newEngineResultDiffered: false,
        });
      });

      it('calculates from a uniform distribution of layout shift events', async () => {
        const shiftEvents = [];
        for (let i = 0; i < 30; i++) {
          shiftEvents.push({
            score: 0.125,
            ts: (i + 0.5) * 1_000_000,
          });
        }
        const trace = makeTrace(shiftEvents);

        const result = await CumulativeLayoutShift.request(trace, context);
        expect(result).toEqual({
          cumulativeLayoutShift: 0.75,
          cumulativeLayoutShiftMainFrame: 0.75,
          impactByNodeId: new Map(),
          newEngineResult: {cumulativeLayoutShift: 0.75, cumulativeLayoutShiftMainFrame: 0.75},
          newEngineResultDiffered: false,
        });
      });

      it('calculates from three clusters of layout shift events', async () => {
        const shiftEvents = [
          {score: 0.0625, ts: 1_000_000},
          {score: 0.2500, ts: 1_200_000},
          {score: 0.0625, ts: 1_250_000}, // Still in 300ms sliding window.
          {score: 0.1250, ts: 2_200_000}, // Sliding windows excluding most of cluster.

          {score: 0.0625, ts: 3_000_000}, // 1.8s gap > 1s but < 5s.
          {score: 0.2500, ts: 3_400_000},
          {score: 0.2500, ts: 4_000_000},

          {score: 0.1250, ts: 10_000_000}, // > 5s gap
          {score: 0.1250, ts: 10_400_000},
          {score: 0.0625, ts: 10_680_000},
        ];
        const trace = makeTrace(shiftEvents);

        const result = await CumulativeLayoutShift.request(trace, context);
        expect(result).toEqual({
          cumulativeLayoutShift: 1.0625,
          cumulativeLayoutShiftMainFrame: 1.0625,
          impactByNodeId: new Map(),
          newEngineResult: {cumulativeLayoutShift: 1.0625, cumulativeLayoutShiftMainFrame: 1.0625},
          newEngineResultDiffered: false,
        });
      });

      it('calculates the same LS score from a tiny extra small cluster of events', async () => {
        const shiftEvents = [];
        for (let i = 0; i < 30; i++) {
          shiftEvents.push({
            score: 0.125,
            ts: 1_000_000 + i * 10_000,
          });
        }
        const trace = makeTrace(shiftEvents);

        const result = await CumulativeLayoutShift.request(trace, context);
        expect(result).toEqual({
          cumulativeLayoutShift: 3.75, // 30 * 0.125
          cumulativeLayoutShiftMainFrame: 3.75,
          impactByNodeId: new Map(),
          newEngineResult: {cumulativeLayoutShift: 3.75, cumulativeLayoutShiftMainFrame: 3.75},
          newEngineResultDiffered: false,
        });
      });

      it('includes events with recent input at start of trace, but ignores others', async () => {
        const shiftEvents = [
          {score: 1, ts: 250_000, had_recent_input: true},
          {score: 1, ts: 500_000, had_recent_input: true}, // These first two events will still be counted because they are within the 500ms window.
          {score: 1, ts: 750_000, had_recent_input: true},
          {score: 1, ts: 1_000_000, had_recent_input: true}, // These second two events will not be counted because they are outside the 500ms window.

          {score: 1, ts: 1_250_000, had_recent_input: false},

          {score: 1, ts: 1_500_000, had_recent_input: true}, // The last four will not.
          {score: 1, ts: 1_750_000, had_recent_input: true},
          {score: 1, ts: 2_000_000, had_recent_input: true},
          {score: 1, ts: 2_250_000, had_recent_input: true},
        ];
        const trace = makeTrace(shiftEvents);

        const result = await CumulativeLayoutShift.request(trace, context);
        expect(result).toEqual({
          cumulativeLayoutShift: 3,
          cumulativeLayoutShiftMainFrame: 3,
          impactByNodeId: new Map(),
          newEngineResult: undefined,
          newEngineResultDiffered: false,
        });
      });
    });

    describe('multi-frame traces', () => {
      it('calculates layout shift events uniformly distributed across two frames', async () => {
        const shiftEvents = [];
        for (let i = 0; i < 30; i++) {
          shiftEvents.push({
            score: 0.125,
            ts: (i + 0.5) * 1_000_000,
            is_main_frame: Boolean(i % 2),
          });
        }
        const trace = makeTrace(shiftEvents);

        const result = await CumulativeLayoutShift.request(trace, context);
        expect(result).toEqual({
          cumulativeLayoutShift: 0.75, // Same value as single-frame uniformly distributed.
          cumulativeLayoutShiftMainFrame: 0.125, // All 1s gaps, so only one event per cluster.
          impactByNodeId: new Map(),
          newEngineResult: {cumulativeLayoutShift: 0.75, cumulativeLayoutShiftMainFrame: 0.125},
          newEngineResultDiffered: false,
        });
      });

      it('includes events with recent input at start of trace, but ignores others', async () => {
        const shiftEvents = [
          {score: 1, ts: 250_000, had_recent_input: true}, // This event will still be counted because it is within the 500ms window.
          {score: 1, ts: 750_000, had_recent_input: true}, // This event will not be counted because it is outside the 500ms window.

          {score: 1, ts: 1_250_000, had_recent_input: false},

          {score: 1, ts: 1_750_000, had_recent_input: true}, // The last two will not.
          {score: 1, ts: 2_000_000, had_recent_input: true},

          // Child frame
          {score: 1, ts: 500_000, had_recent_input: true, is_main_frame: false}, // This event will still be counted because it is within the 500ms window.
          {score: 1, ts: 1_000_000, had_recent_input: true, is_main_frame: false}, // This event will not be counted because it is outside the 500ms window.

          {score: 1, ts: 1_250_000, had_recent_input: false, is_main_frame: false},

          {score: 1, ts: 1_500_000, had_recent_input: true, is_main_frame: false}, // The last two will not.
          {score: 1, ts: 2_250_000, had_recent_input: true, is_main_frame: false},
        ];
        const trace = makeTrace(shiftEvents);

        const result = await CumulativeLayoutShift.request(trace, context);
        expect(result).toMatchObject({
          cumulativeLayoutShift: 4,
          cumulativeLayoutShiftMainFrame: 2,
          impactByNodeId: new Map(),
          newEngineResult: undefined,
          newEngineResultDiffered: false,
        });
      });

      it('includes recent input events near first viewport event, but ignores others', async () => {
        const shiftEvents = [
          {score: 1, ts: 250_000, had_recent_input: true}, // This event will still be counted because it is within the 500ms window of the first viewport event.
          // <<< Viewport event 1 is inserted here at ts 251_000 >>>
          {score: 1, ts: 750_000, had_recent_input: true}, // This event will still be counted because it is within the 500ms window of the first viewport event.

          {score: 1, ts: 1_250_000, had_recent_input: false},

          {score: 1, ts: 1_750_000, had_recent_input: true}, // The last two will not be counted because only the first viewport event matters.
          // <<< Viewport event 2 is inserted here at ts 1_751_000 >>>
          {score: 1, ts: 2_000_000, had_recent_input: true},

          // Child frame
          {score: 1, ts: 500_000, had_recent_input: true, is_main_frame: false}, // This event will still be counted because it is within the 500ms window.
          {score: 1, ts: 1_000_000, had_recent_input: true, is_main_frame: false}, // This event will not be counted because it is outside the 500ms window.

          {score: 1, ts: 1_250_000, had_recent_input: false, is_main_frame: false},

          {score: 1, ts: 1_500_000, had_recent_input: true, is_main_frame: false}, // The last two will not.
          {score: 1, ts: 2_250_000, had_recent_input: true, is_main_frame: false},
        ];
        const trace = makeTrace(shiftEvents);

        // Viewport event 1
        trace.traceEvents.push({
          name: 'viewport',
          ts: 251_000,
          cat: 'loading',
          args: {
            data: {
              frameID: 'ROOT_FRAME',
            },
          },
        });

        // Viewport event 2
        trace.traceEvents.push({
          name: 'viewport',
          ts: 1_751_000,
          cat: 'loading',
          args: {
            data: {
              frameID: 'ROOT_FRAME',
            },
          },
        });

        const result = await CumulativeLayoutShift.request(trace, context);
        expect(result).toMatchObject({
          cumulativeLayoutShift: 5,
          cumulativeLayoutShiftMainFrame: 3,
          newEngineResult: undefined,
          newEngineResultDiffered: false,
        });
      });

      it('uses layout shift score weighted by frame size', async () => {
        const shiftEvents = [
          {score: 2, weighted_score_delta: 2, ts: 250_000, is_main_frame: true},
          {score: 2, weighted_score_delta: 1, ts: 500_000, is_main_frame: false},
          {score: 2, weighted_score_delta: 1, ts: 750_000, is_main_frame: false},
        ];
        const trace = makeTrace(shiftEvents);

        const result = await CumulativeLayoutShift.request(trace, context);
        expect(result).toMatchObject({
          cumulativeLayoutShift: 4,
          cumulativeLayoutShiftMainFrame: 2,
          impactByNodeId: new Map(),
        });
      });

      it('ignores layout shift data from other tabs', async () => {
        const trace = createTestTrace({timeOrigin: 0, traceEnd: 2000});
        const mainFrame = trace.traceEvents.find(e => e.name === 'navigationStart').args.frame;
        const childFrame = 'CHILDFRAME';
        const otherMainFrame = 'ANOTHERTABOPEN';
        const cat = 'loading,rail,devtools.timeline';
        trace.traceEvents.push(
          /* eslint-disable max-len */
          {name: 'FrameCommittedInBrowser', cat, args: {data: {frame: childFrame, parent: mainFrame, url: 'https://frame.com'}}},
          {name: 'FrameCommittedInBrowser', cat, args: {data: {frame: otherMainFrame, url: 'https://example.com'}}},
          {name: 'LayoutShift', cat, args: {frame: mainFrame, data: {had_recent_input: false, score: 1, weighted_score_delta: 1, is_main_frame: true}}},
          {name: 'LayoutShift', cat, args: {frame: childFrame, data: {had_recent_input: false, score: 1, weighted_score_delta: 1, is_main_frame: false}}},
          {name: 'LayoutShift', cat, args: {frame: childFrame, data: {had_recent_input: false, score: 1, weighted_score_delta: 1, is_main_frame: false}}},
          // Following two not used because of `had_recent_input: true`.
          {name: 'LayoutShift', cat, args: {frame: mainFrame, data: {had_recent_input: true, score: 1, weighted_score_delta: 1, is_main_frame: true}}},
          {name: 'LayoutShift', cat, args: {frame: childFrame, data: {had_recent_input: true, score: 1, weighted_score_delta: 1, is_main_frame: false}}},
          // Following two not used because part of another frame tree.
          {name: 'LayoutShift', cat, args: {frame: otherMainFrame, data: {had_recent_input: false, score: 1, weighted_score_delta: 1, is_main_frame: true}}},
          {name: 'LayoutShift', cat, args: {frame: otherMainFrame, data: {had_recent_input: false, score: 1, weighted_score_delta: 1, is_main_frame: true}}}
          /* eslint-enable max-len */
        );
        const result = await CumulativeLayoutShift.request(trace, context);
        expect(result).toMatchObject({
          cumulativeLayoutShift: 3,
          cumulativeLayoutShiftMainFrame: 1,
          impactByNodeId: new Map(),
        });
      });
    });

    describe('layout shift session/cluster bounds', () => {
      it('counts gaps > 1s and limits cluster length to <= 5s (only main frame)', async () => {
        const shiftEvents = [
          {score: 1, ts: 1_000_000},
          {score: 1, ts: 2_000_000}, // All of these included since exactly 1s after the last.
          {score: 1, ts: 3_000_000},
          {score: 1, ts: 4_000_000},
          {score: 1, ts: 5_000_000},
          {score: 1, ts: 6_000_000}, // Included since exactly 5s after beginning of cluster.
        ];
        const trace = makeTrace(shiftEvents);
        const result = await CumulativeLayoutShift.request(trace, context);
        expect(result).toMatchObject({
          cumulativeLayoutShift: 6,
          cumulativeLayoutShiftMainFrame: 6,
          impactByNodeId: new Map(),
        });
      });

      it('counts gaps > 1s and limits cluster length to <= 5s (multiple frames)', async () => {
        const shiftEvents = [
          {score: 1, ts: 1_000_000},
          {score: 1, ts: 2_000_000, is_main_frame: false}, // All of these included since exactly 1s after the last.
          {score: 1, ts: 3_000_000},
          {score: 1, ts: 4_000_000, is_main_frame: false},
          {score: 1, ts: 5_000_000},
          {score: 1, ts: 6_000_000, is_main_frame: false}, // Included since exactly 5s after beginning of cluster.
          {score: 1, ts: 6_000_001}, // Not included since >5s after beginning of cluster.
        ];
        const trace = makeTrace(shiftEvents);
        const result = await CumulativeLayoutShift.request(trace, context);
        expect(result).toMatchObject({
          cumulativeLayoutShift: 6,
          cumulativeLayoutShiftMainFrame: 1,
          impactByNodeId: new Map(),
        });
      });

      it('only counts gaps > 1s', async () => {
        const shiftEvents = [
          {score: 1, ts: 1_000_000},
          {score: 1, ts: 2_000_000}, // Included since exactly 1s later.
        ];
        const trace = makeTrace(shiftEvents);
        const result = await CumulativeLayoutShift.request(trace, context);
        expect(result).toMatchObject({
          cumulativeLayoutShift: 2,
          cumulativeLayoutShiftMainFrame: 2,
          impactByNodeId: new Map(),
        });
      });

      it('only counts gaps > 1s (multiple frames)', async () => {
        const shiftEvents = [
          {score: 1, ts: 1_000_000},
          {score: 1, ts: 2_000_000, is_main_frame: false}, // Included since exactly 1s later.
        ];
        const trace = makeTrace(shiftEvents);
        const result = await CumulativeLayoutShift.request(trace, context);
        expect(result).toMatchObject({
          cumulativeLayoutShift: 2,
          cumulativeLayoutShiftMainFrame: 1,
          impactByNodeId: new Map(),
        });
      });
    });
  });

  describe('getImpactByNodeId', () => {
    it('combines scores for the same nodeId across multiple shift events', () => {
      const layoutShiftEvents = [
        {
          ts: 1_000_000,
          isMainFrame: true,
          weightedScore: 1,
          impactedNodes: [
            {
              new_rect: [0, 0, 200, 200],
              node_id: 60,
              old_rect: [0, 0, 200, 100],
            },
            {
              new_rect: [0, 300, 200, 200],
              node_id: 25,
              old_rect: [0, 100, 200, 100],
            },
          ],
        },
        {
          ts: 2_000_000,
          isMainFrame: true,
          weightedScore: 0.3,
          impactedNodes: [
            {
              new_rect: [0, 100, 200, 200],
              node_id: 60,
              old_rect: [0, 0, 200, 200],
            },
          ],
        },
      ];

      const impactByNodeId = CumulativeLayoutShift.getImpactByNodeId(layoutShiftEvents);
      expect(Array.from(impactByNodeId.entries())).toEqual([
        [60, 0.7],
        [25, 0.6],
      ]);
    });

    it('ignores events with no impacted nodes', () => {
      const layoutShiftEvents = [
        {
          ts: 1_000_000,
          isMainFrame: true,
          weightedScore: 1,
          impactedNodes: [
            {
              new_rect: [0, 0, 200, 200],
              node_id: 60,
              old_rect: [0, 0, 200, 100],
            },
            {
              new_rect: [0, 300, 200, 200],
              node_id: 25,
              old_rect: [0, 100, 200, 100],
            },
          ],
        },
        {
          ts: 2_000_000,
          isMainFrame: true,
          weightedScore: 0.3,
        },
      ];

      const impactByNodeId = CumulativeLayoutShift.getImpactByNodeId(layoutShiftEvents);
      expect(Array.from(impactByNodeId.entries())).toEqual([
        [60, 0.4],
        [25, 0.6],
      ]);
    });

    it('ignores malformed impacted nodes', () => {
      const layoutShiftEvents = [
        {
          ts: 1_000_000,
          isMainFrame: true,
          weightedScore: 1,
          impactedNodes: [
            {
              // Malformed, no old_rect
              // Entire weightedScore is therefore attributed to node_id 25
              new_rect: [0, 0, 200, 200],
              node_id: 60,
            },
            {
              new_rect: [0, 300, 200, 200],
              node_id: 25,
              old_rect: [0, 100, 200, 100],
            },
          ],
        },
        {
          ts: 2_000_000,
          isMainFrame: true,
          weightedScore: 0.3,
          impactedNodes: [
            {
              new_rect: [0, 100, 200, 200],
              node_id: 60,
              old_rect: [0, 0, 200, 200],
            },
          ],
        },
      ];

      const impactByNodeId = CumulativeLayoutShift.getImpactByNodeId(layoutShiftEvents);
      expect(Array.from(impactByNodeId.entries())).toEqual([
        [25, 1],
        [60, 0.3],
      ]);
    });
  });
});
