/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const URL = require('../lib/url-shim.js');
const Audit = require('./audit.js');
const i18n = require('../lib/i18n/i18n.js');

const UIStrings = {
  /** Title of a Lighthouse audit that provides detail on the offline responsiveness of a website. "200" refers to the HTTP status code when a site responds successfully. This descriptive title is shown to users when the site responds successfully even when offline. */
  title: 'Current page responds with a 200 when offline',
  /** Title of a Lighthouse audit that provides detail on the offline responsiveness of a website. "200" refers to the HTTP status code when a site responds successfully. This descriptive title is shown to users when the site does not respond successfully when offline. */
  failureTitle: 'Current page does not respond with a 200 when offline',
  /** Description of a Lighthouse audit that tells the user why a website should respond to requests when offline. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'If you\'re building a Progressive Web App, consider using a service worker ' +
      'so that your app can work offline. ' +
      '[Learn more](https://web.dev/works-offline).',
  /**
   * @description Warning that the web page redirected during testing and that may have affected the offline load test.
   * @example {https://example.com/requested/page} requested
   * @example {https://example.com/final/resolved/page} final
   * */
  warningNoLoad: 'The page may not be loading offline because your test URL ' +
  `({requested}) was redirected to "{final}". ` +
  'Try testing the second URL directly.',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

class WorksOffline extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'works-offline',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['Offline', 'URL'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {LH.Audit.Product}
   */
  static audit(artifacts) {
    const warnings = [];
    const passed = artifacts.Offline === 200;
    if (!passed &&
        !URL.equalWithExcludedFragments(artifacts.URL.requestedUrl, artifacts.URL.finalUrl)) {
      warnings.push(str_(UIStrings.warningNoLoad,
        {requested: artifacts.URL.requestedUrl, final: artifacts.URL.finalUrl}));
    }

    return {
      score: Number(passed),
      warnings,
    };
  }
}

module.exports = WorksOffline;
module.exports.UIStrings = UIStrings;
