/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Audit} from '../audit.js';
import UrlUtils from '../../lib/url-utils.js';
import {MainResource} from '../../computed/main-resource.js';
import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /** Title of a Lighthouse audit that provides detail on a page's rel=canonical link. This descriptive title is shown to users when the rel=canonical link is valid. "rel=canonical" is an HTML attribute and value and so should not be translated. */
  title: 'Document has a valid `rel=canonical`',
  /** Title of a Lighthouse audit that provides detail on a page's rel=canonical link. This descriptive title is shown to users when the rel=canonical link is invalid and should be fixed. "rel=canonical" is an HTML attribute and value and so should not be translated. */
  failureTitle: 'Document does not have a valid `rel=canonical`',
  /** Description of a Lighthouse audit that tells the user *why* they need to have a valid rel=canonical link. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Canonical links suggest which URL to show in search results. ' +
    '[Learn more about canonical links](https://developer.chrome.com/docs/lighthouse/seo/canonical/).',
  /**
   * @description Explanatory message stating that there was a failure in an audit caused by multiple URLs conflicting with each other.
   * @example {https://example.com, https://example2.com} urlList
   * */
  explanationConflict: 'Multiple conflicting URLs ({urlList})',
  /**
   * @description Explanatory message stating that there was a failure in an audit caused by a URL being invalid.
   * @example {https://example.com/} url
   * */
  explanationInvalid: 'Invalid URL ({url})',
  /**
   * @description Explanatory message stating that there was a failure in an audit caused by a URL being relative instead of absolute.
   * @example {https://example.com/} url
   * */
  explanationRelative: 'Is not an absolute URL ({url})',
  /**
   * @description Explanatory message stating that there was a failure in an audit caused by a URL pointing to a different hreflang than the current context.'hreflang' is an HTML attribute and should not be translated.
   * @example {https://example.com/} url
   */
  explanationPointsElsewhere: 'Points to another `hreflang` location ({url})',
  /** Explanatory message stating that the page's canonical URL was pointing to the domain's root URL, which is a common mistake. "points" refers to the action of the 'rel=canonical' referencing another link. "root" refers to the starting/home page of the website. "domain" refers to the registered domain name of the website. */
  explanationRoot: 'Points to the domain\'s root URL (the homepage), ' +
    'instead of an equivalent page of content',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

/**
 * @typedef CanonicalURLData
 * @property {Set<string>} uniqueCanonicalURLs
 * @property {Set<string>} hreflangURLs
 * @property {LH.Artifacts.LinkElement|undefined} invalidCanonicalLink
 * @property {LH.Artifacts.LinkElement|undefined} relativeCanonicallink
 */

