/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Script to run Lighthouse in Chrome DevTools MCP.
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
import defaultConfig from '../core/config/default-config.js';
import {LH_ROOT} from '../shared/root.js';
import {readJson} from '../core/test/test-utils.js';

const require = createRequire(import.meta.url);

/** Categories included in the MCP bundle (as shown in DevTools): accessibility, SEO, Best practices. */
const MCP_CATEGORY_IDS = ['accessibility', 'seo', 'best-practices'];

/**
 * Audit IDs from default config for MCP categories (accessibility, seo, best-practices).
 * @return {Set<string>}
 */
function getMcpCategoryAuditIds() {
  const ids = new Set();
  for (const categoryId of MCP_CATEGORY_IDS) {
    const category = defaultConfig.categories?.[categoryId];
    if (!category?.auditRefs) continue;
    for (const ref of category.auditRefs) {
      ids.add(ref.id);
    }
  }
  return ids;
}

/**
 * Gatherer names (config keys, e.g. 'accessibility', 'seo/robots-txt') that produce artifacts
 * required by audits in MCP categories. Derived from default config artifacts.
 * @return {Set<string>}
 */
function getMcpRequiredGathererNames() {
  // We need gatherers for all artifacts that might be required by a11y/seo/best-practices audits.
  // From default config, these artifacts (and their gatherers) are used by those categories.
  const artifactToGatherer = new Map();
  for (const artifact of defaultConfig.artifacts || []) {
    if (artifact.gatherer) {
      artifactToGatherer.set(artifact.id, artifact.gatherer);
    }
  }
  const gathererNames = new Set();
  // Required artifacts for SEO audits (from audit requiredArtifacts).
  const seoArtifacts = [
    'MetaElements', 'RobotsTxt', 'URL', 'DevtoolsLog', 'LinkElements',
    'AnchorElements', 'GatherContext', 'Accessibility',
  ];
  const bestPracticesArtifacts = [
    'DevtoolsLog', 'InspectorIssues', 'URL', 'ConsoleMessages', 'SourceMaps',
    'Scripts', 'Inputs', 'ImageElements', 'ViewportDimensions', 'Doctype',
    'MainDocumentContent', 'MetaElements', 'Stacks',
  ];
  const a11yArtifacts = ['Accessibility'];
  for (const id of [...seoArtifacts, ...bestPracticesArtifacts, ...a11yArtifacts]) {
    const g = artifactToGatherer.get(id);
    if (g) gathererNames.add(g);
  }
  return gathererNames;
}

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

  const mcpAuditIds = getMcpCategoryAuditIds();
  const mcpGathererNames = getMcpRequiredGathererNames();

  // List of paths (absolute / relative to config-helpers.js) to include
  // in bundle and make accessible via config-helpers.js `requireWrapper`.
  // Includes gatherers/audits for accessibility, SEO, and Best practices (as in DevTools).
  /** @type {string[]} */
  const includedGatherers = allGatherers.filter(gatherer => {
    const name = gatherer.replace(/\.js$/, '');
    return mcpGathererNames.has(name);
  });
  /** @type {string[]} */
  const includedAudits = allAudits.filter(audit => {
    const auditId = path.basename(audit, '.js');
    return mcpAuditIds.has(auditId);
  });

  const dynamicModulePaths = [
    ...includedGatherers.map(gatherer => `../gather/gatherers/${gatherer}`),
    ...includedAudits.map(audit => `../audits/${audit}`),
    '../computed/speedline.js',
    '../computed/metrics/timing-summary.js',
    '../computed/entity-classification.js',
    '../computed/trace-engine-result.js',
  ];

  // Include plugins.
  dynamicModulePaths.push('lighthouse-plugin-soft-navigation');
  softNavAudits.forEach(softNavAudit => {
    dynamicModulePaths.push(softNavAudit);
  });

  // Add all other audits and gatherers to dynamicModulePaths so they're in the bundledModules map.
  // They will be shimmed by lighthouseShimPlugin.
  allGatherers.forEach(gatherer => {
    if (!includedGatherers.includes(gatherer)) {
      dynamicModulePaths.push(`../gather/gatherers/${gatherer}`);
    }
  });
  allAudits.forEach(audit => {
    if (!includedAudits.includes(audit)) {
      dynamicModulePaths.push(`../audits/${audit}`);
    }
  });

  const bundledMapEntriesCode = dynamicModulePaths.map(modulePath => {
    const pathNoExt = modulePath.replace('.js', '');
    return `['${pathNoExt}', import('${modulePath}')]`;
  }).join(',\n');

  /** @type {Record<string, string>} */
  const shimsObj = {
    // zlib's decompression code is very large and we don't need it.
    '__zlib-lib/inflate': `
      export function inflateInit2() {};
      export function inflate() {};
      export function inflateEnd() {};
      export function inflateReset() {};
    `,
    // MCP bundle needs generateReport: inline report assets at build time.
    // Requires dist/report/standalone.js (run build-report first).
    [`${LH_ROOT}/report/generator/report-assets.js`]: (() => {
      const templatePath = path.join(LH_ROOT, 'report/assets/standalone-template.html');
      const standalonePath = path.join(LH_ROOT, 'dist/report/standalone.js');
      if (!fs.existsSync(standalonePath)) {
        throw new Error(
          'dist/report/standalone.js not found. Run `yarn build-report` ' +
          'before building the MCP bundle.'
        );
      }
      const REPORT_TEMPLATE = fs.readFileSync(templatePath, 'utf8');
      const REPORT_JAVASCRIPT = fs.readFileSync(standalonePath, 'utf8');
      return `export const reportAssets = {
  REPORT_TEMPLATE: ${JSON.stringify(REPORT_TEMPLATE)},
  REPORT_JAVASCRIPT: ${JSON.stringify(REPORT_JAVASCRIPT)},
};`;
    })(),
    // Don't include locales in DevTools.
    [`${LH_ROOT}/shared/localization/locales.js`]: 'export const locales = {};',
    // Don't bundle third-party-web (CDT provides its own copy).
    'third-party-web/nostats-subset.js': 'export default {};',
  };

  const modulesToIgnore = [
    'pako/lib/zlib/inflate.js',
    '@sentry/node',
    'source-map',
    'ws',
  ];
  for (const modulePath of modulesToIgnore) shimsObj[modulePath] = 'export default {}';

  // Shim speedline-core to prevent fs require issues (it's only used by non-accessibility audits)
  shimsObj['speedline-core'] = `export default function speedline() {
    throw new Error('speedline-core is not available in this bundle');
  }`;

  // Shim computed metrics that depend on speedline-core or traces.
  const speedlineShim = `
    import {makeComputedArtifact} from './computed-artifact.js';
    import {LighthouseError} from '../lib/lh-error.js';
    export class Speedline {
      static async compute_() {
        throw new LighthouseError(LighthouseError.errors.NO_SPEEDLINE_FRAMES);
      }
    }
    export const SpeedlineComputed = makeComputedArtifact(Speedline, null);
  `;
  // We use the new declarative plugin for these too if we wanted, but keeping them here for now
  // is fine as they are specific logic shims, not just boilerplate class shims.
  shimsObj[`${LH_ROOT}/core/computed/speedline.js`] = speedlineShim;
  shimsObj[`${LH_ROOT}/core/computed/metrics/timing-summary.js`] = `
    import {makeComputedArtifact} from '../computed-artifact.js';
    export class TimingSummary { static async compute_() { return {metrics: {}, debugInfo: {}}; } }
    export const TimingSummaryComputed = makeComputedArtifact(TimingSummary, null);
  `;
  shimsObj[`${LH_ROOT}/core/computed/entity-classification.js`] = `
    import {makeComputedArtifact} from './computed-artifact.js';
    export class EntityClassification {
      static async compute_() {
        return {
          entityByUrl: new Map(),
          urlsByEntity: new Map(),
          isFirstParty: () => false,
        };
      }
    }
    export const EntityClassificationComputed = makeComputedArtifact(EntityClassification, null);
  `;
  shimsObj[`${LH_ROOT}/core/computed/trace-engine-result.js`] = `
    import {makeComputedArtifact} from './computed-artifact.js';
    export class TraceEngineResult {
      static async compute_() { return {data: {}, insights: new Map()}; }
      static localizeFunction(str, fn) { return fn; }
    }
    export const TraceEngineResultComputed = makeComputedArtifact(TraceEngineResult, null);
  `;

  const result = await esbuild.build({
    entryPoints: [entryPath],
    outfile: distPath,
    write: false,
    format: 'esm',
    charset: 'utf8',
    bundle: true,
    minify: false,
    treeShaking: true,
    metafile: true,
    sourcemap: 'linked',
    platform: 'node',
    banner: {js: banner},
    lineLimit: 1000,
    keepNames: true,
    inject: ['./build/process-global.js'],
    legalComments: 'inline',
    external: ['debug', 'puppeteer-core'],
    alias: {
      'debug': require.resolve('debug/src/browser.js'),
      'lighthouse-logger': require.resolve('../lighthouse-logger/index.js'),
    },
    /** @type {esbuild.Plugin[]} */
    plugins: [
      plugins.lighthouseShimPlugin({
        includedAudits,
        includedGatherers,
      }),
      plugins.replaceModules({
        ...shimsObj,
        'url': `
          export const URL = globalThis.URL;
          export const fileURLToPath = url => url;
          export default {URL, fileURLToPath};
        `,
        'module': `
          export const createRequire = () => ({
            resolve() { throw new Error('createRequire.resolve is not supported'); },
          });
        `,
      }, {
        disableUnusedError: true,
      }),
      plugins.bulkLoader([
        plugins.partialLoaders.inlineFs({verbose: Boolean(process.env.DEBUG)}),
        plugins.partialLoaders.rmGetModuleDirectory,
        plugins.partialLoaders.replaceText({
          '/* BUILD_REPLACE_BUNDLED_MODULES */': `[\n${bundledMapEntriesCode},\n]`,
          /** @param {string} id */
          'import.meta': (id) => `{url: '${path.relative(LH_ROOT, id)}'}`,
        }),
      ]),
      plugins.postprocess(),
    ],
  });
  generateThirdPartyNotices(result.metafile);
}

