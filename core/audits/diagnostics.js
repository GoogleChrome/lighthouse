/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Audit} from './audit.js';
import {MainThreadTasks} from '../computed/main-thread-tasks.js';
import {NetworkRecords} from '../computed/network-records.js';
import {NetworkAnalysis} from '../computed/network-analysis.js';
import {MainResource} from '../computed/main-resource.js';

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
      supportedModes: ['navigation'],
      requiredArtifacts: ['URL', 'Trace', 'DevtoolsLog'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const trace = artifacts.Trace;
    const devtoolsLog = artifacts.DevtoolsLog;
    const tasks = await MainThreadTasks.request(trace, context);
    const records = await NetworkRecords.request(devtoolsLog, context);
    const analysis = await NetworkAnalysis.request(devtoolsLog, context);
    const mainResource = await MainResource.request({devtoolsLog, URL: artifacts.URL}, context);

    const toplevelTasks = tasks.filter(t => !t.parent);
    const mainDocumentTransferSize = mainResource.transferSize;
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

export default Diagnostics;
