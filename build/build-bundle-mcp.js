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
 * @author   Copyright ${new Date().getFullYear()} ${pkg.author}
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
 * @return {Promise<void>}
 */
async function buildBundle(entryPath, distPath) {
  // Get all gatherers and audits
  const allGatherers = Runner.getGathererList();
  const allAudits = Runner.getAuditList();

  // List of paths (absolute / relative to config-helpers.js) to include
  // in bundle and make accessible via config-helpers.js `requireWrapper`.
  /** @type {Array<string>} */
  const includedGatherers = allGatherers.filter(gatherer => gatherer === 'snapshot');
  /** @type {Array<string>} */
  const includedAudits = allAudits.filter(audit => {
    return audit.includes('accessibility');
  });

  const dynamicModulePaths = [
    ...includedGatherers.map(gatherer => `../gather/gatherers/${gatherer}`),
    ...includedAudits.map(audit => `../audits/${audit}`),
    '../computed/speedline.js',
    '../computed/metrics/timing-summary.js',
  ];

  // Include plugins.
  dynamicModulePaths.push('lighthouse-plugin-soft-navigation');
  softNavAudits.forEach(softNavAudit => {
    dynamicModulePaths.push(softNavAudit);
  });

  // Get filtered-out gatherers and audits for shimming
  const filteredOutGatherers = allGatherers.filter(gatherer => !includedGatherers.includes(gatherer));
  const filteredOutAudits = allAudits.filter(audit => !includedAudits.includes(audit));

  // Add filtered-out modules to dynamicModulePaths so they're in the bundledModules map
  // They will be replaced by shims during bundling via replaceModules plugin
  filteredOutGatherers.forEach(gatherer => {
    dynamicModulePaths.push(`../gather/gatherers/${gatherer}`);
  });
  filteredOutAudits.forEach(audit => {
    dynamicModulePaths.push(`../audits/${audit}`);
  });

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
    'pako/lib/zlib/inflate.js',
    '@sentry/node',
    'source-map',
    'ws',
  ];

  // Don't include the stringified report in DevTools - see devtools-report-assets.js
  // Don't include in Lightrider - HTML generation isn't supported, so report assets aren't needed.
  shimsObj[`${LH_ROOT}/report/generator/report-assets.js`] =
    'export const reportAssets = {}';

  // Don't include locales in DevTools.
  shimsObj[`${LH_ROOT}/shared/localization/locales.js`] = 'export const locales = {};';

  // Don't bundle third-party-web (CDT provides its own copy). This prevents duplications of 40+ KB.
  shimsObj['third-party-web/nostats-subset.js'] = 'export default {};';

  for (const modulePath of modulesToIgnore) {
    shimsObj[modulePath] = 'export default {}';
  }

  // Shim speedline-core to prevent fs require issues (it's only used by non-accessibility audits)
  const speedlineCoreShim = `
    export default function speedline() {
      throw new Error('speedline-core is not available in this bundle');
    }
  `;
  shimsObj['speedline-core'] = speedlineCoreShim;

  // Shim computed metrics that depend on speedline-core (only used by filtered-out audits)
  // Add both with and without .js extension to ensure replaceModules plugin catches them
  const speedlineShim = `
    import {makeComputedArtifact} from './computed-artifact.js';
    import {LighthouseError} from '../lib/lh-error.js';
    class Speedline {
      static async compute_() {
        throw new LighthouseError(LighthouseError.errors.NO_SPEEDLINE_FRAMES);
      }
    }
    const SpeedlineComputed = makeComputedArtifact(Speedline, null);
    export {SpeedlineComputed as Speedline};
  `;
  shimsObj['../computed/speedline.js'] = speedlineShim;
  shimsObj['../computed/speedline'] = speedlineShim;
  // Also add absolute path version
  shimsObj[`${LH_ROOT}/core/computed/speedline.js`] = speedlineShim;

  const timingSummaryShim = `
    import {makeComputedArtifact} from '../computed-artifact.js';
    class TimingSummary {
      static async compute_() {
        return {
          metrics: {},
          debugInfo: {},
        };
      }
    }
    const TimingSummaryComputed = makeComputedArtifact(TimingSummary, null);
    export {TimingSummaryComputed as TimingSummary};
  `;
  shimsObj['../computed/metrics/timing-summary.js'] = timingSummaryShim;
  shimsObj['../computed/metrics/timing-summary'] = timingSummaryShim;
  // Also add absolute path version
  shimsObj[`${LH_ROOT}/core/computed/metrics/timing-summary.js`] = timingSummaryShim;

  // Create shims for filtered-out gatherers to prevent dynamic import failures
  for (const gatherer of filteredOutGatherers) {
    const gathererPath = path.resolve(LH_ROOT, 'core/gather/gatherers', gatherer);
    let relativeBaseGatherer = path.relative(path.dirname(gathererPath), path.resolve(LH_ROOT, 'core/gather/base-gatherer.js'));
    if (!relativeBaseGatherer.startsWith('.')) relativeBaseGatherer = './' + relativeBaseGatherer;

    const shimCode = `
      import BaseGatherer from '${relativeBaseGatherer}';
      class ShimGatherer extends BaseGatherer {
        meta = {supportedModes: []};
        getArtifact() {
          return undefined;
        }
      }
      export default ShimGatherer;
    `;
    shimsObj[gathererPath] = shimCode;
  }

  // Create shims for filtered-out audits to prevent dynamic import failures
  for (const audit of filteredOutAudits) {
    const auditPath = path.resolve(LH_ROOT, 'core/audits', audit);
    let relativeAuditBase = path.relative(path.dirname(auditPath), path.resolve(LH_ROOT, 'core/audits/audit.js'));
    if (!relativeAuditBase.startsWith('.')) relativeAuditBase = './' + relativeAuditBase;

    // Extract audit ID from path (e.g., 'accessibility/image-alt.js' -> 'image-alt')
    const auditId = audit.replace(/^.*\//, '').replace('.js', '');
    const shimCode = `
      import {Audit} from '${relativeAuditBase}';
      class ShimAudit extends Audit {
        static get meta() {
          return {
            id: '${auditId}',
            title: 'Shim Audit',
            description: 'This audit was filtered out and is not available in this bundle.',
            scoreDisplayMode: Audit.SCORING_MODES.NOT_APPLICABLE,
            requiredArtifacts: [],
          };
        }
        static audit() {
          return {score: null, scoreDisplayMode: Audit.SCORING_MODES.NOT_APPLICABLE};
        }
      }
      export default ShimAudit;
    `;
    shimsObj[auditPath] = shimCode;
  }

  console.log('shims');
  Object.entries(shimsObj).forEach(([key, value]) => {
    console.log(`- ${key.padEnd(50)}: ${value.length} chars`, value.slice(0, 60).replace(/\n/g, '') + (value.length > 60 ? '...' : ''));
  });

  // console.log('shims: ', Object.keys(shimsObj));

  await esbuild.build({
    entryPoints: [entryPath],
    outfile: distPath,
    write: false,
    format: 'esm',
    charset: 'utf8',
    bundle: true,
    minify: false,
    treeShaking: true,
    sourcemap: 'linked',
    platform: 'node',
    banner: {js: banner},
    lineLimit: 1000,
    // Because of page-functions!
    keepNames: true,
    inject: ['./build/process-global.js'],
    legalComments: 'inline',
    external: ['debug', 'puppeteer-core'],
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
  await buildBundle(entryPath, distPath);
}

// Test if called from the CLI or as a module.
if (import.meta.main) {
  await cli(process.argv);
}

export {
  buildBundle,
};
