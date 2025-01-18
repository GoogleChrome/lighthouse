/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Audits a page to ensure charset it configured properly.
 * It must be defined within the first 1024 bytes of the HTML document, defined in the HTTP header, or the document source must start with a BOM.
 *
 * @see https://github.com/GoogleChrome/lighthouse/issues/10023
 */


import {Audit} from '../audit.js';
import * as i18n from '../../lib/i18n/i18n.js';
import {MainResource} from '../../computed/main-resource.js';

const UIStrings = {
  /** Title of a Lighthouse audit that provides detail on if the charset is set properly for a page. This title is shown when the charset is defined correctly. Charset defines the character encoding (eg UTF-8) of the page content. */
  title: 'Properly defines charset',
  /** Title of a Lighthouse audit that provides detail on if the charset is set properly for a page. This title is shown when the charset meta tag is missing or defined too late in the page. */
  failureTitle: 'Charset declaration is missing or occurs too late in the HTML',
  /** Description of a Lighthouse audit that tells the user why the charset needs to be defined early on. */
  description: 'A character encoding declaration is required. It can be done with a `<meta>` tag ' +
    'in the first 1024 bytes of the HTML or in the Content-Type HTTP response header. ' +
    '[Learn more about declaring the character encoding](https://developer.chrome.com/docs/lighthouse/best-practices/charset/).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

const CONTENT_TYPE_HEADER = 'content-type';
// /^[a-zA-Z0-9-_:.()]{2,}$/ matches all known IANA charset names (https://www.iana.org/assignments/character-sets/character-sets.xhtml)
const IANA_REGEX = /^[a-zA-Z0-9-_:.()]{2,}$/;
const CHARSET_HTML_REGEX = /<meta[^>]+charset[^<]+>/i;
const CHARSET_HTTP_REGEX = /charset\s*=\s*[a-zA-Z0-9-_:.()]{2,}/i;

class CharsetDefined extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'charset',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['MainDocumentContent', 'URL', 'devtoolsLogs', 'MetaElements'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    const mainResource = await MainResource.request({devtoolsLog, URL: artifacts.URL}, context);
    let isCharsetSet = false;
    // Check the http header 'content-type' to see if charset is defined there
    if (mainResource.responseHeaders) {
      const contentTypeHeader = mainResource.responseHeaders
        .find(header => header.name.toLowerCase() === CONTENT_TYPE_HEADER);

      if (contentTypeHeader) {
        isCharsetSet = CHARSET_HTTP_REGEX.test(contentTypeHeader.value);
      }
    }

    // Check if there is a BOM byte marker
    const BOM_FIRSTCHAR = 0xFEFF;
    isCharsetSet = isCharsetSet || artifacts.MainDocumentContent.charCodeAt(0) === BOM_FIRSTCHAR;

    // Check if charset-ish meta tag is defined within the first 1024 characters(~1024 bytes) of the HTML document
    if (CHARSET_HTML_REGEX.test(artifacts.MainDocumentContent.slice(0, 1024))) {
      // If so, double-check the DOM attributes, considering both legacy http-equiv and html5 charset styles.
      isCharsetSet = isCharsetSet || artifacts.MetaElements.some(meta => {
        return (meta.charset && IANA_REGEX.test(meta.charset)) ||
          (meta.httpEquiv === 'content-type' &&
          meta.content &&
          CHARSET_HTTP_REGEX.test(meta.content));
      });
    }

    return {
      score: Number(isCharsetSet),
    };
  }
}

export default CharsetDefined;
export {UIStrings, CHARSET_HTML_REGEX, CHARSET_HTTP_REGEX, IANA_REGEX};
