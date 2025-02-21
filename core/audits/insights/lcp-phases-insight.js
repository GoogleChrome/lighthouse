/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {UIStrings} from '@paulirish/trace_engine/models/trace/insights/LCPPhases.js';

import {Audit} from '../audit.js';
import * as i18n from '../../lib/i18n/i18n.js';
import {adaptInsightToAuditProduct, maybeMakeNodeElementTable} from './insight-audit.js';

// eslint-disable-next-line max-len
const str_ = i18n.createIcuMessageFn('node_modules/@paulirish/trace_engine/models/trace/insights/LCPPhases.js', UIStrings);

class LCPPhasesInsight extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'lcp-phases-insight',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.title),
      description: str_(UIStrings.description),
      guidanceLevel: 3,
      requiredArtifacts: ['traces', 'TraceElements'],
      replacesAudits: ['largest-contentful-paint-element'],
    };
  }

  /**
   * @param {Required<import('@paulirish/trace_engine/models/trace/insights/LCPPhases.js').LCPPhasesInsightModel>['phases']} phases
   * @return {LH.Audit.Details.Table}
   */
  static makePhaseTable(phases) {
    const {ttfb, loadDelay, loadTime, renderDelay} = phases;

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'label', valueType: 'text', label: str_(UIStrings.phase)},
      {key: 'duration', valueType: 'ms', label: str_(i18n.UIStrings.columnDuration)},
    ];

    /** @type {LH.Audit.Details.Table['items']} */
    let items = [
      /* eslint-disable max-len */
      {phase: 'timeToFirstByte', label: str_(UIStrings.timeToFirstByte), duration: ttfb},
      {phase: 'resourceLoadDelay', label: str_(UIStrings.resourceLoadDelay), duration: loadDelay},
      {phase: 'resourceLoadDuration', label: str_(UIStrings.resourceLoadDuration), duration: loadTime},
      {phase: 'elementRenderDelay', label: str_(UIStrings.elementRenderDelay), duration: renderDelay},
      /* eslint-enable max-len */
    ];

    if (loadDelay === undefined) {
      items = items.filter(item => item.phase !== 'resourceLoadDelay');
    }
    if (loadTime === undefined) {
      items = items.filter(item => item.phase !== 'resourceLoadDuration');
    }

    return Audit.makeTableDetails(headings, items);
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    return adaptInsightToAuditProduct(artifacts, context, 'LCPPhases', (insight) => {
      if (!insight.phases) {
        return;
      }

      return Audit.makeListDetails([
        maybeMakeNodeElementTable(
          artifacts.TraceElements,
          insight.lcpEvent?.args.data?.nodeId,
          str_(i18n.UIStrings.columnElement)),
        LCPPhasesInsight.makePhaseTable(insight.phases),
      ].filter(table => table !== undefined));
    });
  }
}

export default LCPPhasesInsight;
