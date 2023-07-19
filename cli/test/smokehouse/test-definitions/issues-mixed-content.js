/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
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
