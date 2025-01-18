/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Script to bundle lighthouse entry points so that they can be run
 * in the browser (as long as they have access to a debugger protocol Connection).
 */

import fs from 'fs';
import path from 'path';
import {execSync} from 'child_process';
import {createRequire} from 'module';

import esMain from 'es-main';
import esbuild from 'esbuild';
// @ts-expect-error: plugin has no types.
import SoftNavPlugin from 'lighthouse-plugin-soft-navigation';

import * as plugins from './esbuild-plugins.js';
import {Runner} from '../core/runner.js';
import {LH_ROOT} from '../shared/root.js';
import {readJson} from '../core/test/test-utils.js';
import {nodeModulesPolyfillPlugin} from '../third-party/esbuild-plugins-polyfills/esbuild-polyfills.js';

const require = createRequire(import.meta.url);

/**
 * The git tag for the current HEAD (if HEAD is itself a tag),
 * otherwise a combination of latest tag + #commits since + sha.
 * Note: can't do this in CI because it is a shallow checkout.
 */
const GIT_READABLE_REF =
  execSync(process.env.CI ? 'git rev-parse HEAD' : 'git describe').toString().trim();

// HACK: manually include plugin audits.
/** @type {Array<string>} */
// @ts-expect-error
const softNavAudits = SoftNavPlugin.audits.map(a => a.path);

/** @param {string} file */
const isDevtools = file =>
  path.basename(file).includes('devtools') || path.basename(file).endsWith('dt-bundle.js');
/** @param {string} file */
const isLightrider = file => path.basename(file).includes('lightrider');

const today = (() => {
  const date = new Date();
  const year = new Intl.DateTimeFormat('en', {year: 'numeric'}).format(date);
  const month = new Intl.DateTimeFormat('en', {month: 'short'}).format(date);
  const day = new Intl.DateTimeFormat('en', {day: '2-digit'}).format(date);
  return `${month} ${day} ${year}`;
})();
/* eslint-disable max-len */
const pkg = readJson(`${LH_ROOT}/package.json`);
const banner = `
/**
 * Lighthouse ${GIT_READABLE_REF} (${today})
 *
 * ${pkg.description}
 *
 * @homepage ${pkg.homepage}
 * @author   Copyright 2023 ${pkg.author}
 * @license  ${pkg.license}
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
`.trim();
/* eslint-enable max-len */

/**
 * Bundle starting at entryPath, writing the minified result to distPath.
 * @param {string} entryPath
 * @param {string} distPath
 * @param {{minify: boolean}=} opts
 * @return {Promise<void>}
 */
