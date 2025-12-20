/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('../audit.js');
const URL = require('../../lib/url-shim.js');
const BLOCKLIST = new Set([
  // English
  'click here',
  'click this',
  'go',
  'here',
  'information',
  'learn more',
  'more',
  'more info',
  'more information',
  'right here',
  'read more',
  'see more',
  'start',
  'this',
  // Japanese
  'ここをクリック',
  'こちらをクリック',
  'リンク',
  '続きを読む',
  '続く',
  '全文表示',
  // Spanish
  'click aquí',
  'click aqui',
  'clicka aquí',
  'clicka aqui',
  'pincha aquí',
  'pincha aqui',
  'aquí',
  'aqui',
  'más',
  'mas',
  'más información',
  'más informacion',
  'mas información',
  'mas informacion',
  'este',
  'enlace',
  'este enlace',
  'empezar',
  // Portuguese
  'clique aqui',
  'inicio',
  'início',
  'ir',
  'mais informação',
  'mais informações',
  'mais',
  'veja mais',
  // Korean
  '여기',
  '여기를 클릭',
  '클릭',
  '링크',
  '자세히',
  '자세히 보기',
  '계속',
  '이동',
  '전체 보기',
  // Swedish
  'här',
  'klicka här',
  'läs mer',
  'mer',
  'mer info',
  'mer information',
]);
const i18n = require('../../lib/i18n/i18n.js');

const UIStrings = {
  /** Title of a Lighthouse audit that tests if each link on a page contains a sufficient description of what a user will find when they click it. Generic, non-descriptive text like "click here" doesn't give an indication of what the link leads to. This descriptive title is shown when all links on the page have sufficient textual descriptions. */
  title: 'Links have descriptive text',
  /** Title of a Lighthouse audit that tests if each link on a page contains a sufficient description of what a user will find when they click it. Generic, non-descriptive text like "click here" doesn't give an indication of what the link leads to. This descriptive title is shown when one or more links on the page contain generic, non-descriptive text. */
  failureTitle: 'Links do not have descriptive text',
  /** Description of a Lighthouse audit that tells the user *why* they need to have descriptive text on the links in their page. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Descriptive link text helps search engines understand your content. ' +
  '[Learn more](https://web.dev/link-text).',
  /** [ICU Syntax] Label for the audit identifying the number of links found. "link" here refers to the links in a web page to other web pages. */
  displayValue: `{itemCount, plural,
    =1 {1 link found}
    other {# links found}
    }`,
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

class LinkText extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'link-text',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['URL', 'AnchorElements'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {LH.Audit.Product}
   */
  static audit(artifacts) {
    const failingLinks = artifacts.AnchorElements
      .filter(link => link.href && !link.rel.includes('nofollow'))
      .filter(link => {
        const href = link.href.toLowerCase();
        if (
          href.startsWith('javascript:') ||
          href.startsWith('mailto:') ||
          URL.equalWithExcludedFragments(link.href, artifacts.URL.finalUrl)
        ) {
          return false;
        }

        return BLOCKLIST.has(link.text.trim().toLowerCase());
      })
      .map(link => {
        return {
          href: link.href,
          text: link.text.trim(),
        };
      });

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'href', itemType: 'url', text: 'Link destination'},
      {key: 'text', itemType: 'text', text: 'Link Text'},
    ];

    const details = Audit.makeTableDetails(headings, failingLinks, {});
    let displayValue;

    if (failingLinks.length) {
      displayValue = str_(UIStrings.displayValue, {itemCount: failingLinks.length});
    }

    return {
      score: Number(failingLinks.length === 0),
      details,
      displayValue,
    };
  }
}

module.exports = LinkText;
module.exports.UIStrings = UIStrings;
