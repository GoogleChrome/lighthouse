/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {createRequire} from 'module';
import fs from 'fs';

import esbuild from 'esbuild';

import * as plugins from './esbuild-plugins.js';
import {GhPagesApp} from './gh-pages-app.js';
import {LH_ROOT} from '../shared/root.js';

const require = createRequire(import.meta.url);

/** @param {{flow?: boolean}} options */
async function buildReportGenerator({flow = false} = {}) {
  const result = await esbuild.build({
    entryPoints: ['report/generator/report-generator.js'],
    write: false,
    bundle: true,
    minify: !process.env.DEBUG,
    format: flow ? 'esm' : undefined,
    plugins: [
      ...(flow ? [] : [plugins.umd('ReportGenerator')]),
      plugins.replaceModules(flow ? {
        [`${LH_ROOT}/report/generator/report-assets.js`]:
          'export {flowReportAssets as reportAssets} from "./flow-report-assets.js";',
      } : {
        [`${LH_ROOT}/report/generator/flow-report-assets.js`]: 'export const flowReportAssets = {}',
      }),
      plugins.ignoreBuiltins(),
      plugins.bulkLoader([
        plugins.partialLoaders.inlineFs({verbose: Boolean(process.env.DEBUG)}),
        plugins.partialLoaders.rmGetModuleDirectory,
      ]),
    ],
  });

  if (flow) return result.outputFiles[0].text;
  // @ts-expect-error placed here by the umd plugin.
  return result.outputFiles[0].textUmd;
}

/**
 * Build viewer, optionally deploying to gh-pages if `--deploy` flag was set.
 */
async function main() {
  const reportGeneratorJs = await buildReportGenerator();
  const flowReportGeneratorJs = await buildReportGenerator({flow: true});

  const app = new GhPagesApp({
    name: 'viewer',
    appDir: `${LH_ROOT}/viewer/app`,
    html: {path: 'index.html'},
    stylesheets: [
      {path: 'styles/*'},
      {path: '../../flow-report/assets/styles.css'},
    ],
    javascripts: [
      // TODO: import report generator async
      // https://github.com/GoogleChrome/lighthouse/pull/13429
      reportGeneratorJs,
      {path: require.resolve('pako/browser/inflate')},
      {path: 'src/main.js', esbuild: true, esbuildPlugins: [
        plugins.replaceModules({
          [`${LH_ROOT}/shared/localization/locales.js`]: 'export const locales = {};',
        }),
        plugins.ignoreBuiltins(),
        plugins.bulkLoader([
          plugins.partialLoaders.inlineFs({verbose: Boolean(process.env.DEBUG)}),
          plugins.partialLoaders.rmGetModuleDirectory,
        ]),
      ]},
    ],
    assets: [
      {path: 'images/**/*', destDir: 'images'},
      {path: 'manifest.json'},
      {path: '../../shared/localization/locales/*.json', destDir: 'locales'},
    ],
  });

  await app.build();
  fs.writeFileSync(`${app.distDir}/src/flow-report-generator.js`, flowReportGeneratorJs);

  const argv = process.argv.slice(2);
  if (argv.includes('--deploy')) {
    await app.deploy();
  }
}

await main();
