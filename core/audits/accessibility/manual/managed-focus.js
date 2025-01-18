
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import ManualAudit from '../../manual/manual-audit.js';

/**
 * @fileoverview Manual A11y audit for focusing new content that's added to the page.
 */

class ManagedFocus extends ManualAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return Object.assign({
      id: 'managed-focus',
      description: 'If new content, such as a dialog, is added to the page, the user\'s focus is directed to it. [Learn how to direct focus to new content](https://developer.chrome.com/docs/lighthouse/accessibility/managed-focus/).',
      title: 'The user\'s focus is directed to new content added to the page',
    }, super.partialMeta);
  }
}

export default ManagedFocus;
