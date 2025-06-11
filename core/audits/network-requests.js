/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Audit} from './audit.js';
import UrlUtils from '../lib/url-utils.js';
import {NetworkRecords} from '../computed/network-records.js';
import {MainResource} from '../computed/main-resource.js';
import {EntityClassification} from '../computed/entity-classification.js';

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
      requiredArtifacts: ['DevtoolsLog', 'URL', 'GatherContext'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const devtoolsLog = artifacts.DevtoolsLog;
    const records = await NetworkRecords.request(devtoolsLog, context);
    const classifiedEntities = await EntityClassification.request(
      {URL: artifacts.URL, devtoolsLog}, context);
    const earliestRendererStartTime = records.reduce(
      (min, record) => Math.min(min, record.rendererStartTime),
      Infinity
    );

    // Optional mainFrameId check because the main resource is only available for
    // navigations. TODO: https://github.com/GoogleChrome/lighthouse/issues/14157
    // for the general solution to this.
    /** @type {string|undefined} */
    let mainFrameId;
    if (artifacts.GatherContext.gatherMode === 'navigation') {
      const mainResource = await MainResource.request({devtoolsLog, URL: artifacts.URL}, context);
      mainFrameId = mainResource.frameId;
    }

    /** @param {number} time */
    const normalizeTime = time => time < earliestRendererStartTime || !Number.isFinite(time) ?
      undefined : (time - earliestRendererStartTime);

    const results = records.map(record => {
      const endTimeDeltaMs = record.lrStatistics?.endTimeDeltaMs;
      const TCPMs = record.lrStatistics?.TCPMs;
      const requestMs = record.lrStatistics?.requestMs;
      const responseMs = record.lrStatistics?.responseMs;
      // Default these to undefined so omitted from JSON in the negative case.
      const isLinkPreload = record.isLinkPreload || undefined;
      const experimentalFromMainFrame = mainFrameId ?
        ((record.frameId === mainFrameId) || undefined) :
        undefined;

      const entity = classifiedEntities.entityByUrl.get(record.url);

      return {
        url: UrlUtils.elideDataURI(record.url),
        sessionTargetType: record.sessionTargetType,
        protocol: record.protocol,
        rendererStartTime: normalizeTime(record.rendererStartTime),
        networkRequestTime: normalizeTime(record.networkRequestTime),
        networkEndTime: normalizeTime(record.networkEndTime),
        finished: record.finished,
        transferSize: record.transferSize,
        resourceSize: record.resourceSize,
        statusCode: record.statusCode,
        mimeType: record.mimeType,
        resourceType: record.resourceType,
        priority: record.priority,
        isLinkPreload,
        experimentalFromMainFrame,
        entity: entity?.name,
        lrEndTimeDeltaMs: endTimeDeltaMs, // Only exists on Lightrider runs
        lrTCPMs: TCPMs, // Only exists on Lightrider runs
        lrRequestMs: requestMs, // Only exists on Lightrider runs
        lrResponseMs: responseMs, // Only exists on Lightrider runs
      };
    });

    // NOTE(i18n): this audit is only for debug info in the LHR and does not appear in the report.
    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'url', valueType: 'url', label: 'URL'},
      {key: 'protocol', valueType: 'text', label: 'Protocol'},
      {key: 'networkRequestTime', valueType: 'ms', granularity: 1, label: 'Network Request Time'},
      {key: 'networkEndTime', valueType: 'ms', granularity: 1, label: 'Network End Time'},
      {
        key: 'transferSize',
        valueType: 'bytes',
        displayUnit: 'kb',
        granularity: 1,
        label: 'Transfer Size',
      },
      {
        key: 'resourceSize',
        valueType: 'bytes',
        displayUnit: 'kb',
        granularity: 1,
        label: 'Resource Size',
      },
      {key: 'statusCode', valueType: 'text', label: 'Status Code'},
      {key: 'mimeType', valueType: 'text', label: 'MIME Type'},
      {key: 'resourceType', valueType: 'text', label: 'Resource Type'},
    ];

    const tableDetails = Audit.makeTableDetails(headings, results);

    // Include starting timestamp to allow syncing requests with navStart/metric timestamps.
    const networkStartTimeTs = Number.isFinite(earliestRendererStartTime) ?
        earliestRendererStartTime * 1000 : undefined;
    tableDetails.debugData = {
      type: 'debugdata',
      networkStartTimeTs,
    };

    return {
      score: 1,
      details: tableDetails,
    };
  }
}

export default NetworkRequests;
