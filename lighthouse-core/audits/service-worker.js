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
  /** Title of a Lighthouse audit that provides detail on a page's service worker. This descriptive title is shown to users when a service worker is registered and valid. */
  title: 'Registers a service worker that controls page and `start_url`',
  /** Title of a Lighthouse audit that provides detail on a page's service worker. This descriptive title is shown to users when a service worker is not present or invalid. */
  failureTitle: 'Does not register a service worker that controls page and `start_url`',
  /** Description of a Lighthouse audit that tells the user why they should use a service worker. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'The service worker is the technology that enables your app to use many ' +
    'Progressive Web App features, such as offline, add to homescreen, and push ' +
    'notifications. [Learn more](https://web.dev/service-worker).',
  /**
   * @description Message explaining that the website may have service workers, but none are in scope to control the tested web page.
   * @example {https://example.com/} pageUrl
   * */
  explanationOutOfScope: 'This origin has one or more service workers, however the page ' +
    '({pageUrl}) is not in scope.',
  /** Message explaining that the page has no manifest file so can't specify a starting url. */
  explanationNoManifest: 'This page is controlled by a service worker, however ' +
    'no `start_url` was found because no manifest was fetched.',
  /** Message explaining that the page had an invalid manifest file so can't specify a starting url. */
  explanationBadManifest: 'This page is controlled by a service worker, however ' +
    'no `start_url` was found because manifest failed to parse as valid JSON',
  /**
   * @description Message explaining that the website has a service worker, but none are in scope to control the tested starting url.
   * @example {https://example.com/} startUrl
   * @example {https://othersite.com/} scopeUrl
   * */
  explanationBadStartUrl: 'This page is controlled by a service worker, however ' +
    'the `start_url` ({startUrl}) is not in the service worker\'s scope ({scopeUrl})',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

class ServiceWorker extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'service-worker',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['URL', 'ServiceWorker', 'WebAppManifest'],
    };
  }

  /**
   * Find active service workers for this origin.
   * @param {Array<LH.Crdp.ServiceWorker.ServiceWorkerVersion>} versions
   * @param {URL} pageUrl
   * @return {Array<LH.Crdp.ServiceWorker.ServiceWorkerVersion>}
   */
  static getVersionsForOrigin(versions, pageUrl) {
    return versions
      .filter(v => v.status === 'activated')
      .filter(v => new URL(v.scriptURL).origin === pageUrl.origin);
  }

  /**
   * From the set of active service workers for this origin, find the controlling SW (if any)
   * and return its scope URL.
   * @param {Array<LH.Crdp.ServiceWorker.ServiceWorkerVersion>} matchingSWVersions
   * @param {Array<LH.Crdp.ServiceWorker.ServiceWorkerRegistration>} registrations
   * @param {URL} pageUrl
   * @return {string|undefined}
   */
  static getControllingScopeUrl(matchingSWVersions, registrations, pageUrl) {
    // Find the normalized scope URLs of possibly-controlling SWs.
    const matchingScopeUrls = matchingSWVersions
      .map(v => registrations.find(r => r.registrationId === v.registrationId))
      .filter(/** @return {r is LH.Crdp.ServiceWorker.ServiceWorkerRegistration} */ r => !!r)
      .map(r => new URL(r.scopeURL).href);

    // Find most-specific applicable scope, the one controlling the page.
    // See https://w3c.github.io/ServiceWorker/v1/#scope-match-algorithm
    const pageControllingScope = matchingScopeUrls
      .filter(scopeUrl => pageUrl.href.startsWith(scopeUrl))
      .sort((scopeA, scopeB) => scopeA.length - scopeB.length)
      .pop();

    return pageControllingScope;
  }

  /**
   * Returns a failure message if there is no start_url or if the start_url isn't
   * contolled by the scopeUrl.
   * @param {LH.Artifacts['WebAppManifest']} WebAppManifest
   * @param {string} scopeUrl
   * @return {string|undefined}
   */
  static checkStartUrl(WebAppManifest, scopeUrl) {
    if (!WebAppManifest) {
      return str_(UIStrings.explanationNoManifest);
    }
    if (!WebAppManifest.value) {
      return str_(UIStrings.explanationBadManifest);
    }

    const startUrl = WebAppManifest.value.start_url.value;
    if (!startUrl.startsWith(scopeUrl)) {
      return str_(UIStrings.explanationBadStartUrl, {startUrl, scopeUrl});
    }
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {LH.Audit.Product}
   */
  static audit(artifacts) {
    // Match against artifacts.URL.finalUrl so audit accounts for any redirects.
    const pageUrl = new URL(artifacts.URL.finalUrl);
    const {versions, registrations} = artifacts.ServiceWorker;

    const versionsForOrigin = ServiceWorker.getVersionsForOrigin(versions, pageUrl);
    if (versionsForOrigin.length === 0) {
      return {
        score: 0,
      };
    }

    const controllingScopeUrl = ServiceWorker.getControllingScopeUrl(versionsForOrigin,
        registrations, pageUrl);
    if (!controllingScopeUrl) {
      return {
        score: 0,
        explanation: str_(UIStrings.explanationOutOfScope, {pageUrl: pageUrl.href}),
      };
    }

    const startUrlFailure = ServiceWorker.checkStartUrl(artifacts.WebAppManifest,
        controllingScopeUrl);
    if (startUrlFailure) {
      return {
        score: 0,
        explanation: startUrlFailure,
      };
    }

    // SW controls both finalUrl and start_url.
    return {
      score: 1,
    };
  }
}

module.exports = ServiceWorker;
module.exports.UIStrings = UIStrings;
