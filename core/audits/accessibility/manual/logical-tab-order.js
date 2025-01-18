
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import ManualAudit from '../../manual/manual-audit.js';

/**
 * @fileoverview Manual A11y audit for tab order that follows DOM order.
 */

class LogicalTabOrder extends ManualAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return Object.assign({
      id: 'logical-tab-order',
      description: 'Tabbing through the page follows the visual layout. Users cannot focus elements that are offscreen. [Learn more about logical tab ordering](https://developer.chrome.com/docs/lighthouse/accessibility/logical-tab-order/).',
      title: 'The page has a logical tab order',
    }, super.partialMeta);
  }
}

export default LogicalTabOrder;
