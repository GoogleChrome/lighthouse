/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';

import esbuild from 'esbuild';
import esMain from 'es-main';

import {LH_ROOT} from '../shared/root.js';

async function buildPackage() {
  await esbuild.build({
    entryPoints: ['core/lib/legacy-javascript/legacy-javascript.js'],
    outfile: 'dist/legacy-javascript/legacy-javascript.js',
    format: 'esm',
    bundle: true,
  });

  fs.copyFileSync(`${LH_ROOT}/core/lib/legacy-javascript/package.json`,
    'dist/legacy-javascript/package.json');
}

async function main() {
  await buildPackage();
}

if (esMain(import.meta)) {
  await main();
}
