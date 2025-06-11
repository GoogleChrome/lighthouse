/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {createRequire} from 'module';

import esbuild from 'esbuild';

import * as plugins from './esbuild-plugins.js';
import {GhPagesApp} from './gh-pages-app.js';
import {LH_ROOT} from '../shared/root.js';

const require = createRequire(import.meta.url);

async function buildReportGenerator() {
  const result = await esbuild.build({
    entryPoints: ['report/generator/report-generator.js'],
    write: false,
    bundle: true,
    minify: !process.env.DEBUG,
    plugins: [
      plugins.umd('ReportGenerator'),
      plugins.replaceModules({
        [`${LH_ROOT}/report/generator/flow-report-assets.js`]: 'export const flowReportAssets = {}',
      }),
      plugins.ignoreBuiltins(),
      plugins.bulkLoader([
        plugins.partialLoaders.inlineFs({verbose: Boolean(process.env.DEBUG)}),
        plugins.partialLoaders.rmGetModuleDirectory,
      ]),
    ],
  });

  // @ts-expect-error placed here by the umd plugin.
  return result.outputFiles[0].textUmd;
}

/**
 * Build viewer, optionally deploying to gh-pages if `--deploy` flag was set.
 */
async function main() {
  const reportGeneratorJs = await buildReportGenerator();

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
      {path: require.resolve('pako/dist/pako_inflate.js')},
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

  const argv = process.argv.slice(2);
  if (argv.includes('--deploy')) {
    await app.deploy();
  }
}

await main();
