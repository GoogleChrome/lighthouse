/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable no-console */

import fs from 'fs';
import util from 'util';
import path from 'path';
import {execFile} from 'child_process';

import glob from 'glob';

import {makeHash} from './hash.js';
import SDK from '../../lib/cdt/SDK.js';
import {LH_ROOT} from '../../../shared/root.js';
import {readJson} from '../../test/test-utils.js';
import {detectLegacyJavaScript, getCoreJsPolyfillData, getTransformPatterns} from '../../lib/legacy-javascript.js';

const execFileAsync = util.promisify(execFile);

const scriptDir = `${LH_ROOT}/core/scripts/legacy-javascript`;

// Create variants in a directory named-cached by contents of this script and the lockfile.
// This folder is in the CI cache, so that the time consuming part of this test only runs if
// the output would change.
const hash = makeHash();
const VARIANT_DIR = `${scriptDir}/variants/${hash}`;

// build, audit, all.
const STAGE = process.env.STAGE || 'all';

const mainCode = fs.readFileSync(`${scriptDir}/main.js`, 'utf-8');

const plugins = getTransformPatterns().map(pattern => pattern.name);
const polyfills = getCoreJsPolyfillData();

/** @typedef {Array<{bundle: string, result: import('../../lib/legacy-javascript.js').Result}>} SummaryFile */

/**
 * @param {string} command
 * @param {string[]} args
 */
function runCommand(command, args) {
  return execFileAsync(command, args, {cwd: scriptDir});
}

/**
 * @param {string} version
 */
async function installCoreJs(version) {
  await runCommand('yarn', [
    'add',
    '-D',
    `core-js@${version}`,
  ]);
}

async function removeCoreJs() {
  try {
    await runCommand('yarn', [
      'remove',
      'core-js',
    ]);
  } catch (e) { }
}

/** @type {Promise<void>[]} */
const allVariantPromises = [];

/**
 * @param {{group: string, name: string, code: string, babelrc?: *}} options
 */
function createVariant(options) {
  allVariantPromises.push(processVariant(options));
}

async function waitForVariants() {
  await Promise.all(allVariantPromises);
  allVariantPromises.length = 0;
}

/**
 * @param {{group: string, name: string, code: string, babelrc?: *}} options
 */