/**
 * @param {import('esbuild').BuildResult['metafile']} metafile
 */
function generateThirdPartyNotices(metafile) {
  const paths = Object.keys(metafile?.inputs ?? {});
  const nodeModules = new Map();
  for (const path of paths) {
    if (path.startsWith('replace-modules:')) {
      continue;
    }
    const nodeModulesPathPart = 'node_modules/';
    const nodeModulesPartIdx = path.lastIndexOf(nodeModulesPathPart);
    if (nodeModulesPartIdx === -1) {
      continue;
    }
    let nextPartIdx = path.indexOf('/', nodeModulesPartIdx + nodeModulesPathPart.length);
    if (nextPartIdx === -1) {
      nextPartIdx = path.length;
    }
    let nodeModulePath = path.substring(0, nextPartIdx);
    let nodeModule = path.substring(nodeModulesPartIdx + nodeModulesPathPart.length, nextPartIdx);
    // for org packages, like @x/y
    if (nodeModule.startsWith('@')) {
      let secondPartIdx = path.indexOf('/', nextPartIdx + 1);
      if (secondPartIdx === -1) {
        secondPartIdx = path.length;
      }
      nodeModulePath = path.substring(0, secondPartIdx);
      nodeModule = path.substring(nodeModulesPartIdx + nodeModulesPathPart.length, secondPartIdx);
    }
    nodeModules.set(nodeModule, nodeModulePath);
  }
  const divider =
              '\n\n-------------------- DEPENDENCY DIVIDER --------------------\n\n';

  const stringifiedDependencies = Array.from(
    nodeModules.keys()
  ).map(name => {
    const nodeModulePath = nodeModules.get(name);
    const dependency = JSON.parse(
      fs.readFileSync(path.join(nodeModulePath, 'package.json'), 'utf-8'));
    const licenseFilePaths = [
      path.join(nodeModulePath, 'LICENSE'),
      path.join(nodeModulePath, 'LICENSE.txt'),
      path.join(nodeModulePath, 'LICENSE.md'),
    ];
    for (const licenseFile of licenseFilePaths) {
      if (fs.existsSync(licenseFile)) {
        dependency.licenseText = fs.readFileSync(licenseFile, 'utf-8');
        break;
      }
    }
    const parts = [];
    parts.push(`Name: ${dependency.name ?? 'N/A'}`);
    let url = dependency.homepage ?? dependency.repository;
    if (url) {
      url = url.url;
    }
    parts.push(`URL: ${url ?? 'N/A'}`);
    parts.push(`Version: ${dependency.version ?? 'N/A'}`);
    parts.push(`License: ${dependency.license ?? 'N/A'}`);
    if (dependency.licenseText) {
      parts.push('');
      parts.push(dependency.licenseText.replaceAll('\r', ''));
    }
    return parts.join('\n');
  }).join(divider);

  fs.writeFileSync('dist/LIGHTHOUSE_MCP_BUNDLE_THIRD_PARTY_NOTICES', stringifiedDependencies);
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
