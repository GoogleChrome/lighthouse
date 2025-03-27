/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import esbuild from 'esbuild';
import esMain from 'es-main';

import * as plugins from './esbuild-plugins.js';
import {nodeModulesPolyfillPlugin} from '../third-party/esbuild-plugins-polyfills/esbuild-polyfills.js';

function buildPackage() {
  return esbuild.build({
    entryPoints: ['core/lib/legacy-javascript/legacy-javascript.js'],
    outfile: 'dist/legacy-javascript/legacy-javascript.js',
    format: 'esm',
    bundle: true,
    plugins: [
      plugins.replaceModules({
        // [`${LH_ROOT}/shared/root.js`]: `export const LH_ROOT = '';`,
      }),
      nodeModulesPolyfillPlugin(),
      plugins.bulkLoader([plugins.partialLoaders.inlineFs({
        verbose: Boolean(process.env.DEBUG),
      })]),
    ],
  });
}

async function main() {
  await buildPackage();
}

if (esMain(import.meta)) {
  await main();
}
