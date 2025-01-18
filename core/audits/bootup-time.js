/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import log from 'lighthouse-logger';

import {Audit} from './audit.js';
import {taskGroups} from '../lib/tracehouse/task-groups.js';
import * as i18n from '../lib/i18n/i18n.js';
import {NetworkRecords} from '../computed/network-records.js';
import {MainThreadTasks} from '../computed/main-thread-tasks.js';
import {getExecutionTimingsByURL} from '../lib/tracehouse/task-summary.js';
import {TBTImpactTasks} from '../computed/tbt-impact-tasks.js';
import {Sentry} from '../lib/sentry.js';
import {Util} from '../../shared/util.js';

const UIStrings = {
  /** Title of a diagnostic audit that provides detail on the time spent executing javascript files during the load. This descriptive title is shown to users when the amount is acceptable and no user action is required. */
  title: 'JavaScript execution time',
  /** Title of a diagnostic audit that provides detail on the time spent executing javascript files during the load. This imperative title is shown to users when there is a significant amount of execution time that could be reduced. */
  failureTitle: 'Reduce JavaScript execution time',
  /** Description of a Lighthouse audit that tells the user that they should reduce the amount of time spent executing javascript and one method of doing so. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Consider reducing the time spent parsing, compiling, and executing JS. ' +
    'You may find delivering smaller JS payloads helps with this. ' +
    '[Learn how to reduce Javascript execution time](https://developer.chrome.com/docs/lighthouse/performance/bootup-time/).',
  /** Label for the total time column in a data table; entries will be the number of milliseconds spent executing per resource loaded by the page. */
  columnTotal: 'Total CPU Time',
  /** Label for a time column in a data table; entries will be the number of milliseconds spent evaluating script for every script loaded by the page. */
  columnScriptEval: 'Script Evaluation',
  /** Label for a time column in a data table; entries will be the number of milliseconds spent parsing script files for every script loaded by the page. */
  columnScriptParse: 'Script Parse',
  /** A message displayed in a Lighthouse audit result warning that Chrome extensions on the user's system substantially affected Lighthouse's measurements and instructs the user on how to run again without those extensions. */
  chromeExtensionsWarning: 'Chrome extensions negatively affected this page\'s load performance. ' +
    'Try auditing the page in incognito mode or from a Chrome profile without extensions.',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class BootupTime extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'bootup-time',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      scoreDisplayMode: Audit.SCORING_MODES.METRIC_SAVINGS,
      guidanceLevel: 1,
      requiredArtifacts: ['traces', 'devtoolsLogs', 'URL', 'GatherContext'],
    };
  }

  /**
   * @return {LH.Audit.ScoreOptions & {thresholdInMs: number}}
   */
  static get defaultOptions() {
    return {
      // see https://www.desmos.com/calculator/ynl8fzh1wd
      // <500ms ~= 100, >1.3s is yellow, >3.5s is red
      p10: 1282,
      median: 3500,
      thresholdInMs: 50,
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<number>}
   */
  static async getTbtImpact(artifacts, context) {
    let tbtImpact = 0;

    try {
      const metricComputationData = Audit.makeMetricComputationDataInput(artifacts, context);
      const tasks = await TBTImpactTasks.request(metricComputationData, context);
      for (const task of tasks) {
        const groupId = task.group.id;
        if (groupId !== 'scriptEvaluation' && groupId !== 'scriptParseCompile') continue;
        tbtImpact += task.selfTbtImpact;
      }
    } catch (err) {
      Sentry.captureException(err, {
        tags: {audit: this.meta.id},
        level: 'error',
      });
      log.error(this.meta.id, err.message);
    }

    return tbtImpact;
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const settings = context.settings || {};
    const trace = artifacts.traces[BootupTime.DEFAULT_PASS];
    const devtoolsLog = artifacts.devtoolsLogs[BootupTime.DEFAULT_PASS];
    const networkRecords = await NetworkRecords.request(devtoolsLog, context);
    const tasks = await MainThreadTasks.request(trace, context);
    const multiplier = settings.throttlingMethod === 'simulate' ?
      settings.throttling.cpuSlowdownMultiplier : 1;

    const executionTimings = getExecutionTimingsByURL(tasks, networkRecords);
    // Exclude our own tasks.
    executionTimings.delete('_lighthouse-eval.js');

    const tbtImpact = await this.getTbtImpact(artifacts, context);

    let hadExcessiveChromeExtension = false;
    let totalBootupTime = 0;
    const results = Array.from(executionTimings)
      .map(([url, timingByGroupId]) => {
        // Add up the totalExecutionTime for all the taskGroups
        let totalExecutionTimeForURL = 0;
        for (const [groupId, timespanMs] of Object.entries(timingByGroupId)) {
          timingByGroupId[groupId] = timespanMs * multiplier;
          totalExecutionTimeForURL += timespanMs * multiplier;
        }

        const scriptingTotal = timingByGroupId[taskGroups.scriptEvaluation.id] || 0;
        const parseCompileTotal = timingByGroupId[taskGroups.scriptParseCompile.id] || 0;

        // Add up all the JavaScript time of shown URLs
        if (totalExecutionTimeForURL >= context.options.thresholdInMs) {
          totalBootupTime += scriptingTotal + parseCompileTotal;
        }

        hadExcessiveChromeExtension = hadExcessiveChromeExtension ||
          (url.startsWith('chrome-extension:') && scriptingTotal > 100);

        return {
          url: url,
          total: totalExecutionTimeForURL,
          // Highlight the JavaScript task costs
          scripting: scriptingTotal,
          scriptParseCompile: parseCompileTotal,
        };
      })
      .filter(result => result.total >= context.options.thresholdInMs)
      .sort((a, b) => b.total - a.total);


    // TODO: consider moving this to core gathering so you don't need to run the audit for warning
    let runWarnings;
    if (hadExcessiveChromeExtension) {
      runWarnings = [str_(UIStrings.chromeExtensionsWarning)];
    }

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'url', valueType: 'url', label: str_(i18n.UIStrings.columnURL)},
      {key: 'total', granularity: 1, valueType: 'ms', label: str_(UIStrings.columnTotal)},
      {key: 'scripting', granularity: 1, valueType: 'ms', label: str_(UIStrings.columnScriptEval)},
      {key: 'scriptParseCompile', granularity: 1, valueType: 'ms',
        label: str_(UIStrings.columnScriptParse)},
    ];

    const details = BootupTime.makeTableDetails(headings, results,
      {wastedMs: totalBootupTime, sortedBy: ['total']});

    const score = Audit.computeLogNormalScore(
      {p10: context.options.p10, median: context.options.median},
      totalBootupTime
    );

    return {
      score,
      scoreDisplayMode: score >= Util.PASS_THRESHOLD ? Audit.SCORING_MODES.INFORMATIVE : undefined,
      notApplicable: !results.length,
      numericValue: totalBootupTime,
      numericUnit: 'millisecond',
      displayValue: totalBootupTime > 0 ?
        str_(i18n.UIStrings.seconds, {timeInMs: totalBootupTime}) : '',
      details,
      runWarnings,
      metricSavings: {
        TBT: tbtImpact,
      },
    };
  }
}

export default BootupTime;
export {UIStrings};
