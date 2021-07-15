/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const LinkHeader = require('http-link-header');
const FRGatherer = require('../../fraggle-rock/gather/base-gatherer.js');
const {URL} = require('../../lib/url-shim.js');
const NetworkRecords = require('../../computed/network-records.js');
const NetworkAnalyzer = require('../../lib/dependency-graph/simulator/network-analyzer.js');
const {getNodeDetails, getElementsInDocument} = require('../../lib/page-functions.js');
const DevtoolsLog = require('./devtools-log.js');

/* globals HTMLLinkElement */

/**
 * @fileoverview
 * This gatherer collects all the effect `link` elements, both in the page and declared in the
 * headers of the main resource.
 */

/**
 *
 * @param {string} url
 * @param {string} finalUrl
 * @return {string|null}
 */
function normalizeUrlOrNull(url, finalUrl) {
  try {
    return new URL(url, finalUrl).href;
  } catch (_) {
    return null;
  }
}

/**
 * @param {string|undefined} value
 * @return {LH.Artifacts.LinkElement['crossOrigin']}
 */
function getCrossoriginFromHeader(value) {
  if (value === 'anonymous') return 'anonymous';
  if (value === 'use-credentials') return 'use-credentials';
  return null;
}

/**
 * @return {LH.Artifacts['LinkElements']}
 */
/* c8 ignore start */
function getLinkElementsInDOM() {
  const browserElements = getElementsInDocument('link');
  /** @type {LH.Artifacts['LinkElements']} */
  const linkElements = [];

  for (const link of browserElements) {
    // We're only interested in actual LinkElements, not `<link>` tagName elements inside SVGs.
    // https://github.com/GoogleChrome/lighthouse/issues/9764
    if (!(link instanceof HTMLLinkElement)) continue;

    const hrefRaw = link.getAttribute('href') || '';
    const source = link.closest('head') ? 'head' : 'body';

    linkElements.push({
      rel: link.rel,
      href: link.href,
      hreflang: link.hreflang,
      as: link.as,
      crossOrigin: link.crossOrigin,
      hrefRaw,
      source,
      node: getNodeDetails(link),
    });
  }

  return linkElements;
}
/* c8 ignore stop */

class LinkElements extends FRGatherer {
  constructor() {
    super();
    /**
     * This needs to be in the constructor.
     * https://github.com/GoogleChrome/lighthouse/issues/12134
     * @type {LH.Gatherer.GathererMeta<'DevtoolsLog'>}
     */
    this.meta = {
      supportedModes: ['timespan', 'navigation'],
      dependencies: {DevtoolsLog: DevtoolsLog.symbol},
    };
  }

  /**
   * @param {LH.Gatherer.FRTransitionalContext} context
   * @return {Promise<LH.Artifacts['LinkElements']>}
   */
  static getLinkElementsInDOM(context) {
    // We'll use evaluateAsync because the `node.getAttribute` method doesn't actually normalize
    // the values like access from JavaScript does.
    return context.driver.executionContext.evaluate(getLinkElementsInDOM, {
      args: [],
      useIsolation: true,
      deps: [
        getNodeDetails,
        getElementsInDocument,
      ],
    });
  }

  /**
   * @param {LH.Gatherer.FRTransitionalContext} context
   * @param {LH.Artifacts.NetworkRequest[]} networkRecords
   * @return {LH.Artifacts['LinkElements']}
   */
  static getLinkElementsInHeaders(context, networkRecords) {
    const finalUrl = context.url;
    const mainDocument = NetworkAnalyzer.findMainDocument(networkRecords, finalUrl);

    /** @type {LH.Artifacts['LinkElements']} */
    const linkElements = [];

    for (const header of mainDocument.responseHeaders) {
      if (header.name.toLowerCase() !== 'link') continue;

      for (const link of LinkHeader.parse(header.value).refs) {
        linkElements.push({
          rel: link.rel || '',
          href: normalizeUrlOrNull(link.uri, finalUrl),
          hrefRaw: link.uri || '',
          hreflang: link.hreflang || '',
          as: link.as || '',
          crossOrigin: getCrossoriginFromHeader(link.crossorigin),
          source: 'headers',
          node: null,
        });
      }
    }

    return linkElements;
  }

  /**
   * @param {LH.Gatherer.FRTransitionalContext} context
   * @param {LH.Artifacts.NetworkRequest[]} networkRecords
   * @return {Promise<LH.Artifacts['LinkElements']>}
   */
  async _getArtifact(context, networkRecords) {
    const fromDOM = await LinkElements.getLinkElementsInDOM(context);
    const fromHeaders = LinkElements.getLinkElementsInHeaders(context, networkRecords);
    const linkElements = fromDOM.concat(fromHeaders);

    for (const link of linkElements) {
      // Normalize the rel for easy consumption/filtering
      link.rel = link.rel.toLowerCase();
    }

    return linkElements;
  }

  /**
   * @param {LH.Gatherer.PassContext} context
   * @param {LH.Gatherer.LoadData} loadData
   * @return {Promise<LH.Artifacts['LinkElements']>}
   */
  async afterPass(context, loadData) {
    return this._getArtifact({...context, dependencies: {}}, loadData.networkRecords);
  }

  /**
   * @param {LH.Gatherer.FRTransitionalContext<'DevtoolsLog'>} context
   * @return {Promise<LH.Artifacts['LinkElements']>}
   */
  async getArtifact(context) {
    const records = await NetworkRecords.request(context.dependencies.DevtoolsLog, context);
    return this._getArtifact(context, records);
  }
}

module.exports = LinkElements;
