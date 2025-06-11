/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/** @type {LH.Config} */
const config = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['performance'],
    onlyAudits: ['font-size'],
  },
};

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 */
const expectations = {
  artifacts: {
    ViewportDimensions: {
      innerWidth: 824,
      innerHeight: 1646,
      outerWidth: 412,
      outerHeight: 823,
      devicePixelRatio: 1.75,
    },
  },
  lhr: {
    requestedUrl: 'http://localhost:10200/scaled-content.html',
    finalDisplayedUrl: 'http://localhost:10200/scaled-content.html',
    audits: {
      'viewport': {
        score: 0,
        details: {
          type: 'debugdata',
          viewportContent: 'initial-scale=0.5',
        },
      },
      'font-size': {
        score: 0,
        explanation:
          'Text is illegible because there\'s no viewport meta tag optimized for mobile screens.',
      },
    },
    fullPageScreenshot: {
      nodes: {
        _includes: [
          [
            /-BODY$/,
            {
              top: 0,
              bottom: 2000,
              left: 0,
              right: 824,
              width: 824,
              height: 2000,
            },
          ],
          [
            /-H1$/,
            {
              top: 0,
              bottom: 37,
              left: 0,
              right: 824,
              width: 824,
              height: 37,
            },
          ],
        ],
      },
      screenshot: {
        height: 2000,
        width: 824,
      },
    },
  },
};

export default {
  id: 'fps-scaled',
  expectations,
  config,
};

