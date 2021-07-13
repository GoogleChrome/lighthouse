/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const browserify = require('browserify');
const fs = require('fs');
const path = require('path');
const assert = require('assert').strict;
const {LH_ROOT} = require('../root.js');

const distDir = path.join(LH_ROOT, 'dist', 'dt-report-resources');
const bundleOutFile = `${distDir}/report-generator.js`;
const generatorFilename = `./report/report-generator.js`;
const htmlReportAssets = require('../report/report-assets.js');

/**
 * Used to save cached resources (Runtime.cachedResources).
 * @param {string} name
 * @param {string} content
 */
function writeFile(name, content) {
  assert(content);
  fs.writeFileSync(`${distDir}/${name}`, content);
}

fs.rmdirSync(distDir, {recursive: true});
fs.mkdirSync(distDir);

writeFile('report.js', htmlReportAssets.REPORT_JAVASCRIPT);
writeFile('report.css', htmlReportAssets.REPORT_CSS);
writeFile('standalone-template.html', htmlReportAssets.REPORT_TEMPLATE);
writeFile('templates.html', htmlReportAssets.REPORT_TEMPLATES);
writeFile('report.d.ts', 'export {}');
writeFile('report-generator.d.ts', 'export {}');

const pathToReportAssets = require.resolve('../clients/devtools-report-assets.js');
browserify(generatorFilename, {standalone: 'Lighthouse.ReportGenerator'})
  // Shims './report/report-assets.js' to resolve to devtools-report-assets.js
  .require(pathToReportAssets, {expose: './report-assets.js'})
  .bundle((err, src) => {
    if (err) throw err;
    fs.writeFileSync(bundleOutFile, src.toString());
  });
