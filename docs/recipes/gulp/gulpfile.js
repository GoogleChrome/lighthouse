'use strict';

/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

const gulp = require('gulp');
const connect = require('gulp-connect');
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const PORT = 8080;

/**
 * Start server
 */
const startServer = function() {
  return connect.server({
    root: './public',
    port: PORT,
  });
};

/**
 * Stop server
 */
const stopServer = function() {
  connect.serverClose();
};

/**
 * Run lighthouse
 */
function launchChromeAndRunLighthouse(url, flags, config = null) {
  return chromeLauncher.launch().then(chrome => {
    flags.port = chrome.port;
    return lighthouse(url, flags, config).then(results =>
      chrome.kill().then(() => results)
    );
  });
}

/**
 * Handle ok result
 * @param {Object} results - Lighthouse results
 */
const handleOk = function(results) {
  stopServer();
  console.log(results); // eslint-disable-line no-console
  // TODO: use lighthouse results for checking your performance expectations.
  // e.g. process.exit(1) or throw Error if score falls below a certain threshold.
  // if (results.audits['first-meaningful-paint'].numericValue > 3000) {
  //   console.log(`Warning: Time to first meaningful paint ${results.audits['first-meaningful-paint'].displayValue}`);
  //   process.exit(1);
  // }
  return results;
};

/**
 * Handle error
 */
const handleError = function(e) {
  stopServer();
  console.error(e); // eslint-disable-line no-console
  throw e; // Throw to exit process with status 1.
};

const flags = {}; // available options - https://github.com/GoogleChrome/lighthouse/#cli-options

gulp.task('lighthouse', function() {
  startServer();
  const config = {settings: {onlyCategories: ['performance']}};
  return launchChromeAndRunLighthouse(`http://localhost:${PORT}/index.html`, flags, config)
    .then(handleOk)
    .catch(handleError);
});

gulp.task('default', ['lighthouse']);
