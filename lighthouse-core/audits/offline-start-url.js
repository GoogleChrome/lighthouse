/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit.js');
const i18n = require('../lib/i18n/i18n.js');

const UIStrings = {
  /** Title of a Lighthouse audit that provides detail on the a website's offline capabilities. "200" refers to the HTTP status code when a site responds successfully. This descriptive title is shown to users when the test page responds successfully while offline. */
  title: '`start_url` responds with a 200 when offline',
  /** Title of a Lighthouse audit that provides detail on the a website's offline capabilities. "200" refers to the HTTP status code when a site responds successfully. This descriptive title is shown to users when the test page does not respond successfully while offline. */
  failureTitle: '`start_url` does not respond with a 200 when offline',
  /** Description of a Lighthouse audit that tells the user why a website should respond to requests when offline. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'A service worker enables your web app to be reliable in unpredictable ' +
    'network conditions. [Learn more](https://web.dev/offline-start-url).',
  /**
   * @description Warning that the audit couldn't find the start_url and used the page's URL instead.
   * @example {No Manifest Fetched.} manifestWarning
   */
  warningCantStart: 'Lighthouse couldn\'t read the `start_url` from the manifest. As a result, ' +
  'the `start_url` was assumed to be the document\'s URL. Error message: \'{manifestWarning}\'.',
  /**
   * @description Warning that the audit couldn't find the start_url and used the page's URL instead.
   * @example {https://www.example.com} url
   * @example {404} statusCode
   */
  errorLoading: 'Error loading {url} in Service Worker, got status code {statusCode}',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

class OfflineStartUrl extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'offline-start-url',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['WebAppManifest', 'StartUrl'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {LH.Audit.Product}
   */
  static audit(artifacts) {
    // StartUrl gatherer will give explanations for failures, but need to take manifest parsing
    // warnings from the manifest itself (e.g. invalid `start_url`, so fell back to document URL).
    const warnings = [];
    const manifest = artifacts.WebAppManifest;
    if (manifest && manifest.value && manifest.value.start_url.warning) {
      const manifestWarning = manifest.value.start_url.warning;
      warnings.push(str_(UIStrings.warningCantStart, {manifestWarning}));
    }

    const hasOfflineStartUrl = artifacts.StartUrl.statusCode === 200;

    // The StartUrl artifact provides no explanation if a response was received from a service
    // worker with a non-200 status code. In that case, this audit provides its own explanation.
    // In all other cases it defers to the artifact explanation.
    let explanation = artifacts.StartUrl.explanation;
    if (!explanation && artifacts.StartUrl.statusCode !== -1 && !hasOfflineStartUrl) {
      explanation = str_(UIStrings.errorLoading, {
        url: artifacts.StartUrl.url || '',
        statusCode: artifacts.StartUrl.statusCode,
      });
    }

    return {
      score: Number(hasOfflineStartUrl),
      explanation,
      warnings,
    };
  }
}

module.exports = OfflineStartUrl;
module.exports.UIStrings = UIStrings;