class Canonical extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'canonical',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      supportedModes: ['navigation'],
      requiredArtifacts: ['LinkElements', 'URL', 'DevtoolsLog'],
    };
  }

  /**
   * @param {LH.Artifacts.LinkElement[]} linkElements
   * @return {CanonicalURLData}
   */
  static collectCanonicalURLs(linkElements) {
    /** @type {Set<string>} */
    const uniqueCanonicalURLs = new Set();
    /** @type {Set<string>} */
    const hreflangURLs = new Set();

    /** @type {LH.Artifacts.LinkElement|undefined} */
    let invalidCanonicalLink;
    /** @type {LH.Artifacts.LinkElement|undefined} */
    let relativeCanonicallink;
    for (const link of linkElements) {
      // Links in the body aren't canonical references for SEO, skip them
      /** @see https://html.spec.whatwg.org/multipage/links.html#body-ok */
      if (link.source === 'body') continue;

      if (link.rel === 'canonical') {
        // Links that don't have an href aren't canonical references for SEO, skip them
        if (!link.hrefRaw) continue;

        // Links that had an hrefRaw but didn't have a valid href were invalid, flag them
        if (!link.href) invalidCanonicalLink = link;
        // Links that had a valid href but didn't have a valid hrefRaw must have been relatively resolved, flag them
        else if (!UrlUtils.isValid(link.hrefRaw)) relativeCanonicallink = link;
        // Otherwise, it was a valid canonical URL
        else uniqueCanonicalURLs.add(link.href);
      } else if (link.rel === 'alternate') {
        if (link.href && link.hreflang) hreflangURLs.add(link.href);
      }
    }

    return {uniqueCanonicalURLs, hreflangURLs, invalidCanonicalLink, relativeCanonicallink};
  }

  /**
   * @param {CanonicalURLData} canonicalURLData
   * @return {LH.Audit.Product|undefined}
   */
  static findInvalidCanonicalURLReason(canonicalURLData) {
    const {uniqueCanonicalURLs, invalidCanonicalLink, relativeCanonicallink} = canonicalURLData;

    // the canonical link is totally invalid
    if (invalidCanonicalLink) {
      return {
        score: 0,
        explanation: str_(UIStrings.explanationInvalid, {url: invalidCanonicalLink.hrefRaw}),
      };
    }

    // the canonical link is valid, but it's relative which isn't allowed
    if (relativeCanonicallink) {
      return {
        score: 0,
        explanation: str_(UIStrings.explanationRelative, {url: relativeCanonicallink.hrefRaw}),
      };
    }

    /** @type {string[]} */
    const canonicalURLs = Array.from(uniqueCanonicalURLs);

    // there's no canonical URL at all, we're done
    if (canonicalURLs.length === 0) {
      return {
        score: 1,
        notApplicable: true,
      };
    }

    // we have multiple conflicting canonical URls, we're done
    if (canonicalURLs.length > 1) {
      return {
        score: 0,
        explanation: str_(UIStrings.explanationConflict, {urlList: canonicalURLs.join(', ')}),
      };
    }
  }

  /**
   * @param {CanonicalURLData} canonicalURLData
   * @param {URL} canonicalURL
   * @param {URL} baseURL
   * @return {LH.Audit.Product|undefined}
   */
  static findCommonCanonicalURLMistakes(canonicalURLData, canonicalURL, baseURL) {
    const {hreflangURLs} = canonicalURLData;

    // cross-language or cross-country canonicals are a common issue
    if (
      hreflangURLs.has(baseURL.href) &&
      hreflangURLs.has(canonicalURL.href) &&
      baseURL.href !== canonicalURL.href
    ) {
      return {
        score: 0,
        explanation: str_(UIStrings.explanationPointsElsewhere, {url: baseURL.href}),
      };
    }

    // another common mistake is to have canonical pointing from all pages of the website to its root
    if (
      canonicalURL.origin === baseURL.origin &&
      canonicalURL.pathname === '/' &&
      baseURL.pathname !== '/'
    ) {
      return {
        score: 0,
        explanation: str_(UIStrings.explanationRoot),
      };
    }
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const devtoolsLog = artifacts.DevtoolsLog;

    const mainResource = await MainResource.request({devtoolsLog, URL: artifacts.URL}, context);
    const baseURL = new URL(mainResource.url);
    const canonicalURLData = Canonical.collectCanonicalURLs(artifacts.LinkElements);

    // First we'll check that there was a single valid canonical URL.
    const invalidURLAuditProduct = Canonical.findInvalidCanonicalURLReason(canonicalURLData);
    if (invalidURLAuditProduct) return invalidURLAuditProduct;

    // There was a single valid canonical URL, so now we'll just check for common mistakes.
    const canonicalURL = new URL([...canonicalURLData.uniqueCanonicalURLs][0]);
    const mistakeAuditProduct = Canonical.findCommonCanonicalURLMistakes(
      canonicalURLData,
      canonicalURL,
      baseURL
    );

    if (mistakeAuditProduct) return mistakeAuditProduct;

    return {
      score: 1,
    };
  }
}

export default Canonical;
export {UIStrings};
