/**
 * @license Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/** @type {LH.Config} */
const config = {
  extends: 'lighthouse:default',
  settings: {
    formFactor: 'desktop',
    screenEmulation: {
      width: 1024,
      height: 768,
      deviceScaleFactor: 1,
      mobile: false,
      disabled: false,
    },
  },
};

const elements = {
  body: {
    top: 8,
    bottom: 1008,
    left: 8,
    right: 1008,
    width: 1000,
    height: 1000,
  },
  p: {
    top: 8,
    left: 8,
    height: '>40',
  },
};

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 */
const expectations = {
  lhr: {
    requestedUrl: 'http://localhost:10200/screenshot.html?width=1000px&height=1000px',
    finalDisplayedUrl: 'http://localhost:10200/screenshot.html?width=1000px&height=1000px',
    audits: {},
    fullPageScreenshot: {
      screenshot: {
        width: '>1000',
        height: '>1000',
        data: /data:image\/webp;base64,.{10000,}$/,
      },
      nodes: {
        _includes: [
          ['page-0-P', elements.p],
          [/[0-9]-[0-9]-BODY/, elements.body],
          [/[0-9]-[0-9]-P/, elements.p],
          [/[0-9]-[0-9]-HTML/, {}],
        ],
      },
    },
  },
};

export default {
  id: 'screenshot',
  expectations,
  config,
};
