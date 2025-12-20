/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Metrics = require('../../../lib/traces/pwmetrics-events.js');
const assert = require('assert').strict;

const dbwTrace = require('../../results/artifacts/defaultPass.trace.json');
const dbwResults = require('../../results/sample_v2.json');

/* eslint-env jest */
describe('metrics events class', () => {
  it('exposes metric definitions', () => {
    assert.ok(Metrics.metricsDefinitions.length > 5, 'metrics not exposed');
  });

  it('generates fake trace events', () => {
    const evts = new Metrics(dbwTrace.traceEvents, dbwResults.audits).generateFakeEvents();

    const metricsWithoutNavstart = Metrics.metricsDefinitions.length - 1;
    // The trace events must come in pairs, thus the `2 * n`
    assert.equal(evts.length, 2 * metricsWithoutNavstart, 'All expected fake events not created');

    const definitionsWithoutEvents = Metrics.metricsDefinitions
        .filter(metric => metric.id !== 'navstart')
        .filter(metric => !evts.find(e => e.name === metric.name));
    assert.strictEqual(definitionsWithoutEvents.length, 0, 'metrics are missing fake events');

    const eventsWithoutDefinitions = evts
        .filter(evt => !Metrics.metricsDefinitions.find(metric => metric.name === evt.name));
    assert.strictEqual(eventsWithoutDefinitions.length, 0, 'fake events w/o a metric definition');
  });

  it('generates fake trace events that are valid', () => {
    const evts = new Metrics(dbwTrace.traceEvents, dbwResults.audits).generateFakeEvents();
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
