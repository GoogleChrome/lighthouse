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

/**
 * Rollup plugins don't export types that work with commonjs.
 * @template T
 * @param {T} module
 * @return {T['default']}
 */
function rollupPluginTypeCoerce(module) {
  // @ts-expect-error
  return module;
}

const fs = require('fs');
const path = require('path');
const rollup = require('rollup');
const alias = rollupPluginTypeCoerce(require('@rollup/plugin-alias'));
const commonjs = rollupPluginTypeCoerce(require('rollup-plugin-commonjs'));
const json = rollupPluginTypeCoerce(require('@rollup/plugin-json'));
const nodePolyfills = rollupPluginTypeCoerce(require('rollup-plugin-node-polyfills'));
const nodeResolve = rollupPluginTypeCoerce(require('rollup-plugin-node-resolve'));
const replace = rollupPluginTypeCoerce(require('rollup-plugin-replace'));
// @ts-expect-error: no types
const shim = require('rollup-plugin-shim');
const {terser} = require('rollup-plugin-terser');
const postprocess = require('./rollup-postprocess.js');
const {minifyFileTransform} = require('./build-utils.js');
const Runner = require('../lighthouse-core/runner.js');
const rollupBrfs = require('./rollup-brfs.js');
const {LH_ROOT} = require('../root.js');

const COMMIT_HASH = require('child_process')
  .execSync('git rev-parse HEAD')
  .toString().trim();

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

const pkg = require('../package.json');
const today = (() => {
  const date = new Date();
  const year = new Intl.DateTimeFormat('en', {year: 'numeric'}).format(date);
  const month = new Intl.DateTimeFormat('en', {month: 'short'}).format(date);
  const day = new Intl.DateTimeFormat('en', {day: '2-digit'}).format(date);
  return `${month} ${day} ${year}`;
})();
const banner = `
/**
 * Lighthouse v${pkg.version} ${COMMIT_HASH} (${today})
 *
 * ${pkg.description}
 *
 * @homepage ${pkg.homepage}
 * @author   ${pkg.author}
 * @license  ${pkg.license}
 */
`.trim();

/**
 * Browserify starting at entryPath, writing the minified result to distPath.
 * @param {string} entryPath
 * @param {string} distPath
 * @param {{minify: boolean}=} opts
 * @return {Promise<void>}
 */
