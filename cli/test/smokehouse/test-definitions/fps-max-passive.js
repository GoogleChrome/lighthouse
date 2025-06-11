/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/** @type {LH.Config} */
const config = {
  extends: 'lighthouse:default',
  settings: {
    usePassiveGathering: true,
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
    },
  },
  lhr: {
    requestedUrl: 'http://localhost:10200/max-texture-size.html',
    finalDisplayedUrl: 'http://localhost:10200/max-texture-size.html',
    audits: {},
    fullPageScreenshot: {
      screenshot: {
        data: /^data:image\/webp;base64,.{50}/,
        height: 823,
        width: 412,
      },
    },
  },
};

export default {
  id: 'fps-max-passive',
  expectations,
  config,
};
