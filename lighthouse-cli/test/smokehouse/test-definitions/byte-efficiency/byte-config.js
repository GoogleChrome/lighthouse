/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @type {LH.Config.Json}
 * Config file for running byte efficiency smokehouse audits.
 */
const config = {
  extends: 'lighthouse:default',
  settings: {
    onlyAudits: [
      'accesskeys', // run axe on the page since we've had problems with interactions
      'network-requests',
      'offscreen-images',
      'uses-webp-images',
      'uses-optimized-images',
      'uses-text-compression',
      'uses-responsive-images',
      'unminified-css',
      'unminified-javascript',
      'unused-css-rules',
      'unused-javascript',
    ],
    throttlingMethod: 'devtools',
  },
  // source-maps is not yet in the default config.
  passes: [{
    passName: 'defaultPass',
    gatherers: [
      'source-maps',
    ],
  }],
};

module.exports = config;
