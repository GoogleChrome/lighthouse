/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit.js');
const MainThreadTasksComputed = require('../computed/main-thread-tasks.js');
const NetworkRecordsComputed = require('../computed/network-records.js');
const NetworkAnalysisComputed = require('../computed/network-analysis.js');
const NetworkAnalyzer = require('../lib/dependency-graph/simulator/network-analyzer.js');

class Diagnostics extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'diagnostics',
      scoreDisplayMode: Audit.SCORING_MODES.INFORMATIVE,
      title: 'Diagnostics',
      description: 'Collection of useful page vitals.',
      requiredArtifacts: ['traces', 'devtoolsLogs'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const trace = artifacts.traces[Audit.DEFAULT_PASS];
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    const tasks = await MainThreadTasksComputed.request(trace, context);
    const records = await NetworkRecordsComputed.request(devtoolsLog, context);
    const analysis = await NetworkAnalysisComputed.request(devtoolsLog, context);

    const toplevelTasks = tasks.filter(t => !t.parent);
    const mainDocumentTransferSize = NetworkAnalyzer.findMainDocument(records).transferSize;
    const totalByteWeight = records.reduce((sum, r) => sum + (r.transferSize || 0), 0);
    const totalTaskTime = toplevelTasks.reduce((sum, t) => sum + (t.duration || 0), 0);
    const maxRtt = Math.max(...analysis.additionalRttByOrigin.values()) + analysis.rtt;
    const maxServerLatency = Math.max(...analysis.serverResponseTimeByOrigin.values());

    const diagnostics = {
      numRequests: records.length,
      numScripts: records.filter(r => r.resourceType === 'Script').length,
      numStylesheets: records.filter(r => r.resourceType === 'Stylesheet').length,
      numFonts: records.filter(r => r.resourceType === 'Font').length,
      numTasks: toplevelTasks.length,
      numTasksOver10ms: toplevelTasks.filter(t => t.duration > 10).length,
      numTasksOver25ms: toplevelTasks.filter(t => t.duration > 25).length,
      numTasksOver50ms: toplevelTasks.filter(t => t.duration > 50).length,
      numTasksOver100ms: toplevelTasks.filter(t => t.duration > 100).length,
      numTasksOver500ms: toplevelTasks.filter(t => t.duration > 500).length,
      rtt: analysis.rtt,
      throughput: analysis.throughput,
      maxRtt,
      maxServerLatency,
      totalByteWeight,
      totalTaskTime,
      mainDocumentTransferSize,
    };

    return {
      score: 1,
      details: {
        type: 'debugdata',
        // TODO: Consider not nesting diagnostics under `items`.
        items: [diagnostics],
      },
    };
  }
}

module.exports = Diagnostics;
