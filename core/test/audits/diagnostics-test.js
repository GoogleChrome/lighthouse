/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import Diagnostics from '../../audits/diagnostics.js';
import {readJson} from '../test-utils.js';

const acceptableTrace = readJson('../fixtures/traces/progressive-app-m60.json', import.meta);
const acceptableDevToolsLog = readJson('../fixtures/traces/progressive-app-m60.devtools.log.json', import.meta);

describe('Diagnostics audit', () => {
  it('should work', async () => {
    const artifacts = {
      traces: {defaultPass: acceptableTrace},
      devtoolsLogs: {defaultPass: acceptableDevToolsLog},
      URL: {
        mainDocumentUrl: 'https://pwa.rocks/',
      },
    };

    const result = await Diagnostics.audit(artifacts, {computedCache: new Map()});
    expect(result.details.items[0]).toEqual({
      maxRtt: 3.6660000041592014,
      maxServerLatency: 159.70249997917608,
      numFonts: 1,
      numRequests: 66,
      numScripts: 6,
      numStylesheets: 0,
      numTasks: 547,
      numTasksOver10ms: 13,
      numTasksOver25ms: 8,
      numTasksOver50ms: 4,
      numTasksOver100ms: 1,
      numTasksOver500ms: 0,
      rtt: 2.6209999923595007,
      throughput: 1628070.200017642,
      totalByteWeight: 234053,
      totalTaskTime: 1360.2630000000001,
      mainDocumentTransferSize: 5368,
    });
  });
});
