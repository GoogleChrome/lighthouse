/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit.js');
const ResourceSummary = require('../computed/resource-summary.js');
const MainResource = require('../computed/main-resource.js');
const Budget = require('../config/budget.js');
const i18n = require('../lib/i18n/i18n.js');

const UIStrings = {
  /** Title of a Lighthouse audit that compares the size and quantity of page resources against targets set by the user. These targets are thought of as "performance budgets" because these metrics impact page performance (i.e. how quickly a page loads). */
  title: 'Performance budget',
  /** Description of a Lighthouse audit where a user sets budgets for the quantity and size of page resources. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Keep the quantity and size of network requests under the targets ' +
    'set by the provided performance budget. [Learn more](https://developers.google.com/web/tools/lighthouse/audits/budgets).',
  /** [ICU Syntax] Entry in a data table identifying the number of network requests of a particular type. Count will be a whole number. String should be as short as possible to be able to fit well into the table. */
  requestCountOverBudget: `{count, plural,
    =1 {1 request}
    other {# requests}
   }`,
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

/** @typedef {import('../computed/resource-summary.js').ResourceEntry} ResourceEntry */
/** @typedef {{resourceType: LH.Budget.ResourceType, label: string, requestCount: number, transferSize: number, sizeOverBudget: number | undefined, countOverBudget: string | undefined}} BudgetItem */

class ResourceBudget extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'performance-budget',
      title: str_(UIStrings.title),
      description: str_(UIStrings.description),
      scoreDisplayMode: Audit.SCORING_MODES.INFORMATIVE,
      requiredArtifacts: ['devtoolsLogs', 'URL'],
    };
  }

  /**
   * @param {LH.Budget.ResourceType} resourceType
   * @return {string}
   */
  static getRowLabel(resourceType) {
    /** @type {Record<LH.Budget.ResourceType,string>} */
    const strMappings = {
      'total': i18n.UIStrings.totalResourceType,
      'document': i18n.UIStrings.documentResourceType,
      'script': i18n.UIStrings.scriptResourceType,
      'stylesheet': i18n.UIStrings.stylesheetResourceType,
      'image': i18n.UIStrings.imageResourceType,
      'media': i18n.UIStrings.mediaResourceType,
      'font': i18n.UIStrings.fontResourceType,
      'other': i18n.UIStrings.otherResourceType,
      'third-party': i18n.UIStrings.thirdPartyResourceType,
    };
    return strMappings[resourceType];
  }

  /**
   * @param {Immutable<LH.Budget>} budget
   * @param {Record<LH.Budget.ResourceType, ResourceEntry>} summary
   * @return {Array<BudgetItem>}
   */
  static tableItems(budget, summary) {
    const resourceTypes = /** @type {Array<LH.Budget.ResourceType>} */ (Object.keys(summary));
    return resourceTypes.map((resourceType) => {
      const label = str_(this.getRowLabel(resourceType));
      const requestCount = summary[resourceType].count;
      const transferSize = summary[resourceType].transferSize;

      let sizeOverBudget;
      let countOverBudget;

      if (budget.resourceSizes) {
        const sizeBudget = budget.resourceSizes.find(b => b.resourceType === resourceType);
        if (sizeBudget && (transferSize > (sizeBudget.budget * 1024))) {
          sizeOverBudget = transferSize - (sizeBudget.budget * 1024);
        }
      }
      if (budget.resourceCounts) {
        const countBudget = budget.resourceCounts.find(b => b.resourceType === resourceType);
        if (countBudget && (requestCount > countBudget.budget)) {
          const requestDifference = requestCount - countBudget.budget;
          countOverBudget = str_(UIStrings.requestCountOverBudget, {count: requestDifference});
        }
      }
      return {
        resourceType,
        label,
        requestCount,
        transferSize,
        countOverBudget,
        sizeOverBudget,
      };
    }).filter((row) => {
      // Only resources with budgets should be included in the table
      if (budget.resourceSizes) {
        if (budget.resourceSizes.some(b => b.resourceType === row.resourceType)) return true;
      }
      if (budget.resourceCounts) {
        if (budget.resourceCounts.some(b => b.resourceType === row.resourceType)) return true;
      }
      return false;
    }).sort((a, b) => {
      return (b.sizeOverBudget || 0) - (a.sizeOverBudget || 0);
    });
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    const summary = await ResourceSummary.request({devtoolsLog, URL: artifacts.URL}, context);
    const mainResource = await MainResource.request({URL: artifacts.URL, devtoolsLog}, context);
    const budget = Budget.getMatchingBudget(context.settings.budgets, mainResource.url);

    if (!budget) {
      return {
        score: 0,
        notApplicable: true,
      };
    }

    /** @type {LH.Audit.Details.Table['headings']} */
    const headers = [
      {key: 'label', itemType: 'text', text: str_(i18n.UIStrings.columnResourceType)},
      {key: 'requestCount', itemType: 'numeric', text: str_(i18n.UIStrings.columnRequests)},
      {key: 'transferSize', itemType: 'bytes', text: str_(i18n.UIStrings.columnTransferSize)},
      {key: 'countOverBudget', itemType: 'text', text: ''},
      {key: 'sizeOverBudget', itemType: 'bytes', text: str_(i18n.UIStrings.columnOverBudget)},
    ];

    return {
      details: Audit.makeTableDetails(headers,
        this.tableItems(budget, summary)),
      score: 1,
    };
  }
}

module.exports = ResourceBudget;
module.exports.UIStrings = UIStrings;
