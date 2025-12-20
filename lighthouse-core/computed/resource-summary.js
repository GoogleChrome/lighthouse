/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const makeComputedArtifact = require('./computed-artifact.js');
const NetworkRecords = require('./network-records.js');
const URL = require('../lib/url-shim.js');
const MainResource = require('./main-resource.js');
const Budget = require('../config/budget.js');
const Util = require('../report/html/renderer/util.js');

/** @typedef {{count: number, resourceSize: number, transferSize: number}} ResourceEntry */

class ResourceSummary {
  /**
   * @param {LH.Artifacts.NetworkRequest} record
   * @return {LH.Budget.ResourceType}
   */
  static determineResourceType(record) {
    if (!record.resourceType) return 'other';
    /** @type {Partial<Record<LH.Crdp.Network.ResourceType, LH.Budget.ResourceType>>} */
    const requestToResourceType = {
      'Stylesheet': 'stylesheet',
      'Image': 'image',
      'Media': 'media',
      'Font': 'font',
      'Script': 'script',
      'Document': 'document',
    };
    return requestToResourceType[record.resourceType] || 'other';
  }

  /**
   * @param {Array<LH.Artifacts.NetworkRequest>} networkRecords
   * @param {string} mainResourceURL
   * @param {LH.Audit.Context} context
   * @return {Record<LH.Budget.ResourceType, ResourceEntry>}
   */
  static summarize(networkRecords, mainResourceURL, context) {
    const resourceSummary = {
      'stylesheet': {count: 0, resourceSize: 0, transferSize: 0},
      'image': {count: 0, resourceSize: 0, transferSize: 0},
      'media': {count: 0, resourceSize: 0, transferSize: 0},
      'font': {count: 0, resourceSize: 0, transferSize: 0},
      'script': {count: 0, resourceSize: 0, transferSize: 0},
      'document': {count: 0, resourceSize: 0, transferSize: 0},
      'other': {count: 0, resourceSize: 0, transferSize: 0},
      'total': {count: 0, resourceSize: 0, transferSize: 0},
      'third-party': {count: 0, resourceSize: 0, transferSize: 0},
    };
    const budget = Budget.getMatchingBudget(context.settings.budgets, mainResourceURL);
    /** @type {ReadonlyArray<string>} */
    let firstPartyHosts = [];
    if (budget && budget.options && budget.options.firstPartyHostnames) {
      firstPartyHosts = budget.options.firstPartyHostnames;
    } else {
      const rootDomain = Util.getRootDomain(mainResourceURL);
      firstPartyHosts = [`*.${rootDomain}`];
    }

    networkRecords.filter(record => {
      // Ignore favicon.co
      // Headless Chrome does not request /favicon.ico, so don't consider this request.
      // Makes resource summary consistent across LR / other channels.
      const type = this.determineResourceType(record);
      if (type === 'other' && record.url.endsWith('/favicon.ico')) {
        return false;
      }
      // Ignore non-network protocols
      const url = new URL(record.url);
      const protocol = url.protocol.slice(0, -1); // Removes trailing ":" from protocol
      if (URL.NON_NETWORK_PROTOCOLS.includes(protocol)) {
        return false;
      }
      return true;
    }).forEach((record) => {
      const type = this.determineResourceType(record);
      resourceSummary[type].count++;
      resourceSummary[type].resourceSize += record.resourceSize;
      resourceSummary[type].transferSize += record.transferSize;

      resourceSummary.total.count++;
      resourceSummary.total.resourceSize += record.resourceSize;
      resourceSummary.total.transferSize += record.transferSize;

      const isFirstParty = firstPartyHosts.some((hostExp) => {
        const url = new URL(record.url);
        if (hostExp.startsWith('*.')) {
          return url.hostname.endsWith(hostExp.slice(2));
        }
        return url.hostname === hostExp;
      });

      if (!isFirstParty) {
        resourceSummary['third-party'].count++;
        resourceSummary['third-party'].resourceSize += record.resourceSize;
        resourceSummary['third-party'].transferSize += record.transferSize;
      }
    });
    return resourceSummary;
  }

  /**
   * @param {{URL: LH.Artifacts['URL'], devtoolsLog: LH.DevtoolsLog}} data
   * @param {LH.Audit.Context} context
   * @return {Promise<Record<LH.Budget.ResourceType,ResourceEntry>>}
   */
  static async compute_(data, context) {
    const [networkRecords, mainResource] = await Promise.all([
      NetworkRecords.request(data.devtoolsLog, context),
      MainResource.request(data, context),
    ]);
    return ResourceSummary.summarize(networkRecords, mainResource.url, context);
  }
}

module.exports = makeComputedArtifact(ResourceSummary);