async function buildBundle(entryPath, distPath, opts = {minify: true}) {
  // List of paths (absolute / relative to config-helpers.js) to include
  // in bundle and make accessible via config-helpers.js `requireWrapper`.
  const dynamicModulePaths = [
    ...Runner.getGathererList().map(gatherer => `../gather/gatherers/${gatherer}`),
    ...Runner.getAuditList().map(gatherer => `../audits/${gatherer}`),
  ];

  // Include plugins.
  if (isDevtools(entryPath) || isLightrider(entryPath)) {
    dynamicModulePaths.push('lighthouse-plugin-soft-navigation');
    softNavAudits.forEach(softNavAudit => {
      dynamicModulePaths.push(softNavAudit);
    });
  }

  const bundledMapEntriesCode = dynamicModulePaths.map(modulePath => {
    const pathNoExt = modulePath.replace('.js', '');
    return `['${pathNoExt}', import('${modulePath}')]`;
  }).join(',\n');

  /** @type {Record<string, string>} */
  const shimsObj = {
    // zlib's decompression code is very large and we don't need it.
    // We export empty functions, instead of an empty module, simply to silence warnings
    // about no exports.
    '__zlib-lib/inflate': `
      export function inflateInit2() {};
      export function inflate() {};
      export function inflateEnd() {};
      export function inflateReset() {};
    `,
  };

  const modulesToIgnore = [
    'puppeteer-core',
    // ScreenRecorder.js imports `child_process` functions that are unavailable in bundled environments.
    // This module is imported dynamically in a function we never use, so safe to ignore:
    // https://github.com/puppeteer/puppeteer/blob/35f9c6d1e699ea37e89ef3bbb7940f5599df4724/packages/puppeteer-core/src/api/Page.ts#L2365-L2369
    'puppeteer-core/lib/esm/puppeteer/node/ScreenRecorder.js',
    'pako/lib/zlib/inflate.js',
    '@sentry/node',
    'source-map',
    'ws',
  ];

  // Don't include the stringified report in DevTools - see devtools-report-assets.js
  // Don't include in Lightrider - HTML generation isn't supported, so report assets aren't needed.
  if (isDevtools(entryPath) || isLightrider(entryPath)) {
    shimsObj[`${LH_ROOT}/report/generator/report-assets.js`] =
      'export const reportAssets = {}';
  }

  // Don't include locales in DevTools.
  if (isDevtools(entryPath)) {
    shimsObj[`${LH_ROOT}/shared/localization/locales.js`] = 'export const locales = {};';
  }

  // Don't bundle third-party-web (CDT provides its own copy). This prevents duplications of 40+ KB.
  if (isDevtools(entryPath)) {
    shimsObj['third-party-web/nostats-subset.js'] = 'export default {};';
  }

  for (const modulePath of modulesToIgnore) {
    shimsObj[modulePath] = 'export default {}';
  }

  await esbuild.build({
    entryPoints: [entryPath],
    outfile: distPath,
    write: false,
    format: 'iife',
    charset: 'utf8',
    bundle: true,
    minify: opts.minify,
    treeShaking: true,
    sourcemap: 'linked',
    banner: {js: banner},
    lineLimit: 1000,
    // Because of page-functions!
    keepNames: true,
    inject: ['./build/process-global.js'],
    /** @type {esbuild.Plugin[]} */
    plugins: [
      plugins.replaceModules({
        ...shimsObj,
        'url': `
          export const URL = globalThis.URL;
          export const fileURLToPath = url => url;
          export default {URL, fileURLToPath};
        `,
        'module': `
          export const createRequire = () => {
            return {
              resolve() {
                throw new Error('createRequire.resolve is not supported in bundled Lighthouse');
              },
            };
          };
        `,
      }, {
        // buildBundle is used in a lot of different contexts. Some share the same modules
        // that need to be replaced, but others don't use those modules at all.
        disableUnusedError: true,
      }),
      nodeModulesPolyfillPlugin(),
      plugins.bulkLoader([
        // TODO: when we used rollup, various things were tree-shaken out before inlineFs did its
        // thing. Now treeshaking only happens at the end, so the plugin sees more cases than it
        // did before. Some of those new cases emit warnings. Safe to ignore, but should be
        // resolved eventually.
        plugins.partialLoaders.inlineFs({
          verbose: Boolean(process.env.DEBUG),
        }),
        plugins.partialLoaders.rmGetModuleDirectory,
        plugins.partialLoaders.replaceText({
          '/* BUILD_REPLACE_BUNDLED_MODULES */': `[\n${bundledMapEntriesCode},\n]`,
          // TODO: Use globalThis directly.
          'global.isLightrider': 'globalThis.isLightrider',
          'global.isDevtools': 'globalThis.isDevtools',
          // By default esbuild converts `import.meta` to an empty object.
          // We need at least the url property for i18n things.
          /** @param {string} id */
          'import.meta': (id) => `{url: '${path.relative(LH_ROOT, id)}'}`,
        }),
      ]),
      {
        name: 'alias',
        setup({onResolve}) {
          onResolve({filter: /\.*/}, (args) => {
            /** @type {Record<string, string>} */
            const entries = {
              'debug': require.resolve('debug/src/browser.js'),
              'lighthouse-logger': require.resolve('../lighthouse-logger/index.js'),
            };
            if (args.path in entries) {
              return {path: entries[args.path]};
            }
          });
        },
      },
      {
        name: 'postprocess',
        setup({onEnd}) {
          onEnd(async (result) => {
            if (result.errors.length) {
              return;
            }

            const codeFile = result.outputFiles?.find(file => file.path.endsWith('.js'));
            const mapFile = result.outputFiles?.find(file => file.path.endsWith('.js.map'));
            if (!codeFile) {
              throw new Error('missing output');
            }

            // Just make sure the above shimming worked.
            let code = codeFile.text;
            if (code.includes('inflate_fast')) {
              throw new Error('Expected zlib inflate code to have been removed');
            }

            // Get rid of our extra license comments.
            // All comments would have been moved to the end of the file, so removing some will not break
            // source maps.
            // https://stackoverflow.com/a/35923766
            const re = /\/\*\*\s*\n([^*]|(\*(?!\/)))*\*\/\n/g;
            let hasSeenFirst = false;
            code = code.replace(re, (match) => {
              if (match.includes('@license') && match.match(/Lighthouse Authors|Google/)) {
                if (hasSeenFirst) {
                  return '';
                }

                hasSeenFirst = true;
              }

              return match;
            });

            await fs.promises.writeFile(codeFile.path, code);
            if (mapFile) {
              await fs.promises.writeFile(mapFile.path, mapFile.text);
            }
          });
        },
      },
    ],
  });
}

/**
 * @param {Array<string>} argv
 */
async function cli(argv) {
  // Take paths relative to cwd and build.
  const [entryPath, distPath] = argv.slice(2)
    .map(filePath => path.resolve(process.cwd(), filePath));
  await buildBundle(entryPath, distPath, {minify: !process.env.DEBUG});
}

// Test if called from the CLI or as a module.
if (esMain(import.meta)) {
  await cli(process.argv);
}

export {
  buildBundle,
};
