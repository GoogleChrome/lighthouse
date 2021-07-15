/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const FRGatherer = require('../../fraggle-rock/gather/base-gatherer.js');
const NetworkRecords = require('../../computed/network-records.js');
const NetworkAnalyzer = require('../../lib/dependency-graph/simulator/network-analyzer.js');
const NetworkRequest = require('../../lib/network-request.js');
const {getElementsInDocument, getNodeDetails} = require('../../lib/page-functions.js');
const {fetchResponseBodyFromCache} = require('../driver/network.js');
const DevtoolsLog = require('./devtools-log.js');
const HostFormFactor = require('./host-form-factor.js');

/**
 * @return {LH.Artifacts['ScriptElements']}
 */
/* c8 ignore start */
function collectAllScriptElements() {
  const scripts = getElementsInDocument('script');

  return scripts.map(script => {
    return {
      type: script.type || null,
      src: script.src || null,
      id: script.id || null,
      async: script.async,
      defer: script.defer,
      source: script.closest('head') ? 'head' : 'body',
      content: script.src ? null : script.text,
      requestId: null,
      node: getNodeDetails(script),
    };
  });
}
/* c8 ignore stop */

/**
 * @template T, U
 * @param {Array<T>} values
 * @param {(value: T) => Promise<U>} promiseMapper
 * @param {boolean} runInSeries
 * @return {Promise<Array<U>>}
 */
async function runInSeriesOrParallel(values, promiseMapper, runInSeries) {
  if (runInSeries) {
    const results = [];
    for (const value of values) {
      const result = await promiseMapper(value);
      results.push(result);
    }
    return results;
  } else {
    const promises = values.map(promiseMapper);
    return await Promise.all(promises);
  }
}

/**
 * @fileoverview Gets JavaScript file contents.
 */
class ScriptElements extends FRGatherer {
  /** @type {LH.Gatherer.GathererMeta<'DevtoolsLog'|'HostFormFactor'>} */
  meta = {
    supportedModes: ['timespan', 'navigation'],
    dependencies: {DevtoolsLog: DevtoolsLog.symbol, HostFormFactor: HostFormFactor.symbol},
  }

  /**
   * @param {LH.Gatherer.FRTransitionalContext} context
   * @param {LH.Artifacts.NetworkRequest[]} networkRecords
   * @param {LH.Artifacts['HostFormFactor']} formFactor
   * @return {Promise<LH.Artifacts['ScriptElements']>}
   */
  async _getArtifact(context, networkRecords, formFactor) {
    const session = context.driver.defaultSession;
    const executionContext = context.driver.executionContext;
    const mainResource = NetworkAnalyzer.findOptionalMainDocument(networkRecords, context.url);

    const scripts = await executionContext.evaluate(collectAllScriptElements, {
      args: [],
      useIsolation: true,
      deps: [
        getNodeDetails,
        getElementsInDocument,
      ],
    });

    for (const script of scripts) {
      if (mainResource && script.content) script.requestId = mainResource.requestId;
    }

    const scriptRecords = networkRecords
      // Ignore records from OOPIFs
      .filter(record => !record.sessionId)
      // Only get the content of script requests
      .filter(record => record.resourceType === NetworkRequest.TYPES.Script);

    // If run on a mobile device, be sensitive to memory limitations and only request one
    // record at a time.
    const scriptRecordContents = await runInSeriesOrParallel(
      scriptRecords,
      record => fetchResponseBodyFromCache(session, record.requestId).catch(() => ''),
      formFactor === 'mobile' /* runInSeries */
    );

    for (let i = 0; i < scriptRecords.length; i++) {
      const record = scriptRecords[i];
      const content = scriptRecordContents[i];
      if (!content) continue;

      const matchedScriptElement = scripts.find(script => script.src === record.url);
      if (matchedScriptElement) {
        matchedScriptElement.requestId = record.requestId;
        matchedScriptElement.content = content;
      } else {
        scripts.push({
          type: null,
          src: record.url,
          id: null,
          async: false,
          defer: false,
          source: 'network',
          requestId: record.requestId,
          content,
          node: null,
        });
      }
    }
    return scripts;
  }

  /**
   * @param {LH.Gatherer.FRTransitionalContext<'DevtoolsLog'|'HostFormFactor'>} context
   */
  async getArtifact(context) {
    const devtoolsLog = context.dependencies.DevtoolsLog;
    const formFactor = context.dependencies.HostFormFactor;
    const networkRecords = await NetworkRecords.request(devtoolsLog, context);
    return this._getArtifact(context, networkRecords, formFactor);
  }

  /**
   * @param {LH.Gatherer.PassContext} passContext
   * @param {LH.Gatherer.LoadData} loadData
   */
  async afterPass(passContext, loadData) {
    const networkRecords = loadData.networkRecords;
    const formFactor = passContext.baseArtifacts.HostFormFactor;
    return this._getArtifact({...passContext, dependencies: {}}, networkRecords, formFactor);
  }
}

module.exports = ScriptElements;
