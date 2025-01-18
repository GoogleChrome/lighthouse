/**
 * @license Copyright 2023 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
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
      innerWidth: 1325,
      innerHeight: 2647,
      outerWidth: 412,
      outerHeight: 823,
      devicePixelRatio: 1.75,
    },
  },
  lhr: {
    requestedUrl: 'http://localhost:10200/scaled-overflow-content.html',
    finalDisplayedUrl: 'http://localhost:10200/scaled-overflow-content.html',
    audits: {},
    fullPageScreenshot: {
      nodes: {
        _includes: [
          [
            /-BODY$/,
            {
              top: 21,
              bottom: 58,
              left: 8,
              right: 816,
              width: 808,
              height: 37,
            },
          ],
          [
            /-H1$/,
            {
              top: 21,
              bottom: 58,
              left: 8,
              right: 816,
              width: 808,
              height: 37,
            },
          ],
        ],
      },
      screenshot: {
        height: 1646,
        width: 824,
      },
    },
  },
};

export default {
  id: 'fps-overflow-x',
  expectations,
  config,
};