async function build(entryPath, distPath, opts = {minify: true}) {
  if (fs.existsSync(LH_ROOT + '/lighthouse-logger/node_modules')) {
    throw new Error('delete `lighthouse-logger/node_modules` because it messes up rollup bundle');
  }

  // List of paths (absolute / relative to config-helpers.js) to include
  // in bundle and make accessible via config-helpers.js `requireWrapper`.
  const dynamicModulePaths = [
    ...Runner.getGathererList().map(gatherer => `../gather/gatherers/${gatherer}`),
    ...Runner.getAuditList().map(gatherer => `../audits/${gatherer}`),
  ];

  // Include lighthouse-plugin-publisher-ads.
  if (isDevtools(entryPath) || isLightrider(entryPath)) {
    dynamicModulePaths.push('lighthouse-plugin-publisher-ads');
    pubAdsAudits.forEach(pubAdAudit => {
      dynamicModulePaths.push(pubAdAudit);
    });
  }

  const bundledMapEntriesCode = dynamicModulePaths.map(modulePath => {
    const pathNoExt = modulePath.replace('.js', '');
    return `['${pathNoExt}', require('${modulePath}')]`;
  }).join(',\n');

  /** @type {Record<string, string>} */
  const shimsObj = {};

  const modulesToIgnore = [
    'intl-pluralrules',
    'intl',
    'pako/lib/zlib/inflate.js',
    'raven',
    'source-map',
    'ws',
    require.resolve('../lighthouse-core/gather/connections/cri.js'),
  ];

  // Don't include the stringified report in DevTools - see devtools-report-assets.js
  // Don't include in Lightrider - HTML generation isn't supported, so report assets aren't needed.
  if (isDevtools(entryPath) || isLightrider(entryPath)) {
    modulesToIgnore.push(require.resolve('../report/report-assets.js'));
  }

  // Don't include locales in DevTools.
  if (isDevtools(entryPath)) {
    const localeKeys = Object.keys(require('../lighthouse-core/lib/i18n/locales.js'));
    /** @type {Record<string, {}>} */
    const localesShim = {};
    for (const key of localeKeys) localesShim[key] = {};
    shimsObj['./locales.js'] = `export default ${JSON.stringify(localesShim)}`;
  }

  for (const modulePath of modulesToIgnore) {
    shimsObj[modulePath] = 'export default {}';
  }

  const packageJsonShim = {version: require('../package.json').version};
  shimsObj[require.resolve('../package.json')] =
    `export default ${JSON.stringify(packageJsonShim)}`;

  const bundle = await rollup.rollup({
    input: entryPath,
    context: 'globalThis',
    plugins: [
      replace({
        delimiters: ['', ''],
        values: {
          '/* BUILD_REPLACE_BUNDLED_MODULES */': `[\n${bundledMapEntriesCode},\n]`,
          '__dirname': (id) => `'${path.relative(LH_ROOT, path.dirname(id))}'`,
          '__filename': (id) => `'${path.relative(LH_ROOT, id)}'`,
          // This package exports to default in a way that causes Rollup to get confused,
          // resulting in MessageFormat being undefined.
          'require(\'intl-messageformat\').default': 'require(\'intl-messageformat\')',
        },
      }),
      alias({
        entries: {
          'debug': require.resolve('debug/src/browser.js'),
          'lighthouse-logger': require.resolve('../lighthouse-logger/index.js'),
          'url': require.resolve('../lighthouse-core/lib/url-shim.js'),
        },
      }),
      shim({
        ...shimsObj,
        // Allows for plugins to import lighthouse.
        'lighthouse': `
          import Audit from '${require.resolve('../lighthouse-core/audits/audit.js')}';
          export {Audit};
        `,
      }),
      // Currently must run before commonjs (brfs does not support import).
      // This currenty messes up source maps.
      rollupBrfs({
        readFileSyncTransform: minifyFileTransform,
        global: true,
        parserOpts: {ecmaVersion: 12, sourceType: 'module'},
      }),
      commonjs({
        // https://github.com/rollup/plugins/issues/922
        ignoreGlobal: true,
      }),
      json(),
      nodeResolve({preferBuiltins: true}),
      nodePolyfills(),
      // Rollup sees the usages of these functions in page functions (ex: see AnchorElements)
      // and treats them as globals. Because the names are "taken" by the global, Rollup renames
      // the actual functions (getNodeDetails$1). The page functions expect a certain name, so
      // here we undo what Rollup did.
      postprocess([
        [/getBoundingClientRect\$1/, 'getBoundingClientRect'],
        [/getElementsInDocument\$1/, 'getElementsInDocument'],
        [/getNodeDetails\$1/, 'getNodeDetails'],
        [/getRectCenterPoint\$1/, 'getRectCenterPoint'],
        [/isPositionFixed\$1/, 'isPositionFixed'],
      ]),
      opts.minify && terser({
        ecma: 2019,
        output: {
          comments: (node, comment) => {
            const text = comment.value;
            if (text.includes('The Lighthouse Authors') && comment.line > 1) return false;
            return /@ts-nocheck - Prevent tsc|@preserve|@license|@cc_on/i.test(text);
          },
          max_line_len: 1000,
        },
        // The config relies on class names for gatherers.
        keep_classnames: true,
        // Runtime.evaluate errors if function names are elided.
        keep_fnames: true,
      }),
    ],
  });

  await bundle.write({
    file: distPath,
    banner: () => {
      let result = banner;

      // Add the banner and modify globals for DevTools if necessary.
      if (isDevtools(entryPath) && !DEBUG) {
        result += '\n// @ts-nocheck - Prevent tsc stepping into any required bundles.';
      }

      return result;
    },
    format: 'iife',
    sourcemap: DEBUG,
  });
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
