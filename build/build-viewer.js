/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const fs = require('fs');
const browserify = require('browserify');
const GhPagesApp = require('./gh-pages-app.js');
const {minifyFileTransform} = require('./build-utils.js');
const htmlReportAssets = require('../lighthouse-core/report/html/html-report-assets.js');

/**
 * Build viewer, optionally deploying to gh-pages if `--deploy` flag was set.
 */
async function run() {
  // JS bundle from browserified ReportGenerator.
  const generatorFilename = `${__dirname}/../lighthouse-core/report/report-generator.js`;
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

  const app = new GhPagesApp({
    name: 'viewer',
    appDir: `${__dirname}/../lighthouse-viewer/app`,
    html: {path: 'index.html'},
    htmlReplacements: {
      '%%LIGHTHOUSE_TEMPLATES%%': htmlReportAssets.REPORT_TEMPLATES,
    },
    stylesheets: [
      htmlReportAssets.REPORT_CSS,
      {path: 'styles/*'},
    ],
    javascripts: [
      await generatorJsPromise,
      htmlReportAssets.REPORT_JAVASCRIPT,
      fs.readFileSync(require.resolve('idb-keyval/dist/idb-keyval-min.js'), 'utf8'),
      fs.readFileSync(require.resolve('pako/dist/pako_inflate.js'), 'utf-8'),
      {path: 'src/*'},
    ],
    assets: [
      {path: 'images/**/*'},
      {path: 'manifest.json'},
    ],
  });

  await app.build();

  const argv = process.argv.slice(2);
  if (argv.includes('--deploy')) {
    await app.deploy();
  }
}

run();
