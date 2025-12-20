/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Diagnostics = require('../../audits/diagnostics.js');

const acceptableTrace = require('../fixtures/traces/progressive-app-m60.json');
const acceptableDevToolsLog = require('../fixtures/traces/progressive-app-m60.devtools.log.json');

/* eslint-env jest */

describe('Diagnostics audit', () => {
  it('should work', async () => {
    const artifacts = {
      traces: {defaultPass: acceptableTrace},
      devtoolsLogs: {defaultPass: acceptableDevToolsLog},
    };

    const result = await Diagnostics.audit(artifacts, {computedCache: new Map()});
    expect(result.details.items[0]).toEqual({
      maxRtt: 3.6660000041592014,
      maxServerLatency: 159.5549999910874,
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
