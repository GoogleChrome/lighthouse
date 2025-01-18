/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {minifyDevtoolsLog} from '../../lib/minify-devtoolslog.js';
import MetricsAudit from '../../audits/metrics.js';
import {readJson} from '../test-utils.js';

const trace = readJson('../fixtures/traces/progressive-app-m60.json', import.meta);
const devtoolsLog = readJson('../fixtures/traces/progressive-app-m60.devtools.log.json', import.meta);

describe('minify-devtoolslog', () => {
  it('has identical metrics to unminified', async () => {
    const artifacts = {
      GatherContext: {gatherMode: 'navigation'},
      traces: {defaultPass: trace},
      devtoolsLogs: {defaultPass: devtoolsLog},
    };
    const context = {settings: {throttlingMethod: 'simulate'}, computedCache: new Map()};
    const {details: {items: [before]}} = await MetricsAudit.audit(artifacts, context);
    const beforeSize = JSON.stringify(devtoolsLog).length;

    const minifiedDevtoolsLog = minifyDevtoolsLog(devtoolsLog);
    artifacts.devtoolsLogs.defaultPass = minifiedDevtoolsLog;
    context.computedCache.clear(); // not strictly necessary, but we'll be safe
    const {details: {items: [after]}} = await MetricsAudit.audit(artifacts, context);
    const afterSize = JSON.stringify(minifiedDevtoolsLog).length;

    // It should reduce the size of the log.
    expect(afterSize).toBeLessThan(beforeSize * 0.5);
    // And not affect the metrics.
    expect(after).toEqual(before);
  });
});
