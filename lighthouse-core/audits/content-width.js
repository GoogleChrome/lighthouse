/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit.js');
const i18n = require('../lib/i18n/i18n.js');

const UIStrings = {
  /** Title of a Lighthouse audit that provides detail on the content size of a web site compared to the viewport, which is the size of the screen the site is displayed on. This descriptive title is shown to users when the site's content is sized appropriately. */
  title: 'Content is sized correctly for the viewport',
  /** Title of a Lighthouse audit that provides detail on the content size of a web site compared to the viewport, which is the size of the screen the site is displayed on. This descriptive title is shown to users when the site's content is not sized appropriately. */
  failureTitle: 'Content is not sized correctly for the viewport',
  /** Description of a Lighthouse audit that tells the user why they should care that a site's content size should match its viewport size, which is the size of the screen the site is displayed on. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'If the width of your app\'s content doesn\'t match the width ' +
    'of the viewport, your app might not be optimized for mobile screens. ' +
    '[Learn more](https://web.dev/content-width).',
  /**
   * @description Explanatory message stating that the viewport size and window size differ.
   * @example {100} innerWidth
   * @example {101} outerWidth
   * */
  explanation: 'The viewport size of {innerWidth}px does not match the window ' +
    'size of {outerWidth}px.',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

class ContentWidth extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'content-width',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['ViewportDimensions', 'TestedAsMobileDevice'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {LH.Audit.Product}
   */
  static audit(artifacts) {
    const IsMobile = artifacts.TestedAsMobileDevice;
    const viewportWidth = artifacts.ViewportDimensions.innerWidth;
    const windowWidth = artifacts.ViewportDimensions.outerWidth;
    const widthsMatch = viewportWidth === windowWidth;

    if (!IsMobile) {
      return {
        score: 1,
        notApplicable: true,
      };
    }

    let explanation = '';
    if (!widthsMatch) {
      explanation = str_(UIStrings.explanation,
        {innerWidth: artifacts.ViewportDimensions.innerWidth,
          outerWidth: artifacts.ViewportDimensions.outerWidth});
    }

    return {
      score: Number(widthsMatch),
      explanation,
    };
  }
}

module.exports = ContentWidth;
module.exports.UIStrings = UIStrings;
