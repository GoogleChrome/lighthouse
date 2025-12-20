/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @type {Array<Smokehouse.ExpectedRunnerResult>}
 * Expected Lighthouse results from testing the defaut audits on local test
 * pages, one of which works offline with a service worker and one of which does
 * not.
 */
module.exports = [
  {
    lhr: {
      requestedUrl: 'http://localhost:10200/online-only.html',
      finalUrl: 'http://localhost:10200/online-only.html',
      audits: {
        'is-on-https': {
          score: 1,
        },
        'external-anchors-use-rel-noopener': {
          score: 1,
        },
        'appcache-manifest': {
          score: 1,
        },
        'geolocation-on-start': {
          score: 1,
        },
        'render-blocking-resources': {
          score: 1,
        },
        'password-inputs-can-be-pasted-into': {
          score: 1,
        },
        'redirects-http': {
          score: 0,
        },
        'service-worker': {
          score: 0,
        },
        'works-offline': {
          score: 0,
        },
        'viewport': {
          score: 1,
        },
        'without-javascript': {
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
          explanation: 'Failures: No manifest was fetched.',
          details: {items: [{isParseFailure: true}]},
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
  },
  {
    artifacts: {
      WebAppManifest: {
        value: {
          icons: {
            value: [
              {value: {src: {value: 'http://localhost:10503/launcher-icon-0-75x.png'}}},
              {value: {src: {value: 'http://localhost:10503/launcher-icon-1x.png'}}},
              {value: {src: {value: 'http://localhost:10503/launcher-icon-1-5x.png'}}},
              {value: {src: {value: 'http://localhost:10503/launcher-icon-2x.png'}}},
              {value: {src: {value: 'http://localhost:10503/launcher-icon-3x.png'}}},
            ],
          },
        },
      },
      InstallabilityErrors: {
        errors: [
          {errorId: 'no-icon-available'},
        ],
      },
    },
    lhr: {
      requestedUrl: 'http://localhost:10503/offline-ready.html',
      finalUrl: 'http://localhost:10503/offline-ready.html',
      audits: {
        'is-on-https': {
          score: 1,
        },
        'redirects-http': {
          score: 0,
        },
        'service-worker': {
          score: 1,
        },
        'works-offline': {
          score: 1,
        },
        'viewport': {
          score: 1,
        },
        'without-javascript': {
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
          explanation: 'Failures: Manifest icon failed to be fetched.',
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
          score: 0,
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
  },

  {
    lhr: {
      requestedUrl: 'http://localhost:10503/offline-ready.html?slow',
      finalUrl: 'http://localhost:10503/offline-ready.html?slow',
      audits: {
        'service-worker': {
          score: 1,
        },
        'works-offline': {
          score: 1,
        },
      },
    },
  },
];
