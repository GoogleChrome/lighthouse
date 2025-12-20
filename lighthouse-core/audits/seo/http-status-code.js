/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('../audit.js');
const MainResource = require('../../computed/main-resource.js');
const HTTP_UNSUCCESSFUL_CODE_LOW = 400;
const HTTP_UNSUCCESSFUL_CODE_HIGH = 599;
const i18n = require('../../lib/i18n/i18n.js');

const UIStrings = {
  /** Title of a Lighthouse audit that provides detail on the HTTP status code a page responds with. This descriptive title is shown when the page has responded with a valid HTTP status code. */
  title: 'Page has successful HTTP status code',
  /** Descriptive title of a Lighthouse audit that provides detail on the HTTP status code a page responds with. This descriptive title is shown when the page responds to requests with an HTTP status code that indicates the request was unsuccessful. */
  failureTitle: 'Page has unsuccessful HTTP status code',
  /** Description of a Lighthouse audit that tells the user *why* they need to serve pages with a valid HTTP status code. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'Pages with unsuccessful HTTP status codes may not be indexed properly. ' +
  '[Learn more](https://web.dev/http-status-code).',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

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
      requiredArtifacts: ['devtoolsLogs', 'URL'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static audit(artifacts, context) {
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    const URL = artifacts.URL;

    return MainResource.request({devtoolsLog, URL}, context)
      .then(mainResource => {
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
      });
  }
}

module.exports = HTTPStatusCode;
module.exports.UIStrings = UIStrings;
