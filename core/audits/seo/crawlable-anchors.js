/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Audit} from '../audit.js';
import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /** Title of a Lighthouse audit that provides detail on whether links have potentially-crawlable href attributes. This descriptive title is shown when all links on the page are potentially-crawlable. */
  title: 'Links are crawlable',
  /** Descriptive title of a Lighthouse audit that provides detail on whether links have potentially-crawlable href attributes. This descriptive title is shown when there are href attributes which are not crawlable by search engines. */
  failureTitle: 'Links are not crawlable',
  /** Description of a Lighthouse audit that tells the user why href attributes on links should be crawlable. This is displayed after a user expands the section to see more. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Search engines may use `href` attributes on links to crawl websites. Ensure that the `href` attribute of anchor elements links to an appropriate destination, so more pages of the site can be discovered. [Learn how to make links crawlable](https://support.google.com/webmasters/answer/9112205)',
  /** Label for a column in a data table; entries will be the HTML anchor elements that failed the audit. Anchors are DOM elements that are links. */
  columnFailingLink: 'Uncrawlable Link',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

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
      requiredArtifacts: ['AnchorElements', 'URL'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {LH.Audit.Product}
   */
  static audit({AnchorElements: anchorElements, URL: url}) {
    const failingAnchors = anchorElements.filter(({
      rawHref,
      name = '',
      role = '',
      id,
      href,
    }) => {
      rawHref = rawHref.replace( /\s/g, '');
      name = name.trim();
      role = role.trim();

      if (role.length > 0) return;
      // Ignore mailto links even if they use one of the failing patterns. See https://github.com/GoogleChrome/lighthouse/issues/11443#issuecomment-694898412
      if (rawHref.startsWith('mailto:')) return;

      // Ignore `<a id="something">` elements acting as an anchor.
      if (rawHref === '' && id) return;

      const javaScriptVoidRegExp = /javascript:void(\(|)0(\)|)/;

      if (rawHref.startsWith('file:')) return true;
      if (name.length > 0) return;

      if (href === '') return true;
      if (javaScriptVoidRegExp.test(rawHref)) return true;

      // checking if rawHref is a valid
      try {
        new URL(rawHref, url.finalDisplayedUrl);
      } catch (e) {
        return true;
      }
    });

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [{
      key: 'node',
      valueType: 'node',
      label: str_(UIStrings.columnFailingLink),
    }];

    /** @type {LH.Audit.Details.Table['items']} */
    const itemsToDisplay = failingAnchors.map(anchor => {
      return {
        node: Audit.makeNodeItem(anchor.node),
      };
    });

    return {
      score: Number(failingAnchors.length === 0),
      details: Audit.makeTableDetails(headings, itemsToDisplay),
    };
  }
}

export default CrawlableAnchors;
export {UIStrings};
