/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('../audit.js');
const i18n = require('../../lib/i18n/i18n.js');

const UIStrings = {
  /** Title of a Lighthouse audit that provides detail on whether links have potentially-crawlable href attributes. This descriptive title is shown when all links on the page are potentially-crawlable. */
  title: 'Links are crawlable',
  /** Descriptive title of a Lighthouse audit that provides detail on whether links have potentially-crawlable href attributes. This descriptive title is shown when there are href attributes which are not crawlable by search engines. */
  failureTitle: 'Links are not crawlable',
  /** Description of a Lighthouse audit that tells the user why href attributes on links should be crawlable. This is displayed after a user expands the section to see more. 'Learn More' becomes link text to additional documentation. */
  description: 'Search engines may use `href` attributes on links to crawl websites. Ensure that the `href` attribute of anchor elements links to an appropriate destination, so more pages of the site can be discovered. [Learn More](https://support.google.com/webmasters/answer/9112205)',
  /** Label for a column in a data table; entries will be the HTML anchor elements that failed the audit. Anchors are DOM elements that are links. */
  columnFailingLink: 'Uncrawlable Link',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

class CrawlableAnchors extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'crawlable-anchors',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['AnchorElements'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {LH.Audit.Product}
   */
  static audit({AnchorElements: anchorElements}) {
    const failingAnchors = anchorElements.filter(({
      rawHref,
      listeners = [],
      onclick = '',
      name = '',
      role = '',
    }) => {
      onclick = onclick.replace( /\s/g, '');
      rawHref = rawHref.replace( /\s/g, '');
      name = name.trim();
      role = role.trim();

      if (role.length > 0) return;

      const windowLocationRegExp = /window\.location=/;
      const windowOpenRegExp = /window\.open\(/;
      const javaScriptVoidRegExp = /javascript:void(\(|)0(\)|)/;

      if (rawHref.startsWith('file:')) return true;
      if (windowLocationRegExp.test(onclick)) return true;
      if (windowOpenRegExp.test(onclick)) return true;

      const hasClickHandler = listeners.some(({type}) => type === 'click');
      if (hasClickHandler || name.length > 0) return;

      if (rawHref === '') return true;
      if (javaScriptVoidRegExp.test(rawHref)) return true;
    });

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [{
      key: 'node',
      itemType: 'node',
      text: str_(UIStrings.columnFailingLink),
    }];

    /** @type {LH.Audit.Details.Table['items']} */
    const itemsToDisplay = failingAnchors.map(anchor => {
      return {
        node: {
          type: 'node',
          path: anchor.devtoolsNodePath || '',
          selector: anchor.selector || '',
          nodeLabel: anchor.nodeLabel || '',
          snippet: anchor.outerHTML || '',
        },
      };
    });

    return {
      score: Number(failingAnchors.length === 0),
      details: Audit.makeTableDetails(headings, itemsToDisplay),
    };
  }
}

module.exports = CrawlableAnchors;
module.exports.UIStrings = UIStrings;
