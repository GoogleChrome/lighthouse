/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert/strict';

import esbuild from 'esbuild';

import * as plugins from './esbuild-plugins.js';
import {LH_ROOT} from '../shared/root.js';

const distDir = path.join(LH_ROOT, 'dist', 'dt-report-resources');
const bundleOutFile = `${distDir}/report-generator.mjs`;

/**
 * @param {string} name
 * @param {string} content
 */
function writeFile(name, content) {
  assert(content);
  fs.writeFileSync(`${distDir}/${name}`, content);
}

fs.rmSync(distDir, {recursive: true, force: true});
fs.mkdirSync(distDir, {recursive: true});

writeFile('report-generator.mjs.d.ts', 'export {}');

async function buildReportGenerator() {
  await esbuild.build({
    entryPoints: ['report/generator/report-generator.js'],
    outfile: bundleOutFile,
    bundle: true,
    minify: false,
    plugins: [
      plugins.umd('Lighthouse.ReportGenerator'),
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

await buildReportGenerator();
