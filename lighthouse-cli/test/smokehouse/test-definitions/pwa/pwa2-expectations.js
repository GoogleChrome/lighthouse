/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const pwaDetailsExpectations = require('./pwa-expectations-details.js');
const jakeExpectations = {...pwaDetailsExpectations, hasShortName: false};

/**
 * @type {Array<Smokehouse.ExpectedRunnerResult>}
 * Expected Lighthouse audit values for various sites with stable(ish) PWA
 * results.
 */
module.exports = [
  {
    lhr: {
      requestedUrl: 'https://jakearchibald.github.io/svgomg/',
      finalUrl: 'https://jakearchibald.github.io/svgomg/',
      audits: {
        'is-on-https': {
          score: 1,
        },
        'redirects-http': {
        // Note: relies on JS redirect.
        // see https://github.com/GoogleChrome/lighthouse/issues/2383
          score: 0,
        },
        'service-worker': {
          score: 1,
        },
        'works-offline': {
          score: 1,
        },
        'offline-start-url': {
          score: 1,
        },
        'viewport': {
          score: 1,
        },
        'without-javascript': {
          score: 1,
        },
        'load-fast-enough-for-pwa': {
        // Ignore speed test; just verify that it ran.
        },
        'installable-manifest': {
          score: 0,
          details: {items: [jakeExpectations]},
          explanation: /^Failures: .*short_name/,
        },
        'splash-screen': {
          score: 1,
          details: {items: [jakeExpectations]},
        },
        'themed-omnibox': {
          score: 1,
          details: {items: [jakeExpectations]},
        },
        'content-width': {
          score: 1,
        },
        'apple-touch-icon': {
          score: 1,
          warnings: [
            /apple-touch-icon-precomposed/,
          ],
        },

        // "manual" audits. Just verify in the results.
        'pwa-cross-browser': {
          score: null,
          scoreDisplayMode: 'manual',
        },
        'pwa-page-transitions': {
          score: null,
          scoreDisplayMode: 'manual',
        },
        'pwa-each-page-has-url': {
          score: null,
          scoreDisplayMode: 'manual',
        },
      },
    },
  },

  {
    lhr: {
      requestedUrl: 'https://shop.polymer-project.org/',
      finalUrl: 'https://shop.polymer-project.org/',
      audits: {
        'is-on-https': {
          score: 1,
        },
        'redirects-http': {
          score: 1,
        },
        'service-worker': {
          score: 1,
        },
        'works-offline': {
          score: 1,
        },
        'offline-start-url': {
          score: 1,
        },
        'viewport': {
          score: 1,
        },
        'without-javascript': {
          score: 1,
        },
        'load-fast-enough-for-pwa': {
        // Ignore speed test; just verify that it ran.
        },
        'installable-manifest': {
          score: 1,
          details: {items: [pwaDetailsExpectations]},
        },
        'splash-screen': {
          score: 1,
          details: {items: [pwaDetailsExpectations]},
        },
        'themed-omnibox': {
          score: 1,
          details: {items: [pwaDetailsExpectations]},
        },
        'content-width': {
          score: 1,
        },
        'apple-touch-icon': {
          score: 0,
        },

        // "manual" audits. Just verify in the results.
        'pwa-cross-browser': {
          score: null,
          scoreDisplayMode: 'manual',
        },
        'pwa-page-transitions': {
          score: null,
          scoreDisplayMode: 'manual',
        },
        'pwa-each-page-has-url': {
          score: null,
          scoreDisplayMode: 'manual',
        },
      },
    },
  },
];
