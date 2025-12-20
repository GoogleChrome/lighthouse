/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit.js');
const URL = require('../lib/url-shim.js');
const NetworkRecords = require('../computed/network-records.js');

class NetworkRequests extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'network-requests',
      scoreDisplayMode: Audit.SCORING_MODES.INFORMATIVE,
      title: 'Network Requests',
      description: 'Lists the network requests that were made during page load.',
      requiredArtifacts: ['devtoolsLogs'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static audit(artifacts, context) {
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    return NetworkRecords.request(devtoolsLog, context).then(records => {
      const earliestStartTime = records.reduce(
        (min, record) => Math.min(min, record.startTime),
        Infinity
      );

      /** @param {number} time */
      const timeToMs = time => time < earliestStartTime || !Number.isFinite(time) ?
        undefined : (time - earliestStartTime) * 1000;

      const results = records.map(record => {
        const endTimeDeltaMs = record.lrStatistics && record.lrStatistics.endTimeDeltaMs;
        const TCPMs = record.lrStatistics && record.lrStatistics.TCPMs;
        const requestMs = record.lrStatistics && record.lrStatistics.requestMs;
        const responseMs = record.lrStatistics && record.lrStatistics.responseMs;

        return {
          url: URL.elideDataURI(record.url),
          startTime: timeToMs(record.startTime),
          endTime: timeToMs(record.endTime),
          finished: record.finished,
          transferSize: record.transferSize,
          resourceSize: record.resourceSize,
          statusCode: record.statusCode,
          mimeType: record.mimeType,
          resourceType: record.resourceType,
          lrEndTimeDeltaMs: endTimeDeltaMs, // Only exists on Lightrider runs
          lrTCPMs: TCPMs, // Only exists on Lightrider runs
          lrRequestMs: requestMs, // Only exists on Lightrider runs
          lrResponseMs: responseMs, // Only exists on Lightrider runs
        };
      });

      // NOTE(i18n): this audit is only for debug info in the LHR and does not appear in the report.
      /** @type {LH.Audit.Details.Table['headings']} */
      const headings = [
        {key: 'url', itemType: 'url', text: 'URL'},
        {key: 'startTime', itemType: 'ms', granularity: 1, text: 'Start Time'},
        {key: 'endTime', itemType: 'ms', granularity: 1, text: 'End Time'},
        {
          key: 'transferSize',
          itemType: 'bytes',
          displayUnit: 'kb',
          granularity: 1,
          text: 'Transfer Size',
        },
        {
          key: 'resourceSize',
          itemType: 'bytes',
          displayUnit: 'kb',
          granularity: 1,
          text: 'Resource Size',
        },
        {key: 'statusCode', itemType: 'text', text: 'Status Code'},
        {key: 'mimeType', itemType: 'text', text: 'MIME Type'},
        {key: 'resourceType', itemType: 'text', text: 'Resource Type'},
      ];

      const tableDetails = Audit.makeTableDetails(headings, results);

      return {
        score: 1,
        details: tableDetails,
      };
    });
  }
}

module.exports = NetworkRequests;
