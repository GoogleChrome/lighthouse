/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Audit which identifies third-party code on the page which can be lazy loaded.
 * The audit will recommend a facade alternative which is used to imitate the third-party resource until it is needed.
 *
 * Entity: Set of domains which are used by a company or product area to deliver third-party resources
 * Product: Specific piece of software belonging to an entity. Entities can have multiple products.
 * Facade: Placeholder for a product which looks likes the actual product and replaces itself with that product when the user needs it.
 */

/** @typedef {import("third-party-web").IEntity} ThirdPartyEntity */
/** @typedef {import("third-party-web").IProduct} ThirdPartyProduct*/
/** @typedef {import("third-party-web").IFacade} ThirdPartyFacade*/

/** @typedef {{product: ThirdPartyProduct, entity: ThirdPartyEntity}} FacadableProduct */

import {Audit} from './audit.js';
import * as i18n from '../lib/i18n/i18n.js';
import {EntityClassification} from '../computed/entity-classification.js';
import thirdPartyWeb from '../lib/third-party-web.js';
import {NetworkRecords} from '../computed/network-records.js';
import ThirdPartySummary from './third-party-summary.js';
import {TBTImpactTasks} from '../computed/tbt-impact-tasks.js';

const UIStrings = {
  /** Title of a diagnostic audit that provides details about the third-party code on a web page that can be lazy loaded with a facade alternative. This descriptive title is shown to users when no resources have facade alternatives available. A facade is a lightweight component which looks like the desired resource. Lazy loading means resources are deferred until they are needed. Third-party code refers to resources that are not within the control of the site owner. */
  title: 'Lazy load third-party resources with facades',
  /** Title of a diagnostic audit that provides details about the third-party code on a web page that can be lazy loaded with a facade alternative. This descriptive title is shown to users when one or more third-party resources have available facade alternatives. A facade is a lightweight component which looks like the desired resource. Lazy loading means resources are deferred until they are needed. Third-party code refers to resources that are not within the control of the site owner. */
  failureTitle: 'Some third-party resources can be lazy loaded with a facade',
  /** Description of a Lighthouse audit that identifies the third-party code on the page that can be lazy loaded with a facade alternative. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. A facade is a lightweight component which looks like the desired resource. Lazy loading means resources are deferred until they are needed. Third-party code refers to resources that are not within the control of the site owner. */
  description: 'Some third-party embeds can be lazy loaded. ' +
    'Consider replacing them with a facade until they are required. ' +
    '[Learn how to defer third-parties with a facade](https://developer.chrome.com/docs/lighthouse/performance/third-party-facades/).',
  /** Summary text for the result of a Lighthouse audit that identifies the third-party code on a web page that can be lazy loaded with a facade alternative. This text summarizes the number of lazy loading facades that can be used on the page. A facade is a lightweight component which looks like the desired resource. */
  displayValue: `{itemCount, plural,
  =1 {# facade alternative available}
  other {# facade alternatives available}
  }`,
  /** Label for a table column that displays the name of the product that a URL is used for. The products in the column will be pieces of software used on the page, like the "YouTube Embedded Player" or the "Drift Live Chat" box. */
  columnProduct: 'Product',
  /**
   * @description Template for a table entry that gives the name of a product which we categorize as video related.
   * @example {YouTube Embedded Player} productName
   */
  categoryVideo: '{productName} (Video)',
  /**
   * @description Template for a table entry that gives the name of a product which we categorize as customer success related. Customer success means the product supports customers by offering chat and contact solutions.
   * @example {Intercom Widget} productName
   */
  categoryCustomerSuccess: '{productName} (Customer Success)',
  /**
   * @description Template for a table entry that gives the name of a product which we categorize as marketing related.
   * @example {Drift Live Chat} productName
   */
  categoryMarketing: '{productName} (Marketing)',
  /**
   * @description Template for a table entry that gives the name of a product which we categorize as social related.
   * @example {Facebook Messenger Customer Chat} productName
   */
  categorySocial: '{productName} (Social)',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

/** @type {Record<string, string>} */
const CATEGORY_UI_MAP = {
  'video': UIStrings.categoryVideo,
  'customer-success': UIStrings.categoryCustomerSuccess,
  'marketing': UIStrings.categoryMarketing,
  'social': UIStrings.categorySocial,
};

class ThirdPartyFacades extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'third-party-facades',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      supportedModes: ['navigation'],
      guidanceLevel: 3,
      requiredArtifacts: ['Trace', 'DevtoolsLog', 'URL', 'GatherContext', 'SourceMaps'],
      scoreDisplayMode: Audit.SCORING_MODES.METRIC_SAVINGS,
    };
  }

  /**
   * Sort items by transfer size and combine small items into a single row.
   * Items will be mutated in place to a maximum of 6 rows.
   * @param {import('./third-party-summary.js').URLSummary[]} items
   */
  static condenseItems(items) {
    items.sort((a, b) => b.transferSize - a.transferSize);

    // Items <1KB are condensed. If all items are <1KB, condense all but the largest.
    let splitIndex = items.findIndex((item) => item.transferSize < 1000) || 1;
    // Show details for top 5 items.
    if (splitIndex === -1 || splitIndex > 5) splitIndex = 5;
    // If there is only 1 item to condense, leave it as is.
    if (splitIndex >= items.length - 1) return;

    const remainder = items.splice(splitIndex);
    const finalItem = remainder.reduce((result, item) => {
      result.transferSize += item.transferSize;
      result.blockingTime += item.blockingTime;
      return result;
    });

    // If condensed row is still <1KB, don't show it.
    if (finalItem.transferSize < 1000) return;

    finalItem.url = str_(i18n.UIStrings.otherResourcesLabel);
    items.push(finalItem);
  }

  /**
   * @param {Map<string, import('./third-party-summary.js').Summary>} byURL
   * @param {LH.Artifacts.EntityClassification} classifiedEntities
   * @return {FacadableProduct[]}
   */
  static getProductsWithFacade(byURL, classifiedEntities) {
    /** @type {Map<string, FacadableProduct>} */
    const facadableProductMap = new Map();
    for (const url of byURL.keys()) {
      const entity = classifiedEntities.entityByUrl.get(url);
      if (!entity || classifiedEntities.isFirstParty(url)) continue;

      const product = thirdPartyWeb.getProduct(url);
      if (!product || !product.facades || !product.facades.length) continue;

      if (facadableProductMap.has(product.name)) continue;
      facadableProductMap.set(product.name, {product, entity});
    }

    return Array.from(facadableProductMap.values());
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const settings = context.settings;
    const devtoolsLog = artifacts.DevtoolsLog;
    const networkRecords = await NetworkRecords.request(devtoolsLog, context);
    const classifiedEntities = await EntityClassification.request(
      {URL: artifacts.URL, devtoolsLog}, context);

    const metricComputationData = Audit.makeMetricComputationDataInput(artifacts, context);
    const tbtImpactTasks = await TBTImpactTasks.request(metricComputationData, context);

    const multiplier = settings.throttlingMethod === 'simulate' ?
      settings.throttling.cpuSlowdownMultiplier : 1;
    const summaries = ThirdPartySummary.getSummaries(networkRecords, tbtImpactTasks, multiplier,
      classifiedEntities);
    const facadableProducts =
      ThirdPartyFacades.getProductsWithFacade(summaries.byURL, classifiedEntities);

    let tbtImpact = 0;

    /** @type {LH.Audit.Details.TableItem[]} */
    const results = [];
    for (const {product, entity} of facadableProducts) {
      const categoryTemplate = CATEGORY_UI_MAP[product.categories[0]];

      let productWithCategory;
      if (categoryTemplate) {
        // Display product name with category next to it in the same column.
        productWithCategory = str_(categoryTemplate, {productName: product.name});
      } else {
        // Just display product name if no category is found.
        productWithCategory = product.name;
      }

      const urls = summaries.urls.get(entity);
      const entitySummary = summaries.byEntity.get(entity);
      if (!urls || !entitySummary) continue;

      tbtImpact += entitySummary.tbtImpact;

      const items = Array.from(urls).map((url) => {
        const urlStats = summaries.byURL.get(url);
        return /** @type {import('./third-party-summary.js').URLSummary} */ ({url, ...urlStats});
      });
      this.condenseItems(items);
      results.push({
        product: productWithCategory,
        transferSize: entitySummary.transferSize,
        blockingTime: entitySummary.blockingTime,
        subItems: {type: 'subitems', items},
        // Add entity manually since facades don't have a single `url`.
        entity: entity.name,
      });
    }

    if (!results.length) {
      return {
        score: 1,
        notApplicable: true,
        metricSavings: {TBT: 0},
      };
    }

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      /* eslint-disable max-len */
      {key: 'product', valueType: 'text', subItemsHeading: {key: 'url', valueType: 'url'}, label: str_(UIStrings.columnProduct)},
      {key: 'transferSize', valueType: 'bytes', subItemsHeading: {key: 'transferSize'}, granularity: 1, label: str_(i18n.UIStrings.columnTransferSize)},
      {key: 'blockingTime', valueType: 'ms', subItemsHeading: {key: 'blockingTime'}, granularity: 1, label: str_(i18n.UIStrings.columnBlockingTime)},
      /* eslint-enable max-len */
    ];

    return {
      score: 0,
      displayValue: str_(UIStrings.displayValue, {
        itemCount: results.length,
      }),
      details: Audit.makeTableDetails(headings, results),
      metricSavings: {TBT: Math.round(tbtImpact)},
    };
  }
}

export default ThirdPartyFacades;
export {UIStrings};