async function processVariant(options) {
  const {group, name, code, babelrc} = options;
  const dir = `${VARIANT_DIR}/${group}/${name.replace(/[^a-zA-Z0-9]+/g, '-')}`;

  if (!fs.existsSync(`${dir}/main.bundle.js`) && (STAGE === 'build' || STAGE === 'all')) {
    fs.mkdirSync(dir, {recursive: true});
    fs.writeFileSync(`${dir}/variant.json`, JSON.stringify({group, name}, null, 2));
    fs.writeFileSync(`${dir}/package.json`, JSON.stringify({type: 'commonjs'}));
    fs.writeFileSync(`${dir}/main.js`, code);
    fs.writeFileSync(`${dir}/.babelrc`, JSON.stringify(babelrc || {}, null, 2));
    // Not used in this script, but useful for running Lighthouse manually.
    // Just need to start a web server first.
    fs.writeFileSync(`${dir}/index.html`,
      `<title>${name}</title><script src=main.bundle.min.js></script><p>${name}</p>`);

    // Apply code transforms and inject require statements for polyfills.
    // Note: No babelrc will make babel a glorified `cp`.
    const babelOutputBuffer = await runCommand('yarn', [
      'babel',
      `${dir}/main.js`,
      '--config-file', `${dir}/.babelrc`,
      '--ignore', 'node_modules/**/*.js',
      '-o', `${dir}/main.transpiled.js`,
      '--source-maps', 'inline',
    ]);
    fs.writeFileSync(`${dir}/babel-stdout.txt`, babelOutputBuffer.stdout.toString());
    if (babelOutputBuffer.stderr) {
      fs.writeFileSync(`${dir}/babel-stderr.txt`, babelOutputBuffer.stderr.toString());
    }

    // browserify

    // Transform any require statements (like for core-js) into a big bundle.
    await runCommand('yarn', [
      'browserify',
      `${dir}/main.transpiled.js`,
      '-o', `${dir}/main.bundle.browserify.js`,
      '--debug', // source maps
      '--full-paths=false',
    ]);

    // Minify.
    await runCommand('yarn', [
      'terser',
      `${dir}/main.bundle.browserify.js`,
      '-o', `${dir}/main.bundle.browserify.min.js`,
      '--source-map', 'content="inline",url="main.bundle.browserify.min.js.map"',
    ]);

    // esbuild
    await runCommand('yarn', [
      'esbuild',
      `${dir}/main.transpiled.js`,
      `--outfile=${dir}/main.bundle.esbuild.js`,
      '--bundle',
      '--sourcemap',
    ]);
    await runCommand('yarn', [
      'esbuild',
      `${dir}/main.transpiled.js`,
      `--outfile=${dir}/main.bundle.esbuild.min.js`,
      '--bundle',
      '--sourcemap',
      '--minify',
    ]);

    // rollup
    await runCommand('yarn', [
      'rollup',
      `${dir}/main.transpiled.js`,
      '--file',
      `${dir}/main.bundle.rollup.js`,
      '--format',
      'iife',
      '--plugin', '@rollup/plugin-commonjs',
      '--sourcemap',
    ]);
    await runCommand('yarn', [
      'rollup',
      `${dir}/main.transpiled.js`,
      '--file',
      `${dir}/main.bundle.rollup.min.js`,
      '--format',
      'iife',
      '--plugin', '@rollup/plugin-commonjs',
      '--plugin', '@rollup/plugin-terser',
      '--sourcemap',
      '--minify',
    ]);
  }

  if (STAGE === 'audit' || STAGE === 'all') {
    const legacyJavascriptWithMapResults = [];
    const legacyJavascriptWithoutMapResults = [];

    const bundles = [
      'main.bundle.browserify.js',
      'main.bundle.browserify.min.js',
      'main.bundle.esbuild.js',
      'main.bundle.esbuild.min.js',
      'main.bundle.rollup.js',
      'main.bundle.rollup.min.js',
    ];
    for (const bundle of bundles) {
      const code = fs.readFileSync(`${dir}/${bundle}`, 'utf-8');

      if (fs.existsSync(`${dir}/${bundle}.map`)) {
        const map = JSON.parse(fs.readFileSync(`${dir}/${bundle}.map`, 'utf-8'));
        legacyJavascriptWithMapResults.push({
          bundle,
          result: detectLegacyJavaScript(code, new SDK.SourceMap('', '', map)),
        });
      }

      legacyJavascriptWithoutMapResults.push({
        bundle,
        result: detectLegacyJavaScript(code, null),
      });
    }

    fs.writeFileSync(`${dir}/legacy-javascript.json`,
      JSON.stringify(legacyJavascriptWithMapResults, null, 2));
    fs.writeFileSync(`${dir}/legacy-javascript-nomaps.json`,
      JSON.stringify(legacyJavascriptWithoutMapResults, null, 2));
  }
}

/**
 * @param {string} legacyJavascriptFilename
 */
function makeSummary(legacyJavascriptFilename) {
  let totalSignals = 0;
  const variants = [];
  for (const dir of glob.sync('*/*', {cwd: VARIANT_DIR})) {
    const {group, name} = readJson(`${VARIANT_DIR}/${dir}/variant.json`);
    /** @type {SummaryFile} */
    const summary = readJson(`${VARIANT_DIR}/${dir}/${legacyJavascriptFilename}`);

    for (const {bundle, result} of summary) {
      const signals = result.matches.map(m => m.name);
      totalSignals += signals.length;
      variants.push({group, name, bundle, dir, signals});
    }
  }

  return {
    totalSignals,
    variantsMissingSignals: [
      ...new Set(variants.filter(v => v.signals.length === 0).map(v => v.name)),
    ],
    variants,
  };
}

