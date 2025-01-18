/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import log from 'lighthouse-logger';

import {Audit} from './audit.js';
import * as i18n from '../lib/i18n/i18n.js';
import {LargestContentfulPaint as LargestContentfulPaintComputed} from '../computed/metrics/largest-contentful-paint.js';
import LargestContentfulPaint from './metrics/largest-contentful-paint.js';
import {LCPBreakdown} from '../computed/metrics/lcp-breakdown.js';
import {Sentry} from '../lib/sentry.js';

const UIStrings = {
  /** Descriptive title of a diagnostic audit that provides the element that was determined to be the Largest Contentful Paint. */
  title: 'Largest Contentful Paint element',
  /** Description of a Lighthouse audit that tells the user that the element shown was determined to be the Largest Contentful Paint. */
  description: 'This is the largest contentful element painted within the viewport. ' +
    '[Learn more about the Largest Contentful Paint element](https://developer.chrome.com/docs/lighthouse/performance/lighthouse-largest-contentful-paint/)',
  /** Label for a column in a data table; entries will be the name of a phase in the Largest Contentful Paint (LCP) metric. */
  columnPhase: 'Phase',
  /** Label for a column in a data table; entries will be the percent of Largest Contentful Paint (LCP) that a phase covers. */
  columnPercentOfLCP: '% of LCP',
  /** Label for a column in a data table; entries will be the amount of time spent in a phase in the Largest Contentful Paint (LCP) metric. */
  columnTiming: 'Timing',
  /** Table item value for the Time To First Byte (TTFB) phase of the Largest Contentful Paint (LCP) metric. */
  itemTTFB: 'TTFB',
  /** Table item value for the load delay phase of the Largest Contentful Paint (LCP) metric. */
  itemLoadDelay: 'Load Delay',
  /** Table item value for the load time phase of the Largest Contentful Paint (LCP) metric. */
  itemLoadTime: 'Load Time',
  /** Table item value for the render delay phase of the Largest Contentful Paint (LCP) metric. */
  itemRenderDelay: 'Render Delay',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class LargestContentfulPaintElement extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'largest-contentful-paint-element',
      title: str_(UIStrings.title),
      description: str_(UIStrings.description),
      scoreDisplayMode: Audit.SCORING_MODES.METRIC_SAVINGS,
      guidanceLevel: 1,
      supportedModes: ['navigation'],
      requiredArtifacts:
        ['traces', 'TraceElements', 'devtoolsLogs', 'GatherContext', 'settings', 'URL'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {LH.Audit.Details.Table|undefined}
   */
  static makeElementTable(artifacts) {
    const lcpElement = artifacts.TraceElements
      .find(element => element.traceEventType === 'largest-contentful-paint');
    if (!lcpElement) return;

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'node', valueType: 'node', label: str_(i18n.UIStrings.columnElement)},
    ];

    const lcpElementDetails = [{node: Audit.makeNodeItem(lcpElement.node)}];

    return Audit.makeTableDetails(headings, lcpElementDetails);
  }

  /**
   * @param {number} metricLcp
   * @param {LH.Artifacts.MetricComputationDataInput} metricComputationData
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Details.Table>}
   */
  static async makePhaseTable(metricLcp, metricComputationData, context) {
    const {ttfb, loadStart, loadEnd} = await LCPBreakdown.request(metricComputationData, context);

    let loadDelay = 0;
    let loadTime = 0;
    let renderDelay = metricLcp - ttfb;

    if (loadStart && loadEnd) {
      loadDelay = loadStart - ttfb;
      loadTime = loadEnd - loadStart;
      renderDelay = metricLcp - loadEnd;
    }

    const results = [
      {phase: str_(UIStrings.itemTTFB), timing: ttfb},
      {phase: str_(UIStrings.itemLoadDelay), timing: loadDelay},
      {phase: str_(UIStrings.itemLoadTime), timing: loadTime},
      {phase: str_(UIStrings.itemRenderDelay), timing: renderDelay},
    ].map(result => {
      const percent = 100 * result.timing / metricLcp;
      const percentStr = `${percent.toFixed(0)}%`;
      return {...result, percent: percentStr};
    });

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'phase', valueType: 'text', label: str_(UIStrings.columnPhase)},
      {key: 'percent', valueType: 'text', label: str_(UIStrings.columnPercentOfLCP)},
      {key: 'timing', valueType: 'ms', label: str_(UIStrings.columnTiming)},
    ];

    return Audit.makeTableDetails(headings, results);
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const trace = artifacts.traces[Audit.DEFAULT_PASS];
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    const gatherContext = artifacts.GatherContext;
    const metricComputationData = {trace, devtoolsLog, gatherContext,
      settings: context.settings, URL: artifacts.URL};

    const elementTable = this.makeElementTable(artifacts);
    if (!elementTable) {
      return {
        score: null,
        notApplicable: true,
        metricSavings: {LCP: 0},
      };
    }

    const items = [elementTable];
    let displayValue;
    let metricLcp = 0;

    try {
      const lcpResult =
        await LargestContentfulPaintComputed.request(metricComputationData, context);
      metricLcp = lcpResult.timing;
      displayValue = str_(i18n.UIStrings.ms, {timeInMs: metricLcp});

      const phaseTable = await this.makePhaseTable(metricLcp, metricComputationData, context);
      items.push(phaseTable);
    } catch (err) {
      Sentry.captureException(err, {
        tags: {audit: this.meta.id},
        level: 'error',
      });
      log.error(this.meta.id, err.message);
    }

    const details = Audit.makeListDetails(items);

    // Conceptually, this doesn't make much sense as "savings" for this audit since there isn't anything to "fix".
    // However, this audit will always be useful when improving LCP and that should be reflected in our impact calculations.
    const idealLcp = LargestContentfulPaint.defaultOptions[context.settings.formFactor].scoring.p10;
    const lcpSavings = Math.max(0, metricLcp - idealLcp);

    return {
      score: lcpSavings ? 0 : 1,
      scoreDisplayMode: lcpSavings ? undefined : Audit.SCORING_MODES.INFORMATIVE,
      displayValue,
      details,
      metricSavings: {
        LCP: lcpSavings,
      },
    };
  }
}

export default LargestContentfulPaintElement;
export {UIStrings};
