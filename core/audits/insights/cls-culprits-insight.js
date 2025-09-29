/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {UIStrings as InsightUIStrings} from '@paulirish/trace_engine/models/trace/insights/CLSCulprits.js';

import {Audit} from '../audit.js';
import * as i18n from '../../lib/i18n/i18n.js';
import {adaptInsightToAuditProduct, makeNodeItemForNodeId} from './insight-audit.js';
import TraceElements from '../../gather/gatherers/trace-elements.js';
import {CumulativeLayoutShift} from '../../computed/metrics/cumulative-layout-shift.js';

const MAX_LAYOUT_SHIFTS_PER_CLUSTER = 5;

/** @typedef {{extra?: LH.Audit.Details.NodeValue | LH.Audit.Details.UrlValue, cause: LH.IcuMessage}} SubItem */

// eslint-disable-next-line max-len
const insightStr_ = i18n.createIcuMessageFn('node_modules/@paulirish/trace_engine/models/trace/insights/CLSCulprits.js', InsightUIStrings);

const UIStrings = {
  /** Label for a column in a data table; entries in this column will be a number representing how large the layout shift was. */
  columnScore: 'Layout shift score',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class CLSCulpritsInsight extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'cls-culprits-insight',
      title: insightStr_(InsightUIStrings.title),
      failureTitle: insightStr_(InsightUIStrings.title),
      description: insightStr_(InsightUIStrings.description),
      guidanceLevel: 3,
      requiredArtifacts: ['Trace', 'TraceElements', 'SourceMaps'],
      replacesAudits: ['layout-shifts', 'non-composited-animations', 'unsized-images'],
    };
  }

  /**
   * @param {import('@paulirish/trace_engine/models/trace/insights/CLSCulprits.js').CLSCulpritsInsightModel} insight
   * @param {import('../../lib/trace-engine.js').SaneSyntheticLayoutShift} event
   * @param {LH.Artifacts.TraceElement[]} TraceElements
   * @return {LH.Audit.Details.TableSubItems|undefined}
   */
  static getCulpritSubItems(insight, event, TraceElements) {
    const culprits = insight.shifts.get(event);
    if (!culprits) {
      return;
    }

    /** @type {SubItem[]} */
    const subItems = [];
    for (const unsizedImage of culprits.unsizedImages) {
      subItems.push({
        extra: makeNodeItemForNodeId(TraceElements, unsizedImage.backendNodeId),
        cause: insightStr_(InsightUIStrings.unsizedImage),
      });
    }
    for (const request of culprits.webFonts) {
      const url = request.args.data.url;
      subItems.push({
        extra: {type: 'url', value: url},
        cause: insightStr_(InsightUIStrings.webFont),
      });
    }
    for (const iframe of culprits.iframes) {
      subItems.push({
        extra: iframe.url ? {type: 'url', value: iframe.url} : undefined,
        cause: insightStr_(InsightUIStrings.injectedIframe),
      });
    }

    if (subItems.length) {
      return {type: 'subitems', items: subItems};
    }
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    return adaptInsightToAuditProduct(artifacts, context, 'CLSCulprits', (insight) => {
      /** @type {LH.Audit.Details.Table['headings']} */
      const headings = [
        /* eslint-disable max-len */
        {key: 'node', valueType: 'node', subItemsHeading: {key: 'extra'}, label: insightStr_(i18n.UIStrings.columnElement)},
        {key: 'score', valueType: 'numeric', subItemsHeading: {key: 'cause', valueType: 'text'}, granularity: 0.001, label: str_(UIStrings.columnScore)},
        /* eslint-enable max-len */
      ];

      const tables = insight.clusters.map(cluster => {
        const events =
          /** @type {import('../../lib/trace-engine.js').SaneSyntheticLayoutShift[]} */ (
            cluster.events.filter(e => !!e.args.data)
          ).sort((a, b) => b.args.data.weighted_score_delta - a.args.data.weighted_score_delta)
          .slice(0, MAX_LAYOUT_SHIFTS_PER_CLUSTER);
        const impactByNodeId = CumulativeLayoutShift.getImpactByNodeId(events.map(e => ({
          impactedNodes: e.args.data.impacted_nodes,
          ts: e.ts,
          isMainFrame: e.args.data.is_main_frame,
          weightedScore: e.args.data.weighted_score_delta,
          event: /** @type {any} */ (e),
        })));

        /** @type {LH.Audit.Details.Table['items']} */
        const items = events.map(event => {
          const biggestImpactNodeId = TraceElements.getBiggestImpactNodeForShiftEvent(
            event.args.data.impacted_nodes || [], impactByNodeId);
          return {
            node: makeNodeItemForNodeId(artifacts.TraceElements, biggestImpactNodeId),
            score: event.args.data?.weighted_score_delta,
            subItems: this.getCulpritSubItems(insight, event, artifacts.TraceElements),
          };
        });
        items.unshift({
          node: {type: 'text', value: insightStr_(i18n.UIStrings.total)},
          score: cluster.clusterCumulativeScore,
        });
        return Audit.makeTableDetails(headings, items);
      });

      return Audit.makeListDetails(tables);
    });
  }
}

export default CLSCulpritsInsight;
export {UIStrings};
