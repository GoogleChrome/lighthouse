/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Audit} from '../audit.js';
import * as i18n from '../../lib/i18n/i18n.js';

const HTTP_CLIENT_ERROR_CODE_LOW = 400;
const HTTP_SERVER_ERROR_CODE_LOW = 500;

const UIStrings = {
  /** Title of a Lighthouse audit that provides detail on the site's llms.txt file. Note: "llms.txt" is a canonical filename and should not be translated. This descriptive title is shown when the llms.txt file follows community recommendations. */
  title: 'llms.txt follows recommendations',
  /** Title of a Lighthouse audit that provides detail on the site's llms.txt file. Note: "llms.txt" is a canonical filename and should not be translated. This descriptive title is shown when the llms.txt file does not follow community recommendations. */
  failureTitle: 'llms.txt does not follow recommendations',
  /** Description of a Lighthouse audit that tells the user *why* they should have an llms.txt file. Note: "llms.txt" is a canonical filename and should not be translated. This is displayed after a user expands the section to see more. No character length limits. */
  description: 'An [llms.txt](https://llmstxt.org/) file gives large language models a ' +
    'Markdown summary of your site that they can use when answering questions. ' +
    'The file should contain at least one H1 header. ' +
    '[Learn more about the llms.txt audit](https://developer.chrome.com/docs/lighthouse/agentic-browsing/llms-txt).',
  /**
   * @description Label for the audit identifying that the request failed with a specific HTTP status code.
   * @example {500} statusCode
   * */
  displayValueHttpBadCode: 'Failed with HTTP status {statusCode}',
  /**
   * @description Explanatory message stating that there was a failure in an audit caused by Lighthouse not being able to download the llms.txt file for the site.  Note: "llms.txt" is a canonical filename and should not be translated.
   * @example {Timed out fetching resource} error
   * */
  explanationWithError: 'Fetch of llms.txt failed: {error}',
  /** Explanatory message stating that there was a failure in an audit caused by Lighthouse not being able to download the llms.txt file for the site.  Note: "llms.txt" is a canonical filename and should not be translated. */
  explanation: 'Fetch of llms.txt failed',
  /** Message indicating that the server returned an HTML page instead of the llms.txt file, for example a fallback page that the server shows for any unknown URL when the file does not exist, or a page from a CDN or bot protection service that checks whether the visitor is a human. Note: "llms.txt" is a canonical filename and should not be translated. */
  htmlResponse: 'Received an HTML page instead of the llms.txt file. The server may have ' +
    'returned a fallback page because the file is missing, or a CDN or bot protection may ' +
    'have served a challenge page instead.',
  /** Message indicating that the file is missing a required H1 header. */
  missingH1: 'File is missing a required H1 header (e.g., "# Title").',
  /** Message indicating that the file is suspiciously short. */
  tooShort: 'File is suspiciously short.',
  /** Message indicating that the file is missing links. */
  missingLinks: 'File does not appear to contain any links.',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

const HTML_DOCUMENT_RE = /^\s*<(!doctype\s+html|html)\b/i;
// Tags an HTML page can start with. Used only when the server says the response is HTML.
const HTML_START_TAG_RE = /^\s*<(!doctype|html|head|body|meta|title|script|style|link)\b/i;

class LlmsTxt extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'llms-txt',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['LlmsTxt'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {LH.Audit.Product}
   */
  static audit(artifacts) {
    const {
      status,
      content,
      headers,
      errorMessage,
    } = artifacts.LlmsTxt;

    if (errorMessage) {
      return {
        score: 0,
        explanation: str_(UIStrings.explanationWithError, {error: errorMessage}),
      };
    }

    if (!status) {
      return {
        score: 0,
        explanation: str_(UIStrings.explanation),
      };
    }

    if (status >= HTTP_SERVER_ERROR_CODE_LOW || status === 429) {
      return {
        score: 0,
        displayValue: str_(UIStrings.displayValueHttpBadCode, {statusCode: status}),
      };
    } else if (status >= HTTP_CLIENT_ERROR_CODE_LOW) {
      return {
        score: 1,
        notApplicable: true,
      };
    }

    if (content === null) {
      return {
        score: 0,
        explanation: str_(UIStrings.explanation),
      };
    }

    // Hosts and bot protection sometimes answer with an HTML page. Some servers also label
    // real Markdown as text/html, so only trust the header when the body looks like a page.
    const contentType = headers?.['content-type'] || '';
    const isHtml = HTML_DOCUMENT_RE.test(content) ||
      (/html/i.test(contentType) && HTML_START_TAG_RE.test(content));
    if (isHtml) {
      return {
        score: 0,
        explanation: str_(UIStrings.htmlResponse),
      };
    }

    const hasH1 = /^\s*#\s+.+/m.test(content);
    const hasLink = /\[.+\]\(.+\)/.test(content);
    const isTooShort = content.length < 50;

    const errors = [];
    if (!hasH1) errors.push(str_(UIStrings.missingH1));
    if (!hasLink) errors.push(str_(UIStrings.missingLinks));
    if (isTooShort) errors.push(str_(UIStrings.tooShort));

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'message', valueType: 'text', label: 'Error'},
    ];

    const details = Audit.makeTableDetails(headings, errors.map(m => ({message: m})));

    return {
      score: Number(errors.length === 0),
      details: errors.length ? details : undefined,
    };
  }
}

export default LlmsTxt;
export {UIStrings};
