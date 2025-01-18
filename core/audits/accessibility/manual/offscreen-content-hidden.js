
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import ManualAudit from '../../manual/manual-audit.js';

/**
 * @fileoverview Manual A11y audit to check that offscreen content is hidden from
 * assistive technology.
 */

class OffscreenContentHidden extends ManualAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return Object.assign({
      id: 'offscreen-content-hidden',
      description: 'Offscreen content is hidden with display: none or aria-hidden=true. [Learn how to properly hide offscreen content](https://developer.chrome.com/docs/lighthouse/accessibility/offscreen-content-hidden/).',
      title: 'Offscreen content is hidden from assistive technology',
    }, super.partialMeta);
  }
}

export default OffscreenContentHidden;
