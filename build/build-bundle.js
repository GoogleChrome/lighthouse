/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Script to bundle lighthouse entry points so that they can be run
 * in the browser (as long as they have access to a debugger protocol Connection).
 */

const fs = require('fs');
const path = require('path');
const mkdir = fs.promises.mkdir;

const LighthouseRunner = require('../lighthouse-core/runner.js');
const babel = require('babel-core');
const browserify = require('browserify');
const pkg = require('../package.json');

const VERSION = pkg.version;
const COMMIT_HASH = require('child_process')
  .execSync('git rev-parse HEAD')
  .toString().trim();

const audits = LighthouseRunner.getAuditList()
    .map(f => './lighthouse-core/audits/' + f.replace(/\.js$/, ''));

const gatherers = LighthouseRunner.getGathererList()
    .map(f => './lighthouse-core/gather/gatherers/' + f.replace(/\.js$/, ''));

const locales = fs.readdirSync(__dirname + '/../lighthouse-core/lib/i18n/locales/')
    .map(f => require.resolve(`../lighthouse-core/lib/i18n/locales/${f}`));

// HACK: manually include the lighthouse-plugin-publisher-ads audits.
/** @type {Array<string>} */
// @ts-ignore
const pubAdsAudits = require('lighthouse-plugin-publisher-ads/plugin.js').audits.map(a => a.path);

/** @param {string} file */
const isDevtools = file => path.basename(file).includes('devtools');
/** @param {string} file */
const isLightrider = file => path.basename(file).includes('lightrider');

const BANNER = `// lighthouse, browserified. ${VERSION} (${COMMIT_HASH})\n` +
  '// @ts-nocheck\n'; // To prevent tsc stepping into any required bundles.
const DEBUG = false; // true for sourcemaps

/**
 * Browserify starting at the file at entryPath. Contains entry-point-specific
 * ignores (e.g. for DevTools or the extension) to trim the bundle depending on
 * the eventual use case.
 * @param {string} entryPath
 * @param {string} distPath
 * @return {Promise<void>}
 */
async function browserifyFile(entryPath, distPath) {
  let bundle = browserify(entryPath, {debug: DEBUG});

  bundle
    // Transform the fs.readFile etc into inline strings.
    .transform('@wardpeet/brfs', {global: true, parserOpts: {ecmaVersion: 10}})
    // Strip everything out of package.json includes except for the version.
    .transform('package-json-versionify');

  // scripts will need some additional transforms, ignores and requires…
  bundle.ignore('source-map')
    .ignore('debug/node')
    .ignore('intl')
    .ignore('intl-pluralrules')
    .ignore('raven')
    .ignore('rimraf')
    .ignore('pako/lib/zlib/inflate.js');

  // Don't include the desktop protocol connection.
  bundle.ignore(require.resolve('../lighthouse-core/gather/connections/cri.js'));

  // Don't include the stringified report in DevTools - see devtools-report-assets.js
  // Don't include in Lightrider - HTML generation isn't supported, so report assets aren't needed.
  if (isDevtools(entryPath) || isLightrider(entryPath)) {
    bundle.ignore(require.resolve('../lighthouse-core/report/html/html-report-assets.js'));
  }

  // Don't include locales in DevTools.
  if (isDevtools(entryPath)) {
    // @ts-ignore bundle.ignore does accept an array of strings.
    bundle.ignore(locales);
  }

  // Expose the audits, gatherers, and computed artifacts so they can be dynamically loaded.
  // Exposed path must be a relative path from lighthouse-core/config/config-helpers.js (where loading occurs).
  const corePath = './lighthouse-core/';
  const driverPath = `${corePath}gather/`;
  audits.forEach(audit => {
    bundle = bundle.require(audit, {expose: audit.replace(corePath, '../')});
  });
  gatherers.forEach(gatherer => {
    bundle = bundle.require(gatherer, {expose: gatherer.replace(driverPath, '../gather/')});
  });

  // HACK: manually include the lighthouse-plugin-publisher-ads audits.
  // TODO: there should be a test for this.
  if (isDevtools(entryPath)) {
    bundle.require('lighthouse-plugin-publisher-ads');
    pubAdsAudits.forEach(pubAdAudit => {
      bundle = bundle.require(pubAdAudit);
    });
  }

  // browerify's url shim doesn't work with .URL in node_modules,
  // and within robots-parser, it does `var URL = require('url').URL`, so we expose our own.
  // @see https://github.com/GoogleChrome/lighthouse/issues/5273
  const pathToURLShim = require.resolve('../lighthouse-core/lib/url-shim.js');
  bundle = bundle.require(pathToURLShim, {expose: 'url'});

  const bundleStream = bundle.bundle();

  // Make sure path exists.
  await mkdir(path.dirname(distPath), {recursive: true});
  return new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(distPath);
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);

    bundleStream.pipe(writeStream);
  });
}

/**
 * Minimally minify a javascript file, in place.
 * @param {string} filePath
 */
function minifyScript(filePath) {
  const opts = {
    compact: true, // Do not include superfluous whitespace characters and line terminators.
    retainLines: true, // Keep things on the same line (looks wonky but helps with stacktraces)
    comments: false, // Don't output comments
    shouldPrintComment: () => false, // Don't include @license or @preserve comments either
    plugins: [
      'syntax-object-rest-spread',
      'syntax-async-generators',
    ],
    // sourceMaps: 'both'
  };

  const minified = BANNER + babel.transformFileSync(filePath, opts).code;
  fs.writeFileSync(filePath, minified);
}

/**
 * Browserify starting at entryPath, writing the minified result to distPath.
 * @param {string} entryPath
 * @param {string} distPath
 * @return {Promise<void>}
 */
async function build(entryPath, distPath) {
  await browserifyFile(entryPath, distPath);
  if (!DEBUG) {
    minifyScript(distPath);
  }
}

/**
 * @param {Array<string>} argv
 */
async function cli(argv) {
  // Take paths relative to cwd and build.
  const [entryPath, distPath] = argv.slice(2)
    .map(filePath => path.resolve(process.cwd(), filePath));
  build(entryPath, distPath);
}

// @ts-ignore Test if called from the CLI or as a module.
if (require.main === module) {
  cli(process.argv);
} else {
  module.exports = {
    /** The commit hash for the current HEAD. */
    COMMIT_HASH,
    build,
  };
}