function createSummarySizes() {
  const lines = [];

  for (const variantGroupFolder of glob.sync(`${VARIANT_DIR}/*`)) {
    lines.push(path.relative(VARIANT_DIR, variantGroupFolder));

    const variants = [];
    for (const bundle of glob.sync(`${variantGroupFolder}/**/main.bundle.browserify.min.js`)) {
      const size = fs.readFileSync(bundle).length;
      variants.push({name: path.relative(variantGroupFolder, bundle), size});
    }

    const maxNumberChars = Math.ceil(Math.max(...variants.map(v => Math.log10(v.size))));
    variants.sort((a, b) => {
      const sizeDiff = b.size - a.size;
      if (sizeDiff !== 0) return sizeDiff;
      return b.name.localeCompare(a.name);
    });
    for (const variant of variants) {
      // Line up the digits.
      const sizeField = `${variant.size}`.padStart(maxNumberChars);
      // Buffer of 12 characters so a new entry with more digits doesn't change every line.
      lines.push(`  ${sizeField.padEnd(12)} ${variant.name}`);
    }
    lines.push('');
  }

  fs.writeFileSync(`${scriptDir}/summary-sizes.txt`, lines.join('\n'));
}

/**
 * @param {string} module
 */
function makeRequireCodeForPolyfill(module) {
  return `require("../../../../node_modules/core-js/modules/${module}")`;
}

async function main() {
  for (const plugin of plugins) {
    createVariant({
      group: 'only-plugin',
      name: plugin,
      code: mainCode,
      babelrc: {
        plugins: [plugin],
      },
    });
  }

  await waitForVariants();

  for (const coreJsVersion of ['3.40.0']) {
    const major = coreJsVersion.split('.')[0];
    await removeCoreJs();
    await installCoreJs(coreJsVersion);

    const moduleOptions = [
      {baseline: false, bugfixes: false},
      {baseline: true, bugfixes: false},
      {baseline: true, bugfixes: true},
    ];
    for (const {baseline, bugfixes} of moduleOptions) {
      createVariant({
        group: `core-js-${major}-preset-env`,
        name: `baseline_${baseline}_bugfixes_${bugfixes}`,
        code: `require('core-js');\n${mainCode}`,
        babelrc: {
          presets: [
            [
              '@babel/preset-env',
              {
                targets: baseline ? [
                  'chrome >0 and last 2.5 years',
                  'edge >0 and last 2.5 years',
                  'safari >0 and last 2.5 years',
                  'firefox >0 and last 2.5 years',
                  'and_chr >0 and last 2.5 years',
                  'and_ff >0 and last 2.5 years',
                  'ios >0 and last 2.5 years',
                ] : undefined,
                useBuiltIns: 'entry',
                corejs: major,
                bugfixes,
                debug: true,
              },
            ],
          ],
        },
      });
    }

    for (const polyfill of polyfills) {
      createVariant({
        group: `core-js-${major}-only-polyfill`,
        name: polyfill.name,
        code: makeRequireCodeForPolyfill(polyfill.coreJs3Module),
      });
    }

    const allPolyfillCode = polyfills.map(polyfill => {
      return makeRequireCodeForPolyfill(polyfill.coreJs3Module);
    }).join('\n');
    createVariant({
      group: 'all-legacy-polyfills',
      name: `all-legacy-polyfills-core-js-${major}`,
      code: allPolyfillCode,
    });

    await waitForVariants();
  }

  await removeCoreJs();

  let summary;

  // Summary of using source maps and pattern matching.
  summary = makeSummary('legacy-javascript.json');
  fs.writeFileSync(`${scriptDir}/summary-signals.json`, JSON.stringify(summary, null, 2));

  // Summary of using only pattern matching.
  summary = makeSummary('legacy-javascript-nomaps.json');
  fs.writeFileSync(`${scriptDir}/summary-signals-nomaps.json`, JSON.stringify(summary, null, 2));
  console.log({
    totalSignals: summary.totalSignals,
    variantsMissingSignals: summary.variantsMissingSignals,
  });
  console.table(summary.variants.filter(variant => {
    // Too many signals, break layout.
    if (variant.name.includes('all-legacy-polyfills')) return false;
    return true;
  }));

  createSummarySizes();
}

await main();
