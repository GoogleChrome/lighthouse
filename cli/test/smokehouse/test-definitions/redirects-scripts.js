/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/** @type {LH.Config} */
const config = {
  extends: 'lighthouse:default',
  settings: {
    onlyAudits: [
      'legacy-javascript',
      'unused-javascript',
      'redirects',
    ],
  },
};

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 */
const expectations = {
  lhr: {
    runWarnings: [
      /The page may not be loading as expected/,
    ],
    requestedUrl: 'http://localhost:10200/online-only.html?redirect=/redirects-scripts.html',
    finalDisplayedUrl: 'http://localhost:10200/redirects-scripts.html',
    audits: {
      'unused-javascript': {
        details: {
          items: [
            {
              // A sourced script that redirects will use the value of the `src` attribute as it's script URL.
              // This check ensures that we resolve the redirect and use the final redirect network request to compute savings.
              // We can distinguish using totalBytes because the final request is compressed while the redirect request is not.
              url: 'http://localhost:10200/simple-script.js?redirect=%2Funused-javascript.js%3Fgzip%3D1',
              totalBytes: '285000 +/- 2000',
            },
          ],
        },
      },
      'legacy-javascript': {
        details: {
          items: [
            {
              // An inline script that in a document that redirects will take the destination URL as it's script URL.
              url: 'http://localhost:10200/redirects-scripts.html',
              subItems: {
                items: [
                  {signal: 'Array.prototype.findIndex'},
                ],
              },
            },
          ],
        },
      },
      'redirects': {
        numericValue: '>0',
        details: {
          items: [
            // Conservative wastedMs to avoid flakes.
            {url: /online-only\.html/, wastedMs: '>0'},
            {url: /redirects-scripts\.html/, wastedMs: 0},
          ],
        },
      },
    },
  },
};

export default {
  id: 'redirects-scripts',
  expectations,
  config,
};
