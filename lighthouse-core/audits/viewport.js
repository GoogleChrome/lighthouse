/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit.js');
const ComputedViewportMeta = require('../computed/viewport-meta.js');
const i18n = require('../lib/i18n/i18n.js');

const UIStrings = {
  /** Title of a Lighthouse audit that provides detail on the viewport meta tag in a web page's html. This descriptive title is shown to users when a viewport tag is set and configured. */
  title: 'Has a `<meta name="viewport">` tag with `width` or `initial-scale`',
  /** Title of a Lighthouse audit that provides detail on the viewport meta tag in a web page's html. This descriptive title is shown to users when a viewport tag is not set or configured. */
  failureTitle: 'Does not have a `<meta name="viewport">` tag with `width` ' +
    'or `initial-scale`',
  /** Description of a Lighthouse audit that tells the user why they should have a viewport meta tag in their html. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Add a `<meta name="viewport">` tag to optimize your app for mobile screens. ' +
    '[Learn more](https://web.dev/viewport).',
  /** Explanatory message stating that no viewport meta tag exists on the page. */
  explanationNoTag: 'No `<meta name="viewport">` tag found',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

class Viewport extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'viewport',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['MetaElements'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const viewportMeta = await ComputedViewportMeta.request(artifacts.MetaElements, context);

    if (!viewportMeta.hasViewportTag) {
      return {
        score: 0,
        explanation: str_(UIStrings.explanationNoTag),
      };
    }

    return {
      score: Number(viewportMeta.isMobileOptimized),
      warnings: viewportMeta.parserWarnings,
    };
  }
}

module.exports = Viewport;
module.exports.UIStrings = UIStrings;
