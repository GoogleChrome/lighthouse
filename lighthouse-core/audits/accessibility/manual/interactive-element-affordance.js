
/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ManualAudit = require('../../manual/manual-audit.js');

/**
 * @fileoverview Manual A11y audit for interactive element affordance.
 */

class InteractiveElementAffordance extends ManualAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return Object.assign({
      id: 'interactive-element-affordance',
      description: 'Interactive elements, such as links and buttons, should indicate their state and be distinguishable from non-interactive elements. [Learn more](https://web.dev/interactive-element-affordance/).',
      title: 'Interactive elements indicate their purpose and state',
    }, super.partialMeta);
  }
}

module.exports = InteractiveElementAffordance;
