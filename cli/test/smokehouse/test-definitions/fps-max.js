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
  },
};

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 */
const expectations = {
  artifacts: {
    ViewportDimensions: {
      innerWidth: 412,
      innerHeight: 823,
      outerWidth: 412,
      outerHeight: 823,
      devicePixelRatio: 1.75,
    },
  },
  lhr: {
    requestedUrl: 'http://localhost:10200/max-texture-size.html',
    finalDisplayedUrl: 'http://localhost:10200/max-texture-size.html',
    audits: {},
    fullPageScreenshot: {
      screenshot: {
        data: /^data:image\/webp;base64,.{50}/,
        height: 16383,
        width: 412,
      },
    },
  },
};

export default {
  id: 'fps-max',
  expectations,
  config,
};
