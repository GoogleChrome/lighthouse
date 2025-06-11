/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 * Expected Lighthouse results a site with mixed-content issues.
 */
const expectations = {
  artifacts: {
    InspectorIssues: {
      mixedContentIssue: {
        0: {
          resourceType: 'Image',
          resolutionStatus: 'MixedContentAutomaticallyUpgraded',
          insecureURL: 'http://cdn.glitch.com/446ca0ec-cc52-4774-889a-6dc040eac6ef%2Fpuppy.jpg?v=1600261043278',
          mainResourceURL: 'https://passive-mixed-content.glitch.me/',
          request: {
            url: 'http://cdn.glitch.com/446ca0ec-cc52-4774-889a-6dc040eac6ef%2Fpuppy.jpg?v=1600261043278',
          },
        },
      },
    },
  },
  lhr: {
    requestedUrl: 'https://passive-mixed-content.glitch.me/',
    finalDisplayedUrl: 'https://passive-mixed-content.glitch.me/',
    audits: {
      'is-on-https': {
        score: 0,
      },
    },
  },
};

export default {
  id: 'issues-mixed-content',
  expectations,
};
