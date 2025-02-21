/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {UIStrings} from '@paulirish/trace_engine/models/trace/insights/LCPDiscovery.js';

import {Audit} from '../audit.js';
import * as i18n from '../../lib/i18n/i18n.js';
import {adaptInsightToAuditProduct} from './insight-audit.js';

// eslint-disable-next-line max-len
const str_ = i18n.createIcuMessageFn('node_modules/@paulirish/trace_engine/models/trace/insights/LCPDiscovery.js', UIStrings);

class LCPDiscoveryInsight extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'lcp-discovery-insight',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.title),
      description: str_(UIStrings.description),
      guidanceLevel: 3,
      requiredArtifacts: ['traces', 'TraceElements'],
      replacesAudits: ['prioritize-lcp-image', 'lcp-lazy-loaded'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    return adaptInsightToAuditProduct(artifacts, context, 'LCPDiscovery', (insight) => {
      if (!insight.checklist) {
        return;
      }

      return Audit.makeChecklistDetails(insight.checklist);
    });
  }
}

export default LCPDiscoveryInsight;
