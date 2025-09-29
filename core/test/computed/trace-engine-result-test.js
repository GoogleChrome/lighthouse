/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import {TraceEngineResult} from '../../computed/trace-engine-result.js';
import {defaultSettings} from '../../config/constants.js';
import {readJson} from '../test-utils.js';

const bigTrace = readJson('../fixtures/artifacts/cnn/trace.json.gz', import.meta);
const basicTrace = readJson('../fixtures/artifacts/iframe/trace.json', import.meta);

describe('TraceEngineResult', () => {
  /** @type {LH.Config.Settings} */
  let settings;
  /** @type {LH.Artifacts.ComputedContext} */
  let context;

  beforeEach(() => {
    context = {computedCache: new Map()};
    settings = JSON.parse(JSON.stringify(defaultSettings));
  });

  describe('compute_', () => {
    it('works on a basic trace', async () => {
      const result = await TraceEngineResult.request(
        {trace: basicTrace, SourceMaps: [], settings},
        context
      );
      assert.ok(result.insights);
      assert.ok(result.parsedTrace);
      Array.from(result.insights.values()).forEach(insightSet => {
        Object.entries(insightSet.model).forEach(([_, value]) => {
          expect(value).not.toBeInstanceOf(Error);
        });
      });
    });

    describe('with big trace', () => {
      let result;

      before(async () => {
        // We'll inject two events into this trace that should blend in.
        const refEvent = bigTrace.traceEvents[10_000];
        const {ts, pid, tid} = refEvent.ts;
        // These events excercise the ExtensionTraceDataHandler.
        const measureEvents = [
          {
            args: {
              callTime: 37560978917,
              detail: '{"devtools":{"track":"LH","trackGroup":"LH cool"}}',
              startTime: 893,
              traceId: 1241734641,
            },
            cat: 'blink.user_timing',
            id2: {local: '0x10f'},
            name: 'custom-boi',
            ph: 'b',
            pid,
            tid,
            ts,
          },
          {args: {}, cat: 'blink.user_timing',
            id2: {local: '0x10f'}, name: 'custom-boi', ph: 'e', pid, tid, ts: ts + 1000},
        ];

        bigTrace.traceEvents.push(...measureEvents);

        result = await TraceEngineResult.request({trace: bigTrace, SourceMaps: [], settings},
          context
        );
      });


      it('parses', async () => {
        assert.ok(result.insights);
        assert.ok(result.parsedTrace);
      });


      it('insights look ok', () => {
        Array.from(result.insights.values()).forEach(insightSet => {
          Object.entries(insightSet.model).forEach(([_, value]) => {
            expect(value).not.toBeInstanceOf(Error);
          });
        });
      });


      it('numeric values are set and look legit', () => {
        const data = result.parsedTrace;
        const shouldBeNumbers = [
          data.Meta.traceBounds.min,
          data.Meta.traceBounds.max,
          data.Meta.traceBounds.range,
          data.Meta.browserProcessId,
          data.Meta.browserThreadId,
          data.Meta.gpuProcessId,
          data.Meta.gpuThreadId,
          Array.from(data.Meta.topLevelRendererIds.values()).at(0),
          Array.from(data.Meta.frameByProcessId.keys()).at(0),
        ];
        for (const datum of shouldBeNumbers) {
          assert.equal(typeof datum, 'number');
          if (typeof datum !== 'number') {
            throw new Error();
          }
          assert.equal(isNaN(datum), false);
          assert.equal(datum > 10, true);
        }
      });

      it('string values are set and look legit', () => {
        const data = result.parsedTrace;
        const shouldBeStrings = [
          data.Meta.mainFrameId,
          data.Meta.mainFrameURL,
          Array.from(data.Meta.navigationsByFrameId.keys()).at(0),
          Array.from(data.Meta.navigationsByNavigationId.keys()).at(0),
          data.Meta.mainFrameId,
        ];

        for (const datum of shouldBeStrings) {
          assert.equal(typeof datum, 'string');
          if (typeof datum !== 'string') {
            throw new Error();
          }
          assert.equal(datum.length > 10, true);
        }
      });
    });
  });
});
