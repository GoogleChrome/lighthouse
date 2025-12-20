/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit.js');
const ComputedResourceSummary = require('../computed/resource-summary.js');
const i18n = require('../lib/i18n/i18n.js');

const UIStrings = {
  /** Imperative title of a Lighthouse audit that tells the user to minimize the size and quantity of resources used to load the page. */
  title: 'Keep request counts low and transfer sizes small',
  /** Description of a Lighthouse audit that tells the user that they can setup a budgets for the quantity and size of page resources. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'To set budgets for the quantity and size of page resources,' +
    ' add a budget.json file. [Learn more](https://developers.google.com/web/tools/lighthouse/audits/budgets).',
  /** [ICU Syntax] Label for an audit identifying the number of requests and kilobytes used to load the page. */
  displayValue: `{requestCount, plural, ` +
    `=1 {1 request • {byteCount, number, bytes} KB} ` +
    `other {# requests • {byteCount, number, bytes} KB}}`,
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

class ResourceSummary extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'resource-summary',
      title: str_(UIStrings.title),
      description: str_(UIStrings.description),
      scoreDisplayMode: Audit.SCORING_MODES.INFORMATIVE,
      requiredArtifacts: ['devtoolsLogs', 'URL'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    const summary = await ComputedResourceSummary
      .request({devtoolsLog, URL: artifacts.URL}, context);

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'label', itemType: 'text', text: str_(i18n.UIStrings.columnResourceType)},
      {key: 'requestCount', itemType: 'numeric', text: str_(i18n.UIStrings.columnRequests)},
      {key: 'transferSize', itemType: 'bytes', text: str_(i18n.UIStrings.columnTransferSize)},
    ];


    /** @type {Record<LH.Budget.ResourceType,string>} */
    const strMappings = {
      'total': str_(i18n.UIStrings.totalResourceType),
      'document': str_(i18n.UIStrings.documentResourceType),
      'script': str_(i18n.UIStrings.scriptResourceType),
      'stylesheet': str_(i18n.UIStrings.stylesheetResourceType),
      'image': str_(i18n.UIStrings.imageResourceType),
      'media': str_(i18n.UIStrings.mediaResourceType),
      'font': str_(i18n.UIStrings.fontResourceType),
      'other': str_(i18n.UIStrings.otherResourceType),
      'third-party': str_(i18n.UIStrings.thirdPartyResourceType),
    };

    const types = /** @type {Array<LH.Budget.ResourceType>} */ (Object.keys(summary));
    const rows = types.map(type => {
      return {
        // ResourceType is included as an "id" for ease of use.
        // It does not appear directly in the table.
        resourceType: type,
        label: strMappings[type],
        requestCount: summary[type].count,
        transferSize: summary[type].transferSize,
      };
    });
    // Force third-party to be last, descending by size otherwise
    const thirdPartyRow = rows.find(r => r.resourceType === 'third-party') || [];
    const otherRows = rows.filter(r => r.resourceType !== 'third-party')
      .sort((a, b) => {
        return b.transferSize - a.transferSize;
      });
    const tableItems = otherRows.concat(thirdPartyRow);

    const tableDetails = Audit.makeTableDetails(headings, tableItems);

    return {
      details: tableDetails,
      score: 1,
      displayValue: str_(UIStrings.displayValue, {
        requestCount: summary.total.count,
        byteCount: summary.total.transferSize,
      }),
    };
  }
}

module.exports = ResourceSummary;
module.exports.UIStrings = UIStrings;
