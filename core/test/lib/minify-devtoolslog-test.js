/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {minifyDevtoolsLog} from '../../lib/minify-devtoolslog.js';
import MetricsAudit from '../../audits/metrics.js';
import {defaultSettings} from '../../config/constants.js';
import {getURLArtifactFromDevtoolsLog, readJson} from '../test-utils.js';

const trace = readJson('../fixtures/traces/progressive-app-m60.json', import.meta);
const devtoolsLog = readJson('../fixtures/traces/progressive-app-m60.devtools.log.json', import.meta);

describe('minify-devtoolslog', () => {
  it('has identical metrics to unminified', async () => {
    /** @type {Pick<LH.Artifacts, 'GatherContext'|'Trace'|'DevtoolsLog'|'URL'|'SourceMaps'|'HostDPR'>} */
    const artifacts = {
      GatherContext: {gatherMode: 'navigation'},
      Trace: trace,
      DevtoolsLog: devtoolsLog,
      URL: getURLArtifactFromDevtoolsLog(devtoolsLog),
      SourceMaps: [],
      HostDPR: 1,
    };
    const computedCache = new Map();
    /** @type {LH.Audit.Context} */
    const context = {
      options: {},
      settings: {...defaultSettings, throttlingMethod: 'simulate'},
      computedCache,
    };
    const beforeResult = await MetricsAudit.audit(artifacts, context);
    if (beforeResult.details?.type !== 'debugdata') throw new Error('expected debugdata');
    const [before] = beforeResult.details.items;
    const beforeSize = JSON.stringify(devtoolsLog).length;

    const minifiedDevtoolsLog = minifyDevtoolsLog(devtoolsLog);
    artifacts.DevtoolsLog = minifiedDevtoolsLog;
    computedCache.clear(); // not strictly necessary, but we'll be safe
    const afterResult = await MetricsAudit.audit(artifacts, context);
    if (afterResult.details?.type !== 'debugdata') throw new Error('expected debugdata');
    const [after] = afterResult.details.items;
    const afterSize = JSON.stringify(minifiedDevtoolsLog).length;

    // It should reduce the size of the log.
    expect(afterSize).toBeLessThan(beforeSize * 0.5);
    // And not affect the metrics.
    expect(after).toEqual(before);
  });
});
