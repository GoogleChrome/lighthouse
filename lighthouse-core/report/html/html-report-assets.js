/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const fs = require('fs');

const REPORT_TEMPLATE = fs.readFileSync(__dirname + '/report-template.html', 'utf8');
const REPORT_JAVASCRIPT = [
  fs.readFileSync(__dirname + '/renderer/util.js', 'utf8'),
  fs.readFileSync(__dirname + '/renderer/dom.js', 'utf8'),
  // COMPAT: Remove when Microsoft Edge supports <details>/<summary>
  // https://developer.microsoft.com/en-us/microsoft-edge/platform/status/detailssummary/?q=details
  fs.readFileSync(require.resolve('details-element-polyfill'), 'utf8'),
  fs.readFileSync(__dirname + '/renderer/details-renderer.js', 'utf8'),
  fs.readFileSync(__dirname + '/renderer/crc-details-renderer.js', 'utf8'),
  fs.readFileSync(__dirname + '/renderer/snippet-renderer.js', 'utf8'),
  fs.readFileSync(__dirname + '/../../lib/file-namer.js', 'utf8'),
  fs.readFileSync(__dirname + '/renderer/logger.js', 'utf8'),
  fs.readFileSync(__dirname + '/renderer/report-ui-features.js', 'utf8'),
  fs.readFileSync(__dirname + '/renderer/category-renderer.js', 'utf8'),
  fs.readFileSync(__dirname + '/renderer/performance-category-renderer.js', 'utf8'),
  fs.readFileSync(__dirname + '/renderer/pwa-category-renderer.js', 'utf8'),
  fs.readFileSync(__dirname + '/renderer/report-renderer.js', 'utf8'),
  fs.readFileSync(__dirname + '/renderer/i18n.js', 'utf8'),
].join(';\n');
const REPORT_CSS = fs.readFileSync(__dirname + '/report-styles.css', 'utf8');
const REPORT_TEMPLATES = fs.readFileSync(__dirname + '/templates.html', 'utf8');

// Changes to this export interface should be reflected in build/build-dt-report-resources.js
// and clients/devtools-report-assets.js
module.exports = {
  REPORT_TEMPLATE,
  REPORT_TEMPLATES,
  REPORT_JAVASCRIPT,
  REPORT_CSS,
};
