/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Gatherer = require('./gatherer.js');
const NetworkAnalyzer = require('../../lib/dependency-graph/simulator/network-analyzer.js');
const NetworkRequest = require('../../lib/network-request.js');
const getElementsInDocumentString = require('../../lib/page-functions.js').getElementsInDocumentString; // eslint-disable-line max-len
const pageFunctions = require('../../lib/page-functions.js');

/* global getNodePath */

/**
 * @return {LH.Artifacts['ScriptElements']}
 */
/* istanbul ignore next */
function collectAllScriptElements() {
  /** @type {HTMLScriptElement[]} */
  // @ts-ignore - getElementsInDocument put into scope via stringification
  const scripts = getElementsInDocument('script'); // eslint-disable-line no-undef

  return scripts.map(script => {
    return {
      type: script.type || null,
      src: script.src || null,
      id: script.id || null,
      async: script.async,
      defer: script.defer,
      source: /** @type {'head'|'body'} */ (script.closest('head') ? 'head' : 'body'),
      // @ts-ignore - getNodePath put into scope via stringification
      devtoolsNodePath: getNodePath(script),
      content: script.src ? null : script.text,
      requestId: null,
    };
  });
}

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
class ScriptElements extends Gatherer {
  /**
   * @param {LH.Gatherer.PassContext} passContext
   * @param {LH.Gatherer.LoadData} loadData
   * @return {Promise<LH.Artifacts['ScriptElements']>}
   */
  async afterPass(passContext, loadData) {
    const driver = passContext.driver;
    const mainResource = NetworkAnalyzer.findMainDocument(loadData.networkRecords, passContext.url);

    /** @type {LH.Artifacts['ScriptElements']} */
    const scripts = await driver.evaluateAsync(`(() => {
      ${getElementsInDocumentString}
      ${pageFunctions.getNodePathString};
      return (${collectAllScriptElements.toString()})();
    })()`, {useIsolation: true});

    for (const script of scripts) {
      if (script.content) script.requestId = mainResource.requestId;
    }

    const scriptRecords = loadData.networkRecords
      // Ignore records from OOPIFs
      .filter(record => !record.sessionId)
      // Only get the content of script requests
      .filter(record => record.resourceType === NetworkRequest.TYPES.Script);

    // If run on a mobile device, be sensitive to memory limitations and only request one
    // record at a time.
    const scriptRecordContents = await runInSeriesOrParallel(
      scriptRecords,
      record => driver.getRequestContent(record.requestId).catch(() => ''),
      passContext.baseArtifacts.HostFormFactor === 'mobile' /* runInSeries*/ );

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
          devtoolsNodePath: '',
          type: null,
          src: record.url,
          id: null,
          async: false,
          defer: false,
          source: 'network',
          requestId: record.requestId,
          content,
        });
      }
    }

    return scripts;
  }
}

module.exports = ScriptElements;
