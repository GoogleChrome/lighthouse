/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const browserify = require('browserify');
const fs = require('fs');
const path = require('path');
const bundleBuilder = require('./build-bundle.js');
const {minifyFileTransform} = require('./build-utils.js');

const distDir = path.join(__dirname, '..', 'dist', 'lightrider');
const sourceDir = __dirname + '/../clients/lightrider';

const bundleOutFile = `${distDir}/report-generator-bundle.js`;
const generatorFilename = `./lighthouse-core/report/report-generator.js`;

const entrySourceName = 'lightrider-entry.js';
const entryDistName = 'lighthouse-lr-bundle.js';

fs.mkdirSync(path.dirname(distDir), {recursive: true});

/**
 * Browserify and minify entry point.
 */
function buildEntryPoint() {
  const inFile = `${sourceDir}/${entrySourceName}`;
  const outFile = `${distDir}/${entryDistName}`;
  return bundleBuilder.build(inFile, outFile);
}

/**
 * Browserify and minify the LR report generator.
 */
function buildReportGenerator() {
  browserify(generatorFilename, {standalone: 'ReportGenerator'})
    // Transform the fs.readFile etc into inline strings.
    .transform('@wardpeet/brfs', {
      readFileSyncTransform: minifyFileTransform,
      global: true,
      parserOpts: {ecmaVersion: 10},
    })
    .bundle((err, src) => {
      if (err) throw err;
      fs.writeFileSync(bundleOutFile, src.toString());
    });
}

async function run() {
  await Promise.all([
    buildEntryPoint(),
    buildReportGenerator(),
  ]);
}

run();
