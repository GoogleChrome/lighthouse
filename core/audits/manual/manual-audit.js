/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Base class for audits that the user should verify manually on
 * their site.
 */

import {Audit} from '../audit.js';

class ManualAudit extends Audit {
  /**
   * @return {Pick<LH.Audit.Meta, 'scoreDisplayMode'|'requiredArtifacts'>}
   */
  static get partialMeta() {
    return {
      scoreDisplayMode: Audit.SCORING_MODES.MANUAL,
      requiredArtifacts: [],
    };
  }

  /**
   * @return {LH.Audit.Product}
   */
  static audit() {
    return {
      score: 0,
      // displayValue: '(needs manual verification)'
    };
  }
}

export default ManualAudit;
