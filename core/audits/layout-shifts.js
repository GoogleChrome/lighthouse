/**
 * @license Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Audit} from './audit.js';
import * as i18n from '../lib/i18n/i18n.js';
import {CumulativeLayoutShift as CumulativeLayoutShiftComputed} from '../computed/metrics/cumulative-layout-shift.js';
import CumulativeLayoutShift from './metrics/cumulative-layout-shift.js';
import TraceElements from '../gather/gatherers/trace-elements.js';
import {TraceEngineResult} from '../computed/trace-engine-result.js';

const MAX_LAYOUT_SHIFTS = 15;

/** @typedef {LH.Audit.Details.TableItem & {node?: LH.Audit.Details.NodeValue, score: number, subItems?: {type: 'subitems', items: SubItem[]}}} Item */
/** @typedef {{extra?: LH.Audit.Details.NodeValue | LH.Audit.Details.UrlValue, cause: LH.IcuMessage}} SubItem */

/* eslint-disable max-len */
const UIStrings = {
  /** Descriptive title of a diagnostic audit that provides the top elements affected by layout shifts. */
  title: 'Avoid large layout shifts',
  /** Description of a diagnostic audit that provides the top elements affected by layout shifts. "windowing" means the metric value is calculated using the subset of events in a small window of time during the run. "normalization" is a good substitute for "windowing". The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'These are the largest layout shifts observed on the page. Each table item represents a single layout shift, and shows the element that shifted the most. Below each item are possible root causes that led to the layout shift. Some of these layout shifts may not be included in the CLS metric value due to [windowing](https://web.dev/articles/cls#what_is_cls). [Learn how to improve CLS](https://web.dev/articles/optimize-cls)',
  /** Label for a column in a data table; entries in this column will be a number representing how large the layout shift was. */
  columnScore: 'Layout shift score',
  /** A possible reason why that the layout shift occured. */
  rootCauseUnsizedMedia: 'Media element lacking an explicit size',
  /** A possible reason why that the layout shift occured. */
  rootCauseFontChanges: 'Web font loaded',
  /** A possible reason why that the layout shift occured. */
  rootCauseInjectedIframe: 'Injected iframe',
  /** A possible reason why that the layout shift occured. */
  rootCauseRenderBlockingRequest: 'A late network request adjusted the page layout',
  /** Label shown per-audit to show how many layout shifts are present. The `{# shifts found}` placeholder will be replaced with the number of layout shifts. */
  displayValueShiftsFound: `{shiftCount, plural, =1 {1 layout shift found} other {# layout shifts found}}`,
};
/* eslint-enable max-len */

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class LayoutShifts extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'layout-shifts',
      title: str_(UIStrings.title),
      description: str_(UIStrings.description),
      scoreDisplayMode: Audit.SCORING_MODES.METRIC_SAVINGS,
      guidanceLevel: 2,
      requiredArtifacts: ['traces', 'RootCauses', 'TraceElements'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const trace = artifacts.traces[Audit.DEFAULT_PASS];
    const traceEngineResult = await TraceEngineResult.request({trace}, context);
    const clusters = traceEngineResult.data.LayoutShifts.clusters ?? [];
    const {cumulativeLayoutShift: clsSavings, impactByNodeId} =
      await CumulativeLayoutShiftComputed.request(trace, context);
    const traceElements = artifacts.TraceElements
      .filter(element => element.traceEventType === 'layout-shift');

    /** @type {Item[]} */
    const items = [];
    const layoutShiftEvents =
      /** @type {import('../lib/trace-engine.js').SaneSyntheticLayoutShift[]} */(
        clusters.flatMap(c => c.events)
      );
    const topLayoutShiftEvents = layoutShiftEvents
      .sort((a, b) => b.args.data.weighted_score_delta - a.args.data.weighted_score_delta)
      .slice(0, MAX_LAYOUT_SHIFTS);
    for (const event of topLayoutShiftEvents) {
      const biggestImpactNodeId = TraceElements.getBiggestImpactNodeForShiftEvent(
        event.args.data.impacted_nodes || [], impactByNodeId, event);
      const biggestImpactElement = traceElements.find(t => t.nodeId === biggestImpactNodeId);

      // Turn root causes into sub-items.
      const index = layoutShiftEvents.indexOf(event);
      const rootCauses = artifacts.RootCauses.layoutShifts[index];
      /** @type {SubItem[]} */
      const subItems = [];
      if (rootCauses) {
        for (const cause of rootCauses.unsizedMedia) {
          const element = artifacts.TraceElements.find(
            t => t.traceEventType === 'layout-shift' && t.nodeId === cause.node.backendNodeId);
          subItems.push({
            extra: element ? Audit.makeNodeItem(element.node) : undefined,
            cause: str_(UIStrings.rootCauseUnsizedMedia),
          });
        }
        for (const cause of rootCauses.fontChanges) {
          const url = cause.request.args.data.url;
          subItems.push({
            extra: {type: 'url', value: url},
            cause: str_(UIStrings.rootCauseFontChanges),
          });
        }
        for (const cause of rootCauses.iframes) {
          const element = artifacts.TraceElements.find(
            t => t.traceEventType === 'layout-shift' && t.nodeId === cause.iframe.backendNodeId);
          subItems.push({
            extra: element ? Audit.makeNodeItem(element.node) : undefined,
            cause: str_(UIStrings.rootCauseInjectedIframe),
          });
        }
        for (const cause of rootCauses.renderBlockingRequests) {
          const url = cause.request.args.data.url;
          subItems.push({
            extra: {type: 'url', value: url},
            cause: str_(UIStrings.rootCauseRenderBlockingRequest),
          });
        }
      }

      items.push({
        node: biggestImpactElement ? Audit.makeNodeItem(biggestImpactElement.node) : undefined,
        score: event.args.data.weighted_score_delta,
        subItems: subItems.length ? {type: 'subitems', items: subItems} : undefined,
      });
    }

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      /* eslint-disable max-len */
      {key: 'node', valueType: 'node', subItemsHeading: {key: 'extra'}, label: str_(i18n.UIStrings.columnElement)},
      {key: 'score', valueType: 'numeric', subItemsHeading: {key: 'cause', valueType: 'text'}, granularity: 0.001, label: str_(UIStrings.columnScore)},
      /* eslint-enable max-len */
    ];

    const details = Audit.makeTableDetails(headings, items);

    let displayValue;
    if (items.length > 0) {
      displayValue = str_(UIStrings.displayValueShiftsFound,
        {shiftCount: items.length});
    }

    const passed = clsSavings <= CumulativeLayoutShift.defaultOptions.p10;

    return {
      score: passed ? 1 : 0,
      scoreDisplayMode: passed ? Audit.SCORING_MODES.INFORMATIVE : undefined,
      metricSavings: {
        CLS: clsSavings,
      },
      notApplicable: details.items.length === 0,
      displayValue,
      details,
    };
  }
}

export default LayoutShifts;
export {UIStrings};
