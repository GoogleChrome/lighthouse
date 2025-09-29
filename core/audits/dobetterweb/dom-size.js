/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Audits a page to see how the size of DOM it creates. Stats like
 * tree depth, # children, and total elements are returned. The score is calculated
 * based solely on the total number of elements found on the page.
 */


import {Audit} from '../audit.js';
import * as i18n from '../../lib/i18n/i18n.js';
import {TBTImpactTasks} from '../../computed/tbt-impact-tasks.js';

const UIStrings = {
  /** Title of a diagnostic audit that provides detail on the size of the web page's DOM. The size of a DOM is characterized by the total number of DOM elements and greatest DOM depth. This descriptive title is shown to users when the amount is acceptable and no user action is required. */
  title: 'Avoids an excessive DOM size',
  /** Title of a diagnostic audit that provides detail on the size of the web page's DOM. The size of a DOM is characterized by the total number of DOM elements and greatest DOM depth. This imperative title is shown to users when there is a significant amount of execution time that could be reduced. */
  failureTitle: 'Avoid an excessive DOM size',
  /** Description of a Lighthouse audit that tells the user *why* they should reduce the size of the web page's DOM. The size of a DOM is characterized by the total number of DOM elements and greatest DOM depth. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'A large DOM will increase memory usage, cause longer ' +
    '[style calculations](https://developers.google.com/web/fundamentals/performance/rendering/reduce-the-scope-and-complexity-of-style-calculations), ' +
    'and produce costly [layout reflows](https://developers.google.com/speed/articles/reflow). [Learn how to avoid an excessive DOM size](https://developer.chrome.com/docs/lighthouse/performance/dom-size/).',
  /** Table column header for the type of statistic. These statistics describe how big the DOM is (count of DOM elements, children, depth). */
  columnStatistic: 'Statistic',
  /** Table column header for the observed value of the DOM statistic. */
  columnValue: 'Value',
  /** [ICU Syntax] Label for an audit identifying the number of DOM elements found in the page. */
  displayValue: `{itemCount, plural,
    =1 {1 element}
    other {# elements}
    }`,
  /** Label for the total number of DOM elements found in the page. */
  statisticDOMElements: 'Total DOM Elements',
  /** Label for the numeric value of the maximum depth in the page's DOM tree. */
  statisticDOMDepth: 'Maximum DOM Depth',
  /** Label for the numeric value of the maximum number of children any DOM element in the page has. The element described will have the most children in the page. */
  statisticDOMWidth: 'Maximum Child Elements',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class DOMSize extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'dom-size',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      scoreDisplayMode: Audit.SCORING_MODES.METRIC_SAVINGS,
      guidanceLevel: 1,
      requiredArtifacts: ['DOMStats', 'URL', 'GatherContext'],
      __internalOptionalArtifacts: ['Trace', 'DevtoolsLog', 'SourceMaps'],
    };
  }

  /**
   * @return {LH.Audit.ScoreOptions}
   */
  static get defaultOptions() {
    return {
      // https://bigquery.cloud.google.com/table/httparchive:lighthouse.2018_04_01_mobile?pli=1
      // see https://www.desmos.com/calculator/tsunbwqt3f
      p10: 818,
      median: 1400,
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<number|undefined>}
   */
  static async computeTbtImpact(artifacts, context) {
    let tbtImpact = 0;

    // We still want to surface this audit in snapshot mode, but since we don't compute TBT
    // the impact should always be undefined.
    const {GatherContext, DevtoolsLog, Trace} = artifacts;
    if (GatherContext.gatherMode !== 'navigation') {
      return undefined;
    }

    // Since the artifacts are optional, it's still possible for them to be missing in navigation mode.
    // Navigation mode does compute TBT so we should surface a numerical savings of 0.
    if (!DevtoolsLog || !Trace) {
      return 0;
    }

    const metricComputationData = Audit.makeMetricComputationDataInput(artifacts, context);

    try {
      // The TBT impact of style/layout tasks is correlated to the DOM size.
      // Even in situations where the page forces a style recalc, the DOM size is partially to blame
      // for any time spent blocking the main thread.
      //
      // `tbtImpact` should be exactly 0 for small DOMs since `selfTbtImpact` accounts for the blocking
      // time and not the main thread time.
      const tbtImpactTasks = await TBTImpactTasks.request(metricComputationData, context);
      for (const task of tbtImpactTasks) {
        if (task.group.id !== 'styleLayout') continue;
        tbtImpact += task.selfTbtImpact;
      }
    } catch {}

    return Math.round(tbtImpact);
  }


  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const stats = artifacts.DOMStats;

    const score = Audit.computeLogNormalScore(
      {p10: context.options.p10, median: context.options.median},
      stats.totalBodyElements
    );

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'statistic', valueType: 'text', label: str_(UIStrings.columnStatistic)},
      {key: 'node', valueType: 'node', label: str_(i18n.UIStrings.columnElement)},
      {key: 'value', valueType: 'numeric', label: str_(UIStrings.columnValue)},
    ];

    /** @type {LH.Audit.Details.Table['items']} */
    const items = [
      {
        statistic: str_(UIStrings.statisticDOMElements),
        value: {
          type: 'numeric',
          granularity: 1,
          value: stats.totalBodyElements,
        },
      },
      {
        node: Audit.makeNodeItem(stats.depth),
        statistic: str_(UIStrings.statisticDOMDepth),
        value: {
          type: 'numeric',
          granularity: 1,
          value: stats.depth.max,
        },
      },
      {
        node: Audit.makeNodeItem(stats.width),
        statistic: str_(UIStrings.statisticDOMWidth),
        value: {
          type: 'numeric',
          granularity: 1,
          value: stats.width.max,
        },
      },
    ];

    const tbtImpact = await this.computeTbtImpact(artifacts, context);

    return {
      score,
      numericValue: stats.totalBodyElements,
      numericUnit: 'element',
      displayValue: str_(UIStrings.displayValue, {itemCount: stats.totalBodyElements}),
      details: Audit.makeTableDetails(headings, items),
      metricSavings: {
        TBT: tbtImpact,
      },
    };
  }
}

export default DOMSize;
export {UIStrings};
