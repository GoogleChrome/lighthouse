/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import {MetricTraceEvents} from '../../../lib/traces/metric-trace-events.js';
import {readJson} from '../../test-utils.js';

const dbwTrace = readJson('../../results/artifacts/defaultPass.trace.json', import.meta);
const dbwResults = readJson('../../results/sample_v2.json', import.meta);

describe('metrics events class', () => {
  it('exposes metric definitions', () => {
    assert.ok(MetricTraceEvents.metricsDefinitions.length > 5, 'metrics not exposed');
  });

  it('generates fake trace events', () => {
    const evts =
      new MetricTraceEvents(dbwTrace.traceEvents, dbwResults.audits).generateFakeEvents();

    const metricsMinusTimeOrigin = MetricTraceEvents.metricsDefinitions.length - 1;
    // The trace events must come in pairs, thus the `2 * n`
    assert.equal(evts.length, 2 * metricsMinusTimeOrigin, 'All expected fake events not created');

    const definitionsWithoutEvents = MetricTraceEvents.metricsDefinitions
        .filter(metric => metric.id !== 'timeorigin')
        .filter(metric => !evts.find(e => e.name === metric.name));
    assert.strictEqual(definitionsWithoutEvents.length, 0, 'metrics are missing fake events');

    const eventsWithoutDefinitions = evts.filter(
      evt => !MetricTraceEvents.metricsDefinitions.find(metric => metric.name === evt.name)
    );
    assert.strictEqual(eventsWithoutDefinitions.length, 0, 'fake events w/o a metric definition');
  });

  it('generates fake trace events that are valid', () => {
    const evts =
      new MetricTraceEvents(dbwTrace.traceEvents, dbwResults.audits).generateFakeEvents();
    const vizCompleteEvts = evts.filter(e => e.name.includes('Speed Index'));
    assert.equal(vizCompleteEvts.length, 2, 'Two visually complete 100% events not found');
    assert.equal(vizCompleteEvts[0].id, vizCompleteEvts[1].id, 'UT trace ids don\'t match');

    evts.forEach(e => {
      assert.equal(typeof e.pid, 'number');
      assert.equal(typeof e.tid, 'number');
      assert.equal(typeof e.ts, 'number');
      assert.equal(typeof e.id, 'string');
      assert.equal(typeof e.cat, 'string');
      assert.equal(typeof e.name, 'string');
      assert.equal(typeof e.ph, 'string');
      assert.equal(typeof e.args, 'object');
    });
  });
});
