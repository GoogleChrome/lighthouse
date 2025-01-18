/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/** @typedef {string|LH.Audit.Details.NodeValue|undefined} Source */
/** @typedef {{source: Source, subItems: {type: 'subitems', items: SubItem[]}}} InvalidHreflang */
/** @typedef {{reason: LH.IcuMessage}} SubItem */

import {Audit} from '../audit.js';
import * as i18n from '../../lib/i18n/i18n.js';
import {isValidLang} from '../../../third-party/axe/valid-langs.js';

const NO_LANGUAGE = 'x-default';

const UIStrings = {
  /** Title of a Lighthouse audit that provides detail on the `hreflang` attribute on a page. This descriptive title is shown when the page's `hreflang` attribute is configured correctly. "hreflang" is an HTML attribute and should not be translated. */
  title: 'Document has a valid `hreflang`',
  /** Title of a Lighthouse audit that provides detail on the `hreflang` attribute on a page. This descriptive title is shown when the page's `hreflang` attribute is not valid and needs to be fixed. "hreflang" is an HTML attribute and should not be translated. */
  failureTitle: 'Document doesn\'t have a valid `hreflang`',
  /** Description of a Lighthouse audit that tells the user *why* they need to have an hreflang link on their page. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. "hreflang" is an HTML attribute and should not be translated. */
  description: 'hreflang links tell search engines what version of a page they should ' +
    'list in search results for a given language or region. [Learn more about `hreflang`]' +
    '(https://developer.chrome.com/docs/lighthouse/seo/hreflang/).',
  /** A failure reason for a Lighthouse audit that flags incorrect use of the `hreflang` attribute on `link` elements. This failure reason is shown when the hreflang language code is unexpected. */
  unexpectedLanguage: 'Unexpected language code',
  /** A failure reason for a Lighthouse audit that flags incorrect use of the `hreflang` attribute on `link` elements. This failure reason is shown when the `href` attribute value is not fully-qualified. */
  notFullyQualified: 'Relative href value',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

/**
 * @param {string} href
 * @return {boolean}
 */
function isFullyQualified(href) {
  return href.startsWith('http:') || href.startsWith('https:');
}

/**
 * @param {string} hreflang
 * @return {boolean}
 */
function isExpectedLanguageCode(hreflang) {
  if (hreflang.toLowerCase() === NO_LANGUAGE) {
    return true;
  }

  // hreflang can consist of language-script-region, we are validating only language
  const [lang] = hreflang.split('-');
  return isValidLang(lang.toLowerCase());
}

class Hreflang extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'hreflang',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      supportedModes: ['navigation'],
      requiredArtifacts: ['LinkElements', 'URL'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {LH.Audit.Product}
   */
  static audit({LinkElements}) {
    /** @type {InvalidHreflang[]} */
    const invalidHreflangs = [];

    const auditableLinkElements = LinkElements.filter(linkElement => {
      const isAlternate = linkElement.rel === 'alternate';
      const hasHreflang = linkElement.hreflang;
      const isInBody = linkElement.source === 'body';

      return isAlternate && hasHreflang && !isInBody;
    });

    for (const link of auditableLinkElements) {
      const reasons = [];
      /** @type {Source} */
      let source;

      if (!isExpectedLanguageCode(link.hreflang)) {
        reasons.push(str_(UIStrings.unexpectedLanguage));
      }

      if (!isFullyQualified(link.hrefRaw.toLowerCase())) {
        reasons.push(str_(UIStrings.notFullyQualified));
      }

      if (link.source === 'head') {
        if (link.node) {
          source = {
            ...Audit.makeNodeItem(link.node),
            snippet: `<link rel="alternate" hreflang="${link.hreflang}" href="${link.hrefRaw}" />`,
          };
        } else {
          source = {
            type: 'node',
            snippet: `<link rel="alternate" hreflang="${link.hreflang}" href="${link.hrefRaw}" />`,
          };
        }
      } else if (link.source === 'headers') {
        source = `Link: <${link.hrefRaw}>; rel="alternate"; hreflang="${link.hreflang}"`;
      }

      if (!source || !reasons.length) continue;

      invalidHreflangs.push({
        source,
        subItems: {
          type: 'subitems',
          items: reasons.map(reason => ({reason})),
        },
      });
    }

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [{
      key: 'source',
      valueType: 'code',
      subItemsHeading: {
        key: 'reason',
        valueType: 'text',
      },
      label: '',
    }];

    const details = Audit.makeTableDetails(headings, invalidHreflangs);

    return {
      score: Number(invalidHreflangs.length === 0),
      details,
    };
  }
}

export default Hreflang;
export {UIStrings};
