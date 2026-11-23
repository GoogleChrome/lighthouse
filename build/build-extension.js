/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';

import esbuild from 'esbuild';
import {zipSync} from 'fflate';

import * as plugins from './esbuild-plugins.js';
import {LH_ROOT} from '../shared/root.js';
import {readJson} from '../core/test/test-utils.js';

const argv = process.argv.slice(2);
const browserBrand = argv[0];

const sourceName = 'popup.js';
const distName = 'popup-bundle.js';

const sourceDir = `${LH_ROOT}/clients/extension`;
const distDir = `${LH_ROOT}/dist/extension-${browserBrand}`;
const packagePath = `${distDir}/../extension-${browserBrand}-package`;

const manifestVersion = readJson(`${sourceDir}/manifest.json`).version;

async function buildEntryPoint() {
  const locales = fs.readdirSync(`${LH_ROOT}/shared/localization/locales`)
    .filter(f => !f.includes('.ctc.json'))
    .map(f => f.replace('.json', ''))
    .filter(locale => !['en-XA', 'en-XL', 'ar-XB'].includes(locale));
  await esbuild.build({
    entryPoints: [`${sourceDir}/scripts/${sourceName}`],
    outfile: `${distDir}/scripts/${distName}`,
    format: 'iife',
    bundle: true,
    // Minified extensions tend to be more difficult to get approved in managed extension stores.
    minify: false,
    plugins: [
      plugins.bulkLoader([
        plugins.partialLoaders.replaceText({
          '___BROWSER_BRAND___': browserBrand,
          '__LOCALES__': JSON.stringify(locales),
        }),
      ]),
    ],
  });
}

function copyAssets() {
  const patterns = [
    '*.html',
    'styles/**/*.css',
    'images/**/*',
    'manifest.json',
  ];
  for (const relPath of fs.globSync(patterns, {cwd: sourceDir})) {
    const srcPath = path.join(sourceDir, relPath);
    if (!fs.statSync(srcPath).isFile()) continue;
    fs.cpSync(srcPath, path.join(distDir, relPath));
  }
}

/**
 * Put built extension into a zip file ready for install or upload to the
 * webstore.
 * @return {Promise<void>}
 */
async function packageExtension() {
  await fs.promises.mkdir(packagePath, {recursive: true});

  /** @type {import('fflate').Zippable} */
  const files = {};
  for (const relPath of fs.readdirSync(distDir, {recursive: true, encoding: 'utf-8'})) {
    const filePath = path.join(distDir, relPath);
    const entryPath = relPath.replaceAll(path.sep, '/');
    if (fs.statSync(filePath).isDirectory()) files[`${entryPath}/`] = new Uint8Array();
    else files[entryPath] = fs.readFileSync(filePath);
  }

  const outPath = `${packagePath}/lighthouse-${manifestVersion}.zip`;
  await fs.promises.writeFile(outPath, zipSync(files, {level: 9}));
}

async function main() {
  await Promise.all([
    buildEntryPoint(),
    copyAssets(),
  ]);

  await packageExtension();
}

await main();
