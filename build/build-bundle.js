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
const assert = require('assert').strict;
const mkdir = fs.promises.mkdir;
const LighthouseRunner = require('../lighthouse-core/runner.js');
const exorcist = require('exorcist');
const browserify = require('browserify');
const terser = require('terser');
const {minifyFileTransform} = require('./build-utils.js');
const {LH_ROOT} = require('../root.js');

const COMMIT_HASH = require('child_process')
  .execSync('git rev-parse HEAD')
  .toString().trim();

const audits = LighthouseRunner.getAuditList()
    .map(f => './lighthouse-core/audits/' + f.replace(/\.js$/, ''));

const gatherers = LighthouseRunner.getGathererList()
    .map(f => './lighthouse-core/gather/gatherers/' + f.replace(/\.js$/, ''));

const locales = fs.readdirSync(LH_ROOT + '/lighthouse-core/lib/i18n/locales/')
    .map(f => require.resolve(`../lighthouse-core/lib/i18n/locales/${f}`));

// HACK: manually include the lighthouse-plugin-publisher-ads audits.
/** @type {Array<string>} */
// @ts-expect-error
const pubAdsAudits = require('lighthouse-plugin-publisher-ads/plugin.js').audits.map(a => a.path);

/** @param {string} file */
const isDevtools = file =>
  path.basename(file).includes('devtools') || path.basename(file).endsWith('dt-bundle.js');
/** @param {string} file */
const isLightrider = file => path.basename(file).includes('lightrider');

// Set to true for source maps.
const DEBUG = false;

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
    .plugin('browserify-banner', {
      pkg: Object.assign({COMMIT_HASH}, require('../package.json')),
      file: require.resolve('./banner.txt'),
    })
    // Transform the fs.readFile etc into inline strings.
    .transform('@wardpeet/brfs', {
      readFileSyncTransform: minifyFileTransform,
      global: true,
      parserOpts: {ecmaVersion: 12},
    })
    // Strip everything out of package.json includes except for the version.
    .transform('package-json-versionify');

  // scripts will need some additional transforms, ignores and requires…
  bundle.ignore('source-map')
    .ignore('debug/node')
    .ignore('intl')
    .ignore('intl-pluralrules')
    .ignore('raven')
    .ignore('pako/lib/zlib/inflate.js');

  // Don't include the desktop protocol connection.
  bundle.ignore(require.resolve('../lighthouse-core/gather/connections/cri.js'));

  // Don't include the stringified report in DevTools - see devtools-report-assets.js
  // Don't include in Lightrider - HTML generation isn't supported, so report assets aren't needed.
  if (isDevtools(entryPath) || isLightrider(entryPath)) {
    bundle.ignore(require.resolve('../report/report-assets.js'));
  }

  // Don't include locales in DevTools.
  if (isDevtools(entryPath)) {
    // @ts-expect-error bundle.ignore does accept an array of strings.
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
  if (isDevtools(entryPath) || isLightrider(entryPath)) {
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

  let bundleStream = bundle.bundle();

  // Make sure path exists.
  await mkdir(path.dirname(distPath), {recursive: true});
  return new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(distPath);
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);

    // Extract the inline source map to an external file.
    if (DEBUG) bundleStream = bundleStream.pipe(exorcist(`${distPath}.map`));
    bundleStream.pipe(writeStream);
  });
}

/**
 * Minify a javascript file, in place.
 * @param {string} filePath
 */
async function minifyScript(filePath) {
  const code = fs.readFileSync(filePath, 'utf-8');
  const result = await terser.minify(code, {
    ecma: 2019,
    output: {
      comments: /^!/,
      max_line_len: 1000,
    },
    // Class and function names are needed for things like loading gatherers by
    // name and accessing functions by name in Runtime.evaluate. Instead, just
    // rely on whitespace elimination for the large savings.
    compress: false,
    mangle: false,
    sourceMap: DEBUG && {
      content: JSON.parse(fs.readFileSync(`${filePath}.map`, 'utf-8')),
      url: path.basename(`${filePath}.map`),
    },
  });

  // Add the banner and modify globals for DevTools if necessary.
  if (isDevtools(filePath) && result.code) {
    // Add a comment for TypeScript, but not if in DEBUG mode so that source maps are not affected.
    // See lighthouse-cli/test/smokehouse/lighthouse-runners/bundle.js
    if (!DEBUG) {
      result.code =
        '// @ts-nocheck - Prevent tsc stepping into any required bundles.\n' + result.code;
    }

    assert.ok(result.code.includes('\nrequire='), 'missing browserify require stub');
    result.code = result.code.replace('\nrequire=', '\nglobalThis.require=');
    assert.ok(!result.code.includes('\nrequire='), 'contained unexpected browserify require stub');
  }

  fs.writeFileSync(filePath, result.code);
  if (DEBUG) fs.writeFileSync(`${filePath}.map`, result.map);
}

/**
 * Browserify starting at entryPath, writing the minified result to distPath.
 * @param {string} entryPath
 * @param {string} distPath
 * @return {Promise<void>}
 */
async function build(entryPath, distPath) {
  await browserifyFile(entryPath, distPath);
  await minifyScript(distPath);
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

// Test if called from the CLI or as a module.
if (require.main === module) {
  cli(process.argv);
} else {
  module.exports = {
    /** The commit hash for the current HEAD. */
    COMMIT_HASH,
    build,
  };
}
