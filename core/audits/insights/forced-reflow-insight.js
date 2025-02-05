/* eslint-disable no-unused-vars */ // TODO: remove once implemented.

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {UIStrings} from '@paulirish/trace_engine/models/trace/insights/ForcedReflow.js';

import {Audit} from '../audit.js';
import * as i18n from '../../lib/i18n/i18n.js';
import {adaptInsightToAuditProduct, makeNodeItemForNodeId} from './insight-audit.js';

// eslint-disable-next-line max-len
const str_ = i18n.createIcuMessageFn('node_modules/@paulirish/trace_engine/models/trace/insights/ForcedReflow.js', UIStrings);

class ForcedReflowInsight extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'forced-reflow-insight',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.title),
      description: str_(UIStrings.description),
      guidanceLevel: 3,
      requiredArtifacts: ['traces', 'TraceElements'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    // TODO: implement.
    return adaptInsightToAuditProduct(artifacts, context, 'ForcedReflow', (insight) => {
      /** @type {LH.Audit.Details.Table['headings']} */
      const headings = [
      ];
      /** @type {LH.Audit.Details.Table['items']} */
      const items = [
      ];
      return Audit.makeTableDetails(headings, items);
    });
  }
}

export default ForcedReflowInsight;
