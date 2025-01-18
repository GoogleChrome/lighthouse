/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';

import esbuild from 'esbuild';

import * as plugins from './esbuild-plugins.js';
import {buildBundle} from './build-bundle.js';
import {LH_ROOT} from '../shared/root.js';

const distDir = path.join(LH_ROOT, 'dist', 'lightrider');
const sourceDir = path.join(LH_ROOT, 'clients', 'lightrider');

const entrySourceName = 'lightrider-entry.js';
const entryDistName = 'lighthouse-lr-bundle.js';

fs.mkdirSync(distDir, {recursive: true});

function buildEntryPoint() {
  const inFile = `${sourceDir}/${entrySourceName}`;
  const outFile = `${distDir}/${entryDistName}`;
  return buildBundle(inFile, outFile, {minify: false});
}

async function buildReportGenerator() {
  await esbuild.build({
    entryPoints: ['report/generator/report-generator.js'],
    outfile: 'dist/lightrider/report-generator-bundle.js',
    bundle: true,
    minify: false,
    plugins: [
      plugins.umd('ReportGenerator'),
      plugins.replaceModules({
        [`${LH_ROOT}/report/generator/flow-report-assets.js`]: 'export const flowReportAssets = {}',
      }),
      plugins.bulkLoader([
        plugins.partialLoaders.inlineFs({verbose: Boolean(process.env.DEBUG)}),
        plugins.partialLoaders.rmGetModuleDirectory,
      ]),
      plugins.ignoreBuiltins(),
    ],
  });
}

async function buildStaticServerBundle() {
  await esbuild.build({
    entryPoints: ['cli/test/fixtures/static-server.js'],
    outfile: 'dist/lightrider/static-server.js',
    format: 'cjs',
    bundle: true,
    minify: false,
    plugins: [
      plugins.bulkLoader([
        plugins.partialLoaders.inlineFs({verbose: Boolean(process.env.DEBUG)}),
        plugins.partialLoaders.rmGetModuleDirectory,
      ]),
      plugins.ignoreBuiltins(),
    ],
    external: ['mime-types', 'glob'],
  });
}

await Promise.all([
  buildEntryPoint(),
  buildReportGenerator(),
  buildStaticServerBundle(),
]);
