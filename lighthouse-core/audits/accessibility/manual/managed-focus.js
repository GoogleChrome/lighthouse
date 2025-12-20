
/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ManualAudit = require('../../manual/manual-audit.js');

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
      description: 'If new content, such as a dialog, is added to the page, the user\'s focus is directed to it. [Learn more](https://web.dev/managed-focus/).',
      title: 'The user\'s focus is directed to new content added to the page',
    }, super.partialMeta);
  }
}

module.exports = ManagedFocus;
