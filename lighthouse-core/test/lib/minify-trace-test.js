/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const minifyTrace = require('../../lib/minify-trace.js').minifyTrace;
const trace = require('../fixtures/traces/progressive-app-m60.json');
const devtoolsLog = require('../fixtures/traces/progressive-app-m60.devtools.log.json');
const MetricsAudit = require('../../audits/metrics.js');

/* eslint-env jest */

describe('minify-trace', () => {
  it('has identical metrics to unminified', async () => {
    const artifacts = {traces: {defaultPass: trace}, devtoolsLogs: {defaultPass: devtoolsLog}};
    const context = {settings: {throttlingMethod: 'simulate'}, computedCache: new Map()};
    const {details: {items: [before]}} = await MetricsAudit.audit(artifacts, context);
    const beforeSize = JSON.stringify(trace).length;

    const minifiedTrace = minifyTrace(trace);
    artifacts.traces.defaultPass = minifiedTrace;
    context.computedCache.clear();
    const {details: {items: [after]}} = await MetricsAudit.audit(artifacts, context);
    const afterSize = JSON.stringify(minifiedTrace).length;

    for (const key of Object.keys(after)) {
      // Speed Index is expected to be different because of screenshot throttling.
      // Trace End can also be different if the last event was unimportant.
      // There are many different `observed*` and `*Ts` versions, so remove with a regex.
      if (/speedIndex|traceEnd/i.test(key)) {
        delete before[key];
        delete after[key];
      }
    }

    // It should greatly reduce the size of the trace.
    expect(afterSize).toBeLessThan(beforeSize * 0.2);
    // And not affect the metrics.
    expect(after).toEqual(before);
  });
});
