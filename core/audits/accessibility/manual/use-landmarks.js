
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import ManualAudit from '../../manual/manual-audit.js';

/**
 * @fileoverview Manual A11y audit to check that landmark elements are used whenever possible.
 */

class UseLandmarks extends ManualAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return Object.assign({
      id: 'use-landmarks',
      description: 'Landmark elements (`<main>`, `<nav>`, etc.) are used to improve the keyboard navigation of the page for assistive technology. [Learn more about landmark elements](https://developer.chrome.com/docs/lighthouse/accessibility/use-landmarks/).',
      title: 'HTML5 landmark elements are used to improve navigation',
    }, super.partialMeta);
  }
}

export default UseLandmarks;
