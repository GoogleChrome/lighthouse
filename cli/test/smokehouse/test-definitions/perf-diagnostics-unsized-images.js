/**
 * @license
 * Copyright 2021 Google LLC
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
  lhr: {
    requestedUrl: 'http://localhost:10200/perf/unsized-images.html',
    finalDisplayedUrl: 'http://localhost:10200/perf/unsized-images.html',
    audits: {
      'unsized-images': {
        score: 0.5,
        details: {
          items: [
            {
              node: {
                snippet: '<img src="../launcher-icon-100x100.png" width="100">',
              },
            },
            {
              node: {
                snippet: '<img src="../launcher-icon-100x100.png" height="100">',
              },
            },
            {
              node: {
                snippet: '<img src="../launcher-icon-100x100.png" style="width: 100;">',
              },
            },
            {
              node: {
                snippet: '<img src="../launcher-icon-100x100.png" style="height: 100;">',
              },
            },
            {
              node: {
                snippet: '<img src="../launcher-icon-100x100.png" style="aspect-ratio: 1 / 1;">',
              },
            },
            {
              node: {
                snippet: '<img src="../launcher-icon-100x100.png" style="width: 100; height: auto;">',
              },
            },
          ],
        },
      },
    },
  },
};

export default {
  id: 'perf-diagnostics-unsized-images',
  expectations,
  config,
};
