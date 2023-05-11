/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/** @type {LH.Config} */
const config = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: [
      'best-practices',
    ],
    onlyAudits: [
      'is-on-https',
      'redirects-http',
      'service-worker',
      'viewport',
      'user-timings',
      'critical-request-chains',
      'render-blocking-resources',
      'installable-manifest',
      'splash-screen',
      'themed-omnibox',
      'aria-valid-attr',
      'aria-allowed-attr',
      'color-contrast',
      'image-alt',
      'label',
      'tabindex',
      'content-width',
    ],
  },
};

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 * Expected Lighthouse results from testing a page that does not work offline.
 */
const expectations = {
  lhr: {
    requestedUrl: 'http://localhost:10200/online-only.html',
    finalDisplayedUrl: 'http://localhost:10200/online-only.html',
    audits: {
      'is-on-https': {
        score: 1,
      },
      'redirects-http': {
        // localhost, so redirect check is n/a.
        score: null,
        scoreDisplayMode: 'notApplicable',
      },
      'geolocation-on-start': {
        score: 1,
      },
      'render-blocking-resources': {
        score: 1,
      },
      'paste-preventing-inputs': {
        score: 1,
      },
      'service-worker': {
        score: 0,
      },
      'viewport': {
        score: 1,
      },
      'user-timings': {
        scoreDisplayMode: 'notApplicable',
      },
      'critical-request-chains': {
        scoreDisplayMode: 'notApplicable',
      },
      'installable-manifest': {
        score: 0,
        details: {items: [{reason: 'Page has no manifest <link> URL'}]},
      },
      'splash-screen': {
        score: 0,
      },
      'themed-omnibox': {
        score: 0,
      },
      'aria-valid-attr': {
        scoreDisplayMode: 'notApplicable',
      },
      'aria-allowed-attr': {
        scoreDisplayMode: 'notApplicable',
      },
      'color-contrast': {
        score: 1,
      },
      'image-alt': {
        scoreDisplayMode: 'notApplicable',
      },
      'label': {
        scoreDisplayMode: 'notApplicable',
      },
      'tabindex': {
        scoreDisplayMode: 'notApplicable',
      },
      'content-width': {
        score: 1,
      },
    },
  },
};

export default {
  id: 'offline-online-only',
  expectations,
  config,
  runSerially: true,
};
