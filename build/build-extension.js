/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';

import archiver from 'archiver';
import cpy from 'cpy';
import esbuild from 'esbuild';

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
  cpy([
    '*.html',
    'styles/**/*.css',
    'images/**/*',
    'manifest.json',
  ], distDir, {
    cwd: sourceDir,
    parents: true,
  });
}

/**
 * Put built extension into a zip file ready for install or upload to the
 * webstore.
 * @return {Promise<void>}
 */
async function packageExtension() {
  await fs.promises.mkdir(packagePath, {recursive: true});

  return new Promise((resolve, reject) => {
    const archive = archiver('zip', {
      zlib: {level: 9},
    });

    const outPath = `${packagePath}/lighthouse-${manifestVersion}.zip`;
    const writeStream = fs.createWriteStream(outPath);
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);

    archive.pipe(writeStream);
    archive.directory(distDir, false);
    archive.finalize();
  });
}

async function main() {
  await Promise.all([
    buildEntryPoint(),
    copyAssets(),
  ]);

  await packageExtension();
}

await main();
