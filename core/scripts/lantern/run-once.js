#!/usr/bin/env node
/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';

import * as Lantern from '../../lib/lantern/lantern.js';
import PredictivePerf from '../../audits/predictive-perf.js';
import traceSaver from '../../lib/lantern-trace-saver.js';
import {LH_ROOT} from '../../../shared/root.js';
import {readJson} from '../../test/test-utils.js';
import {DocumentUrls} from '../../computed/document-urls.js';

if (process.argv.length !== 4) throw new Error('Usage $0 <trace file> <devtools file>');

async function run() {
  const tracePath = path.resolve(process.cwd(), process.argv[2]);
  const traces = {defaultPass: readJson(tracePath)};
  const devtoolsLogs = {defaultPass: readJson(path.resolve(process.cwd(), process.argv[3]))};
  const context = {computedCache: new Map(), settings: {locale: 'en-us'}};

  const trace = traces.defaultPass;
  const devtoolsLog = devtoolsLogs.defaultPass;
  const URL = await DocumentUrls.request({trace, devtoolsLog}, context);

  const artifacts = {
    traces,
    devtoolsLogs,
    GatherContext: {gatherMode: 'navigation'},
    URL,
  };

  // @ts-expect-error - We don't need the full artifacts or context.
  const result = await PredictivePerf.audit(artifacts, context);
  if (!result.details || result.details.type !== 'debugdata') {
    throw new Error('Unexpected audit details from PredictivePerf');
  }
  process.stdout.write(JSON.stringify(result.details.items[0], null, 2));

  // Dump the TTI graph with simulated timings to a trace if LANTERN_DEBUG is enabled
  const pessimisticTTINodeTimings =
    Lantern.Simulation.Simulator.allNodeTimings.get('pessimisticInteractive');
  if (process.env.LANTERN_DEBUG && pessimisticTTINodeTimings) {
    const outputTraceFile = path.basename(tracePath).replace(/.trace.json$/, '.lantern.trace.json');
    const outputTracePath = path.join(LH_ROOT, '.tmp', outputTraceFile);
    const trace = traceSaver.convertNodeTimingsToTrace(pessimisticTTINodeTimings);
    fs.writeFileSync(outputTracePath, JSON.stringify(trace, null, 2));
  }
}

await run();
