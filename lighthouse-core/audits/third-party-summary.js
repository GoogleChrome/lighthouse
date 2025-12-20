/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit.js');
const BootupTime = require('./bootup-time.js');
const i18n = require('../lib/i18n/i18n.js');
const thirdPartyWeb = require('../lib/third-party-web.js');
const NetworkRecords = require('../computed/network-records.js');
const MainResource = require('../computed/main-resource.js');
const MainThreadTasks = require('../computed/main-thread-tasks.js');

const UIStrings = {
  /** Title of a diagnostic audit that provides details about the code on a web page that the user doesn't control (referred to as "third-party code"). This descriptive title is shown to users when the amount is acceptable and no user action is required. */
  title: 'Minimize third-party usage',
  /** Title of a diagnostic audit that provides details about the code on a web page that the user doesn't control (referred to as "third-party code"). This imperative title is shown to users when there is a significant amount of page execution time caused by third-party code that should be reduced. */
  failureTitle: 'Reduce the impact of third-party code',
  /** Description of a Lighthouse audit that identifies the code on the page that the user doesn't control. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Third-party code can significantly impact load performance. ' +
    'Limit the number of redundant third-party providers and try to load third-party code after ' +
    'your page has primarily finished loading. [Learn more](https://developers.google.com/web/fundamentals/performance/optimizing-content-efficiency/loading-third-party-javascript/).',
  /** Label for a table column that displays the name of a third-party provider that potentially links to their website. */
  columnThirdParty: 'Third-Party',
  /** Label for a table column that displays how much time each row spent blocking other work on the main thread, entries will be the number of milliseconds spent. */
  columnBlockingTime: 'Main-Thread Blocking Time',
  /** Summary text for the result of a Lighthouse audit that identifies the code on a web page that the user doesn't control (referred to as "third-party code"). This text summarizes the number of distinct entities that were found on the page. */
  displayValue: 'Third-party code blocked the main thread for ' +
    `{timeInMs, number, milliseconds}\xa0ms`,
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

// A page passes when all third-party code blocks for less than 250 ms.
const PASS_THRESHOLD_IN_MS = 250;

/** @typedef {import("third-party-web").IEntity} ThirdPartyEntity */

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
      requiredArtifacts: ['traces', 'devtoolsLogs', 'URL'],
    };
  }

  /**
   *
   * @param {Array<LH.Artifacts.NetworkRequest>} networkRecords
   * @param {Array<LH.Artifacts.TaskNode>} mainThreadTasks
   * @param {number} cpuMultiplier
   * @return {Map<ThirdPartyEntity, {mainThreadTime: number, transferSize: number, blockingTime: number}>}
   */
  static getSummaryByEntity(networkRecords, mainThreadTasks, cpuMultiplier) {
    /** @type {Map<ThirdPartyEntity, {mainThreadTime: number, transferSize: number, blockingTime: number}>} */
    const entities = new Map();
    const defaultEntityStat = {mainThreadTime: 0, blockingTime: 0, transferSize: 0};

    for (const request of networkRecords) {
      const entity = thirdPartyWeb.getEntity(request.url);
      if (!entity) continue;

      const entityStats = entities.get(entity) || {...defaultEntityStat};
      entityStats.transferSize += request.transferSize;
      entities.set(entity, entityStats);
    }

    const jsURLs = BootupTime.getJavaScriptURLs(networkRecords);

    for (const task of mainThreadTasks) {
      const attributeableURL = BootupTime.getAttributableURLForTask(task, jsURLs);
      const entity = thirdPartyWeb.getEntity(attributeableURL);
      if (!entity) continue;

      const entityStats = entities.get(entity) || {...defaultEntityStat};
      const taskDuration = task.selfTime * cpuMultiplier;
      // The amount of time spent on main thread is the sum of all durations.
      entityStats.mainThreadTime += taskDuration;
      // The amount of time spent *blocking* on main thread is the sum of all time longer than 50ms.
      // Note that this is not totally equivalent to the TBT definition since it fails to account for FCP,
      // but a majority of third-party work occurs after FCP and should yield largely similar numbers.
      entityStats.blockingTime += Math.max(taskDuration - 50, 0);
      entities.set(entity, entityStats);
    }

    return entities;
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const settings = context.settings || {};
    const trace = artifacts.traces[Audit.DEFAULT_PASS];
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    const networkRecords = await NetworkRecords.request(devtoolsLog, context);
    const mainResource = await MainResource.request({devtoolsLog, URL: artifacts.URL}, context);
    const mainEntity = thirdPartyWeb.getEntity(mainResource.url);
    const tasks = await MainThreadTasks.request(trace, context);
    const multiplier = settings.throttlingMethod === 'simulate' ?
      settings.throttling.cpuSlowdownMultiplier : 1;

    const summaryByEntity = ThirdPartySummary.getSummaryByEntity(networkRecords, tasks, multiplier);

    const summary = {wastedBytes: 0, wastedMs: 0};

    const results = Array.from(summaryByEntity.entries())
      // Don't consider the page we're on to be third-party.
      // e.g. Facebook SDK isn't a third-party script on facebook.com
      .filter(([entity]) => !(mainEntity && mainEntity.name === entity.name))
      .map(([entity, stats]) => {
        summary.wastedBytes += stats.transferSize;
        summary.wastedMs += stats.blockingTime;

        return {
          entity: /** @type {LH.Audit.Details.LinkValue} */ ({
            type: 'link',
            text: entity.name,
            url: entity.homepage || '',
          }),
          transferSize: stats.transferSize,
          mainThreadTime: stats.mainThreadTime,
          blockingTime: stats.blockingTime,
        };
      })
      // Sort by blocking time first, then transfer size to break ties.
      .sort((a, b) => (b.blockingTime - a.blockingTime) || (b.transferSize - a.transferSize));

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'entity', itemType: 'link', text: str_(UIStrings.columnThirdParty)},
      {key: 'transferSize', granularity: 1, itemType: 'bytes',
        text: str_(i18n.UIStrings.columnTransferSize)},
      {key: 'blockingTime', granularity: 1, itemType: 'ms',
        text: str_(UIStrings.columnBlockingTime)},
    ];

    if (!results.length) {
      return {
        score: 1,
        notApplicable: true,
      };
    }

    return {
      score: Number(summary.wastedMs <= PASS_THRESHOLD_IN_MS),
      displayValue: str_(UIStrings.displayValue, {
        timeInMs: summary.wastedMs,
      }),
      details: Audit.makeTableDetails(headings, results, summary),
    };
  }
}

module.exports = ThirdPartySummary;
module.exports.UIStrings = UIStrings;
