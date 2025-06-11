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
    requestedUrl: 'http://localhost:10200/perf/animations.html',
    finalDisplayedUrl: 'http://localhost:10200/perf/animations.html',
    audits: {
      'non-composited-animations': {
        score: 1,
        displayValue: '1 animated element found',
        details: {
          items: [
            {
              node: {
                type: 'node',
                path: '2,HTML,1,BODY,1,DIV',
                selector: 'body > div#animated-boi',
                nodeLabel: 'This is changing font size',
                snippet: '<div id="animated-boi">',
              },
              subItems: {
                items: [
                  {
                    // From JavaScript `.animate` which has no animation display name
                    failureReason: 'Unsupported CSS Property: width',
                  },
                  {
                    failureReason: 'Unsupported CSS Property: height',
                    animation: 'alpha',
                  },
                  {
                    failureReason: 'Unsupported CSS Property: font-size',
                    animation: 'beta',
                  },
                ],
              },
            },
          ],
        },
      },
    },
  },
};

export default {
  id: 'perf-diagnostics-animations',
  expectations,
  config,
};
