/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const {promisify} = require('util');
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const mkdir = fs.promises.mkdir;

const browserify = require('browserify');
const cpy = require('cpy');
const ghPages = require('gh-pages');
const glob = promisify(require('glob'));
const lighthousePackage = require('../package.json');
const rimraf = require('rimraf');
const terser = require('terser');
const {minifyFileTransform} = require('./build-utils.js');

const htmlReportAssets = require('../lighthouse-core/report/html/html-report-assets.js');
const sourceDir = `${__dirname}/../lighthouse-viewer`;
const distDir = `${__dirname}/../dist/viewer`;

const license = `/*
* @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
* http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
* or implied. See the License for the specific language governing
* permissions and limitations under the License.
*/`;

/**
 * Evaluates path glob and loads all identified files as an array of strings.
 * @param {string} pattern
 * @return {Promise<Array<string>>}
 */
async function loadFiles(pattern) {
  const filePaths = await glob(pattern);
  return Promise.all(filePaths.map(path => readFileAsync(path, {encoding: 'utf8'})));
}

/**
 * Write a file to filePath, creating parent directories if needed.
 * @param {string} filePath
 * @param {string} data
 * @return {Promise<void>}
 */
async function safeWriteFileAsync(filePath, data) {
  const fileDir = path.dirname(filePath);
  await mkdir(fileDir, {recursive: true});
  return writeFileAsync(filePath, data);
}

/**
 * Copy static assets.
 * @return {Promise<void>}
 */
function copyAssets() {
  return cpy([
    'images/**/*',
    'sw.js',
    'manifest.json',
  ], distDir, {
    cwd: `${sourceDir}/app/`,
    parents: true,
  });
}

/**
 * Concat report and viewer stylesheets into single viewer.css file.
 * @return {Promise<void>}
 */
async function css() {
  const reportCss = htmlReportAssets.REPORT_CSS;
  const viewerCss = await readFileAsync(`${sourceDir}/app/styles/viewer.css`, {encoding: 'utf8'});
  await safeWriteFileAsync(`${distDir}/styles/viewer.css`, [reportCss, viewerCss].join('\n'));
}

/**
 * Insert report templates into html and copy to dist.
 * @return {Promise<void>}
 */
async function html() {
  let htmlSrc = await readFileAsync(`${sourceDir}/app/index.html`, {encoding: 'utf8'});
  htmlSrc = htmlSrc.replace(/%%LIGHTHOUSE_TEMPLATES%%/, htmlReportAssets.REPORT_TEMPLATES);

  await safeWriteFileAsync(`${distDir}/index.html`, htmlSrc);
}

/**
 * Combine multiple JS files into single viewer.js file.
 * @return {Promise<void>}
 */
async function compileJs() {
  // JS bundle from browserified ReportGenerator.
  const generatorFilename = `${sourceDir}/../lighthouse-core/report/report-generator.js`;
  const generatorBrowserify = browserify(generatorFilename, {standalone: 'ReportGenerator'})
    .transform('@wardpeet/brfs', {
      readFileSyncTransform: minifyFileTransform,
    });

  /** @type {Promise<string>} */
  const generatorJsPromise = new Promise((resolve, reject) => {
    generatorBrowserify.bundle((err, src) => {
      if (err) return reject(err);
      resolve(src.toString());
    });
  });
  const generatorJs = await generatorJsPromise;

  // Report renderer scripts.
  const rendererJs = htmlReportAssets.REPORT_JAVASCRIPT;

  // idb-keyval dependency.
  const idbKeyvalPath = require.resolve('idb-keyval/dist/idb-keyval-min.js');
  const idbKeyvalJs = await readFileAsync(idbKeyvalPath, 'utf8');

  // Current Lighthouse version as a global variable.
  const versionJs = `window.LH_CURRENT_VERSION = '${lighthousePackage.version}';`;

  // Viewer-specific JS files.
  const viewJsFiles = await loadFiles(`${sourceDir}/app/src/*.js`);

  const contents = [
    `"use strict";`,
    generatorJs,
    rendererJs,
    idbKeyvalJs,
    versionJs,
    ...viewJsFiles,
  ];
  const options = {
    output: {preamble: license}, // Insert license at top.
  };
  const uglified = terser.minify(contents, options);
  if (uglified.error || !uglified.code) {
    throw uglified.error;
  }

  await safeWriteFileAsync(`${distDir}/src/viewer.js`, uglified.code);
}

/**
 * Publish viewer to gh-pages branch.
 * @return {Promise<void>}
 */
async function deploy() {
  return new Promise((resolve, reject) => {
    ghPages.publish(distDir, {
      add: true, // keep existing files
      dest: 'viewer',
      message: `Update viewer to lighthouse@${lighthousePackage.version}`,
    }, err => {
      if (err) return reject(err);
      resolve();
    });
  });
}

/**
 * Build viewer, optionally deploying to gh-pages if `--deploy` flag was set.
 */
async function run() {
  // Clean and build.
  rimraf.sync(distDir);
  await Promise.all([
    compileJs(),
    html(),
    css(),
    copyAssets(),
  ]);

  const argv = process.argv.slice(2);
  if (argv.includes('--deploy')) {
    await deploy();
  }
}

run();
