/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const UserTimingsAudit = require('../../audits/user-timings.js');
const assert = require('assert').strict;
const traceEvents = require('../fixtures/traces/trace-user-timings.json');

function generateArtifactsWithTrace(trace) {
  return {
    traces: {
      defaultPass: {traceEvents: Array.isArray(trace) ? trace : trace.traceEvents},
    },
  };
}

/* eslint-env jest */
describe('Performance: user-timings audit', () => {
  it('evaluates valid input correctly', () => {
    const artifacts = generateArtifactsWithTrace(traceEvents);
    return UserTimingsAudit.audit(artifacts, {computedCache: new Map()}).then(auditResult => {
      const blackListedUTs = auditResult.extendedInfo.value.filter(timing => {
        return UserTimingsAudit.blacklistedPrefixes.some(prefix => timing.name.startsWith(prefix));
      });
      assert.equal(blackListedUTs.length, 0, 'Blacklisted usertimings included in results');

      assert.equal(auditResult.score, 0);
      expect(auditResult.displayValue).toBeDisplayString('2 user timings');

      assert.equal(auditResult.details.items[0].name, 'measure_test');
      assert.equal(auditResult.details.items[0].timingType, 'Measure');
      assert.equal(auditResult.details.items[0].startTime, 0.002);
      assert.equal(auditResult.details.items[0].duration, 1000.965);

      assert.equal(auditResult.details.items[1].name, 'mark_test');
      assert.equal(auditResult.details.items[1].timingType, 'Mark');
      assert.equal(auditResult.details.items[1].startTime, 1000.954);
      assert.equal(auditResult.details.items[1].duration, undefined);
    });
  });

  it('doesn\'t throw when user_timing events have a colon', () => {
    const extraTraceEvents = traceEvents.concat([
      {
        'pid': 41904,
        'tid': 1295,
        'ts': 1676836141,
        'ph': 'R',
        'id': 'fake-event',
        'cat': 'blink.user_timing',
        'name': 'Zone:ZonePromise',
        'dur': 64,
        'tdur': 61,
        'tts': 881373,
        'args': {},
      },
    ]);

    const artifacts = generateArtifactsWithTrace(extraTraceEvents);
    return UserTimingsAudit.audit(artifacts, {computedCache: new Map()}).then(result => {
      const fakeEvt = result.extendedInfo.value.find(item => item.name === 'Zone:ZonePromise');
      assert.ok(fakeEvt, 'failed to find user timing item with colon');
    });
  });
});
