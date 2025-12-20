/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const makeComputedArtifact = require('./computed-artifact.js');
const NetworkAnalyzer = require('../lib/dependency-graph/simulator/network-analyzer.js');
const NetworkRecords = require('./network-records.js');

class NetworkAnalysis {
  /**
   * @param {Array<LH.Artifacts.NetworkRequest>} records
   * @return {StrictOmit<LH.Artifacts.NetworkAnalysis, 'throughput'>}
   */
  static computeRTTAndServerResponseTime(records) {
    // First pass compute the estimated observed RTT to each origin's servers.
    /** @type {Map<string, number>} */
    const rttByOrigin = new Map();
    for (const [origin, summary] of NetworkAnalyzer.estimateRTTByOrigin(records).entries()) {
      rttByOrigin.set(origin, summary.min);
    }

    // We'll use the minimum RTT as the assumed connection latency since we care about how much addt'l
    // latency each origin introduces as Lantern will be simulating with its own connection latency.
    const minimumRtt = Math.min(...Array.from(rttByOrigin.values()));
    // We'll use the observed RTT information to help estimate the server response time
    const responseTimeSummaries = NetworkAnalyzer.estimateServerResponseTimeByOrigin(records, {
      rttByOrigin,
    });

    /** @type {Map<string, number>} */
    const additionalRttByOrigin = new Map();
    /** @type {Map<string, number>} */
    const serverResponseTimeByOrigin = new Map();
    for (const [origin, summary] of responseTimeSummaries.entries()) {
      // Not all origins have usable timing data, we'll default to using no additional latency.
      const rttForOrigin = rttByOrigin.get(origin) || minimumRtt;
      additionalRttByOrigin.set(origin, rttForOrigin - minimumRtt);
      serverResponseTimeByOrigin.set(origin, summary.median);
    }

    return {
      rtt: minimumRtt,
      additionalRttByOrigin,
      serverResponseTimeByOrigin,
    };
  }

  /**
   * @param {LH.DevtoolsLog} devtoolsLog
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Artifacts.NetworkAnalysis>}
   */
  static async compute_(devtoolsLog, context) {
    const records = await NetworkRecords.request(devtoolsLog, context);
    const throughput = NetworkAnalyzer.estimateThroughput(records);
    const rttAndServerResponseTime = NetworkAnalysis.computeRTTAndServerResponseTime(records);
    return {throughput, ...rttAndServerResponseTime};
  }
}

module.exports = makeComputedArtifact(NetworkAnalysis);
