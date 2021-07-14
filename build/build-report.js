/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const fs = require('fs');

function concatRendererCode() {
  return [
    fs.readFileSync(__dirname + '/../report/renderer/util.js', 'utf8'),
    fs.readFileSync(__dirname + '/../report/renderer/template-components.js', 'utf8'),
    fs.readFileSync(__dirname + '/../report/renderer/dom.js', 'utf8'),
    fs.readFileSync(__dirname + '/../report/renderer/details-renderer.js', 'utf8'),
    fs.readFileSync(__dirname + '/../report/renderer/crc-details-renderer.js', 'utf8'),
    fs.readFileSync(__dirname + '/../report/renderer/snippet-renderer.js', 'utf8'),
    fs.readFileSync(__dirname + '/../report/renderer/element-screenshot-renderer.js', 'utf8'),
    fs.readFileSync(__dirname + '/../lighthouse-core/lib/file-namer.js', 'utf8'),
    fs.readFileSync(__dirname + '/../report/renderer/logger.js', 'utf8'),
    fs.readFileSync(__dirname + '/../report/renderer/report-ui-features.js', 'utf8'),
    fs.readFileSync(__dirname + '/../report/renderer/category-renderer.js', 'utf8'),
    fs.readFileSync(__dirname + '/../report/renderer/performance-category-renderer.js', 'utf8'),
    fs.readFileSync(__dirname + '/../report/renderer/pwa-category-renderer.js', 'utf8'),
    fs.readFileSync(__dirname + '/../report/renderer/report-renderer.js', 'utf8'),
    fs.readFileSync(__dirname + '/../report/renderer/i18n.js', 'utf8'),
    fs.readFileSync(__dirname + '/../report/renderer/text-encoding.js', 'utf8'),
  ].join(';\n');
}

async function buildStandaloneReport() {
  const REPORT_JAVASCRIPT = [
    concatRendererCode(),
    fs.readFileSync(__dirname + '/../report/clients/standalone.js', 'utf8'),
  ].join(';\n');
  fs.mkdirSync(__dirname + '/../dist/report', {recursive: true});
  fs.writeFileSync(__dirname + '/../dist/report/standalone.js', REPORT_JAVASCRIPT);
}

if (require.main === module) {
  buildStandaloneReport();
}

module.exports = {
  buildStandaloneReport,
  concatRendererCode,
};
