/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Audit} from '../audit.js';
import * as i18n from '../../lib/i18n/i18n.js';
import {MainResource} from '../../computed/main-resource.js';

const HTTP_UNSUCCESSFUL_CODE_LOW = 400;
const HTTP_UNSUCCESSFUL_CODE_HIGH = 599;

const UIStrings = {
  /** Title of a Lighthouse audit that provides detail on the HTTP status code a page responds with. This descriptive title is shown when the page has responded with a valid HTTP status code. */
  title: 'Page has successful HTTP status code',
  /** Descriptive title of a Lighthouse audit that provides detail on the HTTP status code a page responds with. This descriptive title is shown when the page responds to requests with an HTTP status code that indicates the request was unsuccessful. */
  failureTitle: 'Page has unsuccessful HTTP status code',
  /** Description of a Lighthouse audit that tells the user *why* they need to serve pages with a valid HTTP status code. This is displayed after a user expands the section to see more. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  description: 'Pages with unsuccessful HTTP status codes may not be indexed properly. ' +
  '[Learn more about HTTP status codes](https://developer.chrome.com/docs/lighthouse/seo/http-status-code/).',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

class HTTPStatusCode extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'http-status-code',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['devtoolsLogs', 'URL', 'GatherContext'],
      supportedModes: ['navigation'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    const URL = artifacts.URL;
    const mainResource = await MainResource.request({devtoolsLog, URL}, context);

    const statusCode = mainResource.statusCode;

    if (statusCode >= HTTP_UNSUCCESSFUL_CODE_LOW &&
          statusCode <= HTTP_UNSUCCESSFUL_CODE_HIGH) {
      return {
        score: 0,
        displayValue: `${statusCode}`,
      };
    }

    return {
      score: 1,
    };
  }
}

export default HTTPStatusCode;
export {UIStrings};
