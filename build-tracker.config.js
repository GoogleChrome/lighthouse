/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

// https://buildtracker.dev/docs/installation/#upload-your-builds

module.exports = {
  applicationUrl: 'https://lh-build-tracker.herokuapp.com',
  artifacts: [
    'dist/lightrider/lighthouse-lr-bundle.js',
    'dist/extension/scripts/lighthouse-ext-bundle.js',
    'dist/lighthouse-dt-bundle.js',
    'dist/gh-pages/viewer/src/bundled.js',
    'dist/gh-pages/treemap/src/bundled.js',
    'dist/lightrider/report-generator-bundle.js',
    'dist/dt-report-resources/report.js',
    'dist/dt-report-resources/report-generator.js',
  ],
};
