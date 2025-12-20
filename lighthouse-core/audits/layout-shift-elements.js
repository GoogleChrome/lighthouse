/**
 * @license Copyright 2020 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit.js');
const i18n = require('../lib/i18n/i18n.js');

const UIStrings = {
  /** Descriptive title of a diagnostic audit that provides up to the top five elements contributing to Cumulative Layout Shift. */
  title: 'Avoid large layout shifts',
  /** Description of a diagnostic audit that provides up to the top five elements contributing to Cumulative Layout Shift. */
  description: 'These DOM elements contribute most to the CLS of the page.',
  /** [ICU Syntax] Label for the Cumulative Layout Shift Elements audit identifying how many elements were found. */
  displayValue: `{nodeCount, plural,
    =1 {1 element found}
    other {# elements found}
    }`,
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

class LayoutShiftElements extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'layout-shift-elements',
      title: str_(UIStrings.title),
      description: str_(UIStrings.description),
      scoreDisplayMode: Audit.SCORING_MODES.INFORMATIVE,
      requiredArtifacts: ['TraceElements'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {LH.Audit.Product}
   */
  static audit(artifacts) {
    const clsElements =
      artifacts.TraceElements.filter(element => element.metricName === 'cumulative-layout-shift');

    const clsElementData = clsElements.map(element => {
      return {
        node: /** @type {LH.Audit.Details.NodeValue} */ ({
          type: 'node',
          path: element.devtoolsNodePath,
          selector: element.selector,
          nodeLabel: element.nodeLabel,
          snippet: element.snippet,
        }),
      };
    });

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'node', itemType: 'node', text: str_(i18n.UIStrings.columnElement)},
    ];

    const details = Audit.makeTableDetails(headings, clsElementData);
    let displayValue;
    if (clsElementData.length > 0) {
      displayValue = str_(UIStrings.displayValue, {nodeCount: clsElementData.length});
    }

    return {
      score: 1,
      displayValue,
      details,
    };
  }
}

module.exports = LayoutShiftElements;
module.exports.UIStrings = UIStrings;
