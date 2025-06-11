/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/** @type {LH.Config} */
const config = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['best-practices'],
  },
};

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 */
const expectations = {
  artifacts: {
    MainDocumentContent: /reloaded/,
  },
  lhr: {
    requestedUrl: 'http://localhost:10200/sw-reloaded.html',
    finalDisplayedUrl: 'http://localhost:10200/sw-reloaded.html',
    audits: {},
  },
};

export default {
  id: 'service-worker-reloaded',
  expectations,
  config,
};
