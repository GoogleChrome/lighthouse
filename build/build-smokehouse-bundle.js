/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import esbuild from 'esbuild';

import * as plugins from './esbuild-plugins.js';
import {LH_ROOT} from '../shared/root.js';
import {nodeModulesPolyfillPlugin} from '../third-party/esbuild-plugins-polyfills/esbuild-polyfills.js';

const distDir = `${LH_ROOT}/dist`;
const bundleOutFile = `${distDir}/smokehouse-bundle.js`;
const smokehouseLibFilename = './cli/test/smokehouse/frontends/lib.js';
const smokehouseCliFilename = `${LH_ROOT}/cli/test/smokehouse/lighthouse-runners/cli.js`;

async function main() {
  await esbuild.build({
    entryPoints: [smokehouseLibFilename],
    outfile: bundleOutFile,
    format: 'cjs',
    bundle: true,
    plugins: [
      plugins.replaceModules({
        [smokehouseCliFilename]:
          'export function runLighthouse() { throw new Error("not supported"); }',
        'module': `
          export const createRequire = () => {
            return {
              resolve() {
                throw new Error('createRequire.resolve is not supported in bundled Lighthouse');
              },
            };
          };
        `,
        // Our node modules polyfill plugin does not support assert/strict.
        'assert/strict': `
          import assert from 'assert';
          export default assert;
        `,
      }),
      plugins.bulkLoader([
        plugins.partialLoaders.inlineFs({verbose: Boolean(process.env.DEBUG)}),
        plugins.partialLoaders.rmGetModuleDirectory,
      ]),
      nodeModulesPolyfillPlugin(),
      plugins.ignoreBuiltins(),
    ],
  });
}

await main();
