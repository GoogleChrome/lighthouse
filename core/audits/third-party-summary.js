/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Audit} from './audit.js';
import {EntityClassification} from '../computed/entity-classification.js';
import * as i18n from '../lib/i18n/i18n.js';
import {NetworkRecords} from '../computed/network-records.js';
import {getJavaScriptURLs, getAttributableURLForTask} from '../lib/tracehouse/task-summary.js';
import {TBTImpactTasks} from '../computed/tbt-impact-tasks.js';

const UIStrings = {
  /** Title of a diagnostic audit that provides details about the code on a web page that the user doesn't control (referred to as "third-party code"). This descriptive title is shown to users when the amount is acceptable and no user action is required. */
  title: 'Minimize third-party usage',
  /** Title of a diagnostic audit that provides details about the code on a web page that the user doesn't control (referred to as "third-party code"). This imperative title is shown to users when there is a significant amount of page execution time caused by third-party code that should be reduced. */
  failureTitle: 'Reduce the impact of third-party code',
  /** Description of a Lighthouse audit that identifies the code on the page that the user doesn't control. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Third-party code can significantly impact load performance. ' +
    'Limit the number of redundant third-party providers and try to load third-party code after ' +
    'your page has primarily finished loading. ' +
    '[Learn how to minimize third-party impact](https://developers.google.com/web/fundamentals/performance/optimizing-content-efficiency/loading-third-party-javascript/).',
  /** Label for a table column that displays the name of a third-party provider that potentially links to their website. */
  columnThirdParty: 'Third-Party',
  /** Summary text for the result of a Lighthouse audit that identifies the code on a web page that the user doesn't control (referred to as "third-party code"). This text summarizes the number of distinct entities that were found on the page. */
  displayValue: 'Third-party code blocked the main thread for ' +
    `{timeInMs, number, milliseconds}\xa0ms`,
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

// A page passes when all third-party code blocks for less than 250 ms.
const PASS_THRESHOLD_IN_MS = 250;

/**
 * @typedef Summary
 * @property {number} mainThreadTime
 * @property {number} transferSize
 * @property {number} blockingTime
 * @property {number} tbtImpact
 */

/**
 * @typedef URLSummary
 * @property {number} transferSize
 * @property {number} blockingTime
 * @property {number} tbtImpact
 * @property {string | LH.IcuMessage} url
 */

/** @typedef SummaryMaps
 * @property {Map<LH.Artifacts.Entity, Summary>} byEntity Map of impact summaries for each entity.
 * @property {Map<string, Summary>} byURL Map of impact summaries for each URL.
 * @property {Map<LH.Artifacts.Entity, string[]>} urls Map of URLs under each entity.
 */

class ThirdPartySummary extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'third-party-summary',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      guidanceLevel: 1,
      scoreDisplayMode: Audit.SCORING_MODES.METRIC_SAVINGS,
      requiredArtifacts: ['Trace', 'DevtoolsLog', 'URL', 'GatherContext', 'SourceMaps'],
    };
  }

  /**
   *
   * @param {Array<LH.Artifacts.NetworkRequest>} networkRecords
   * @param {Array<LH.Artifacts.TBTImpactTask>} tbtImpactTasks
   * @param {number} cpuMultiplier
   * @param {LH.Artifacts.EntityClassification} entityClassification
   * @return {SummaryMaps}
   */
  static getSummaries(networkRecords, tbtImpactTasks, cpuMultiplier, entityClassification) {
    /** @type {Map<string, Summary>} */
    const byURL = new Map();
    /** @type {Map<LH.Artifacts.Entity, Summary>} */
    const byEntity = new Map();
    const defaultSummary = {mainThreadTime: 0, blockingTime: 0, transferSize: 0, tbtImpact: 0};

    for (const request of networkRecords) {
      const urlSummary = byURL.get(request.url) || {...defaultSummary};
      urlSummary.transferSize += request.transferSize;
      byURL.set(request.url, urlSummary);
    }

    const jsURLs = getJavaScriptURLs(networkRecords);

    for (const task of tbtImpactTasks) {
      const attributableURL = getAttributableURLForTask(task, jsURLs);

      const urlSummary = byURL.get(attributableURL) || {...defaultSummary};
      const taskDuration = task.selfTime * cpuMultiplier;
      // The amount of time spent on main thread is the sum of all durations.
      urlSummary.mainThreadTime += taskDuration;
      // Blocking time is the amount of time spent on the main thread *over* 50ms.
      // This value is interpolated because not all tasks attributed to this URL are at the top level.
      //
      // Note that this is not totally equivalent to the TBT definition since it fails to account for
      // the FCP&TTI bounds of TBT.
      urlSummary.blockingTime += task.selfBlockingTime;
      // TBT impact is similar to blocking time, but it accounts for the FCP&TTI bounds of TBT.
      urlSummary.tbtImpact += task.selfTbtImpact;
      byURL.set(attributableURL, urlSummary);
    }

    // Map each URL's stat to a particular entity.
    /** @type {Map<LH.Artifacts.Entity, string[]>} */
    const urls = new Map();
    for (const [url, urlSummary] of byURL.entries()) {
      const entity = entityClassification.entityByUrl.get(url);
      if (!entity) {
        byURL.delete(url);
        continue;
      }

      const entitySummary = byEntity.get(entity) || {...defaultSummary};
      entitySummary.transferSize += urlSummary.transferSize;
      entitySummary.mainThreadTime += urlSummary.mainThreadTime;
      entitySummary.blockingTime += urlSummary.blockingTime;
      entitySummary.tbtImpact += urlSummary.tbtImpact;
      byEntity.set(entity, entitySummary);

      const entityURLs = urls.get(entity) || [];
      entityURLs.push(url);
      urls.set(entity, entityURLs);
    }

    return {byURL, byEntity, urls};
  }

  /**
   * @param {LH.Artifacts.Entity} entity
   * @param {SummaryMaps} summaries
   * @return {Array<URLSummary>}
   */
  static makeSubItems(entity, summaries) {
    const entityURLs = summaries.urls.get(entity) || [];
    const items = entityURLs
      .map(url => /** @type {URLSummary} */ ({url, ...summaries.byURL.get(url)}))
      // Sort by blocking time first, then transfer size to break ties.
      .sort((a, b) => (b.blockingTime - a.blockingTime) || (b.transferSize - a.transferSize));

    return items;
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const settings = context.settings || {};
    const devtoolsLog = artifacts.DevtoolsLog;
    const networkRecords = await NetworkRecords.request(devtoolsLog, context);
    const classifiedEntities = await EntityClassification.request(
      {URL: artifacts.URL, devtoolsLog}, context);
    const firstPartyEntity = classifiedEntities.firstParty;

    const metricComputationData = Audit.makeMetricComputationDataInput(artifacts, context);
    const tbtImpactTasks = await TBTImpactTasks.request(metricComputationData, context);

    const multiplier = settings.throttlingMethod === 'simulate' ?
      settings.throttling.cpuSlowdownMultiplier : 1;

    const summaries = ThirdPartySummary.getSummaries(
      networkRecords, tbtImpactTasks, multiplier, classifiedEntities);
    const overallSummary = {wastedBytes: 0, wastedMs: 0, tbtImpact: 0};

    const results = Array.from(summaries.byEntity.entries())
      // Don't consider the page we're on to be third-party.
      // e.g. Facebook SDK isn't a third-party script on facebook.com
      .filter(([entity]) => !(firstPartyEntity && firstPartyEntity === entity))
      .map(([entity, stats]) => {
        overallSummary.wastedBytes += stats.transferSize;
        overallSummary.wastedMs += stats.blockingTime;
        overallSummary.tbtImpact += stats.tbtImpact;

        return {
          ...stats,
          entity: entity.name,
          subItems: {
            type: /** @type {const} */ ('subitems'),
            items: ThirdPartySummary.makeSubItems(entity, summaries),
          },
        };
      })
      // Sort by blocking time first, then transfer size to break ties.
      .sort((a, b) => (b.blockingTime - a.blockingTime) || (b.transferSize - a.transferSize));

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      /* eslint-disable max-len */
      {key: 'entity', valueType: 'text', label: str_(UIStrings.columnThirdParty), subItemsHeading: {key: 'url', valueType: 'url'}},
      {key: 'transferSize', granularity: 1, valueType: 'bytes', label: str_(i18n.UIStrings.columnTransferSize), subItemsHeading: {key: 'transferSize'}},
      {key: 'blockingTime', granularity: 1, valueType: 'ms', label: str_(i18n.UIStrings.columnBlockingTime), subItemsHeading: {key: 'blockingTime'}},
      /* eslint-enable max-len */
    ];

    if (!results.length) {
      return {
        score: 1,
        notApplicable: true,
        metricSavings: {TBT: 0},
      };
    }

    const details = Audit.makeTableDetails(headings, results,
      {...overallSummary, isEntityGrouped: true});

    const passed = overallSummary.wastedMs <= PASS_THRESHOLD_IN_MS;

    return {
      score: Number(passed),
      scoreDisplayMode: passed ? Audit.SCORING_MODES.INFORMATIVE : undefined,
      displayValue: str_(UIStrings.displayValue, {
        timeInMs: overallSummary.wastedMs,
      }),
      details,
      metricSavings: {
        TBT: Math.round(overallSummary.tbtImpact),
      },
    };
  }
}

export default ThirdPartySummary;
export {UIStrings};
