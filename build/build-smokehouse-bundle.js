/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import esbuild from 'esbuild';

import * as plugins from './esbuild-plugins.js';
import {LH_ROOT} from '../shared/root.js';

const distDir = `${LH_ROOT}/dist`;
const bundleOutFile = `${distDir}/smokehouse/smokehouse-bundle.js`;
const smokehouseLibFilename = './cli/test/smokehouse/frontends/lib.js';
const smokehouseCliFilename = `${LH_ROOT}/cli/test/smokehouse/lighthouse-runners/cli.js`;

async function main() {
  await esbuild.build({
    entryPoints: [smokehouseLibFilename],
    outfile: bundleOutFile,
    format: 'cjs',
    bundle: true,
    define: {global: 'globalThis'},
    plugins: [
      plugins.replaceModules({
        ...plugins.nodeModuleShims,
        [smokehouseCliFilename]:
          'export function runLighthouse() { throw new Error("not supported"); }',
      }, {
        disableUnusedError: true,
      }),
      plugins.bulkLoader([
        plugins.partialLoaders.inlineFs({verbose: Boolean(process.env.DEBUG)}),
        plugins.partialLoaders.rmGetModuleDirectory,
      ]),
      plugins.ignoreBuiltins(),
    ],
  });
}

await main();
