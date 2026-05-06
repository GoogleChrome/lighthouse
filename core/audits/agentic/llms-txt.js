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
  /** Title of a Lighthouse audit that provides detail on the site's llms.txt file. Note: "llms.txt" is a canonical filename and should not be translated. This descriptive title is shown when the llms.txt file is present and configured correctly. */
  title: 'llms.txt is present',
  /** Title of a Lighthouse audit that provides detail on the site's llms.txt file. Note: "llms.txt" is a canonical filename and should not be translated. This descriptive title is shown when the llms.txt file is misconfigured. */
  failureTitle: 'llms.txt is missing or incomplete',
  /** Description of a Lighthouse audit that tells the user *why* they need to have a valid llms.txt file. Note: "llms.txt" is a canonical filename and should not be translated. This is displayed after a user expands the section to see more. No character length limits. */
  description: 'If your llms.txt file is malformed, large language models may not be able to ' +
    'understand how you want your website to be crawled or used for training. A valid ' +
    'llms.txt should be a Markdown file containing at least one H1 header. ' +
    '[Learn more about llms.txt](https://llmstxt.org/).',
  /**
   * @description Label for the audit identifying that the request failed with a specific HTTP status code.
   * @example {500} statusCode
   * */
  displayValueHttpBadCode: 'Failed with HTTP status {statusCode}',
  /** Explanatory message stating that there was a failure in an audit caused by Lighthouse not being able to download the llms.txt file for the site.  Note: "llms.txt" is a canonical filename and should not be translated. */
  explanation: 'Fetch of llms.txt failed',
  /** Message indicating that the file is missing a required H1 header. */
  missingH1: 'File is missing a required H1 header (e.g., "# Title").',
  /** Message indicating that the file is suspiciously short. */
  tooShort: 'File is suspiciously short.',
  /** Message indicating that the file is missing links. */
  missingLinks: 'File does not appear to contain any links.',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

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
    } = artifacts.LlmsTxt;

    if (!status) {
      return {
        score: 0,
        explanation: str_(UIStrings.explanation),
      };
    }

    if (status >= HTTP_SERVER_ERROR_CODE_LOW) {
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
      throw new Error(`Status ${status} was valid, but content was null`);
    }

    const hasH1 = /^#\s+.+/m.test(content);
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
