
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import ManualAudit from '../../manual/manual-audit.js';

/**
 * @fileoverview Manual A11y audit to check that the visual layout of the page matches the DOM.
 */

class VisualOrderFollowsDOM extends ManualAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return Object.assign({
      id: 'visual-order-follows-dom',
      description: 'DOM order matches the visual order, improving navigation for assistive technology. [Learn more about DOM and visual ordering](https://developer.chrome.com/docs/lighthouse/accessibility/visual-order-follows-dom/).',
      title: 'Visual order on the page follows DOM order',
    }, super.partialMeta);
  }
}

export default VisualOrderFollowsDOM;
