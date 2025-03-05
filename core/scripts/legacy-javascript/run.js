/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable no-console */

import fs from 'fs';
import path from 'path';
import {execFileSync} from 'child_process';
import assert from 'assert';

import glob from 'glob';

import {makeHash} from './hash.js';
import LegacyJavascript from '../../audits/byte-efficiency/legacy-javascript.js';
import {networkRecordsToDevtoolsLog} from '../../test/network-records-to-devtools-log.js';
import {LH_ROOT} from '../../../shared/root.js';
import {readJson} from '../../test/test-utils.js';

const scriptDir = `${LH_ROOT}/core/scripts/legacy-javascript`;

// Create variants in a directory named-cached by contents of this script and the lockfile.
// This folder is in the CI cache, so that the time consuming part of this test only runs if
// the output would change.
removeCoreJs(); // (in case the script was canceled halfway - there shouldn't be a core-js dep checked in.)

const hash = makeHash();
const VARIANT_DIR = `${scriptDir}/variants/${hash}`;

// build, audit, all.
const STAGE = process.env.STAGE || 'all';

const mainCode = fs.readFileSync(`${scriptDir}/main.js`, 'utf-8');

const plugins = LegacyJavascript.getTransformPatterns().map(pattern => pattern.name);
const polyfills = LegacyJavascript.getCoreJsPolyfillData();

/**
 * @param {string} command
 * @param {string[]} args
 */
function runCommand(command, args) {
  return execFileSync(command, args, {cwd: scriptDir});
}

/**
 * @param {string} version
 */
function installCoreJs(version) {
  runCommand('yarn', [
    'add',
    '-D',
    `core-js@${version}`,
  ]);
}

function removeCoreJs() {
  try {
    runCommand('yarn', [
      'remove',
      'core-js',
    ]);
  } catch (e) { }
}

/**
 * @param {{group: string, name: string, code: string, babelrc?: *}} options
 */
async function createVariant(options) {
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

    // Note: No babelrc will make babel a glorified `cp`.
    const babelOutputBuffer = runCommand('yarn', [
      'babel',
      `${dir}/main.js`,
      '--config-file', `${dir}/.babelrc`,
      '--ignore', 'node_modules/**/*.js',
      '-o', `${dir}/main.transpiled.js`,
      '--source-maps', 'inline',
    ]);
    fs.writeFileSync(`${dir}/babel-stdout.txt`, babelOutputBuffer.toString());

    // Transform any require statements (like for core-js) into a big bundle.
    runCommand('yarn', [
      'browserify',
      `${dir}/main.transpiled.js`,
      '-o', `${dir}/main.bundle.js`,
      '--debug', // source maps
      '--full-paths=false',
    ]);

    // Minify.
    runCommand('yarn', [
      'terser',
      `${dir}/main.bundle.js`,
      '-o', `${dir}/main.bundle.min.js`,
      '--source-map', 'content="inline",url="main.bundle.min.js.map"',
    ]);
  }

  if (STAGE === 'audit' || STAGE === 'all') {
    const code = fs.readFileSync(`${dir}/main.bundle.min.js`, 'utf-8');
    const map = JSON.parse(fs.readFileSync(`${dir}/main.bundle.min.js.map`, 'utf-8'));

    let legacyJavascriptResults;

    legacyJavascriptResults = await getLegacyJavascriptResults(code, map, {sourceMaps: true});
    fs.writeFileSync(`${dir}/legacy-javascript.json`,
      JSON.stringify(legacyJavascriptResults, null, 2));

    legacyJavascriptResults = await getLegacyJavascriptResults(code, map, {sourceMaps: false});
    fs.writeFileSync(`${dir}/legacy-javascript-nomaps.json`,
      JSON.stringify(legacyJavascriptResults, null, 2));
  }
}

/**
 * @param {string} code
 * @param {LH.Artifacts.RawSourceMap} map
 * @param {{sourceMaps: boolean}} _
 * @return {Promise<import('../../audits/byte-efficiency/byte-efficiency-audit.js').ByteEfficiencyProduct>}
 */
function getLegacyJavascriptResults(code, map, {sourceMaps}) {
  // Instead of running Lighthouse, use LegacyJavascript directly. Requires some setup.
  // Much faster than running Lighthouse.
  const documentUrl = 'https://localhost/index.html'; // These URLs don't matter.
  const scriptUrl = 'https://localhost/main.bundle.min.js';
  const scriptId = '10001';
  const responseHeaders = [{name: 'Content-Encoding', value: 'gzip'}];
  const networkRecords = [
    {url: documentUrl, requestId: '1000.1', resourceType: /** @type {const} */ ('Document'),
      responseHeaders},
    {url: scriptUrl, requestId: '1000.2', responseHeaders},
  ];
  const devtoolsLogs = networkRecordsToDevtoolsLog(networkRecords);

  /** @type {Pick<LH.Artifacts, 'devtoolsLogs'|'URL'|'Scripts'|'SourceMaps'>} */
  const artifacts = {
    URL: {
      requestedUrl: documentUrl,
      mainDocumentUrl: documentUrl,
      finalDisplayedUrl: documentUrl,
    },
    devtoolsLogs: {
      [LegacyJavascript.DEFAULT_PASS]: devtoolsLogs,
    },
    Scripts: [
      // @ts-expect-error - partial Script excluding unused properties
      {scriptId, url: scriptUrl, content: code},
    ],
    SourceMaps: [],
  };
  if (sourceMaps) artifacts.SourceMaps = [{scriptId, scriptUrl, map}];
  // @ts-expect-error: partial Artifacts.
  return LegacyJavascript.audit_(artifacts, networkRecords, {
    computedCache: new Map(),
  });
}

/**
 * @param {string} legacyJavascriptFilename
 */
function makeSummary(legacyJavascriptFilename) {
  let totalSignals = 0;
  const variants = [];
  for (const dir of glob.sync('*/*', {cwd: VARIANT_DIR})) {
    const {group, name} = readJson(`${VARIANT_DIR}/${dir}/variant.json`);
    /** @type {import('../../audits/byte-efficiency/byte-efficiency-audit.js').ByteEfficiencyProduct} */
    const legacyJavascript = readJson(`${VARIANT_DIR}/${dir}/${legacyJavascriptFilename}`);
    const items = /** @type {import('../../audits/byte-efficiency/legacy-javascript.js').Item[]} */(
      legacyJavascript.items);

    const signals = [];
    for (const item of items) {
      for (const subItem of item.subItems.items) {
        signals.push(subItem.signal);
      }
    }
    totalSignals += signals.length;
    variants.push({group, name, dir, signals});

    if (dir.includes('core-js') && !legacyJavascriptFilename.includes('nomaps')) {
      const isCoreJs2Variant = dir.includes('core-js-2');
      const detectedCoreJs2 = !!legacyJavascript.warnings?.length;
      assert.equal(detectedCoreJs2, isCoreJs2Variant,
        `detected core js version wrong for variant: ${dir}`);
    }
  }
  return {
    totalSignals,
    variantsMissingSignals: variants.filter(v => v.signals.length === 0).map(v => v.name),
    variants,
  };
}

function createSummarySizes() {
  const lines = [];

  for (const variantGroupFolder of glob.sync(`${VARIANT_DIR}/*`)) {
    lines.push(path.relative(VARIANT_DIR, variantGroupFolder));

    const variants = [];
    for (const variantBundle of glob.sync(`${variantGroupFolder}/**/main.bundle.min.js `)) {
      const size = fs.readFileSync(variantBundle).length;
      variants.push({name: path.relative(variantGroupFolder, variantBundle), size});
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
    await createVariant({
      group: 'only-plugin',
      name: plugin,
      code: mainCode,
      babelrc: {
        plugins: [plugin],
      },
    });
  }

  for (const coreJsVersion of ['3.40.0']) {
    const major = coreJsVersion.split('.')[0];
    removeCoreJs();
    installCoreJs(coreJsVersion);

    const moduleOptions = [
      {baseline: false, bugfixes: false},
      {baseline: true, bugfixes: false},
      {baseline: true, bugfixes: true},
    ];
    for (const {baseline, bugfixes} of moduleOptions) {
      await createVariant({
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
      await createVariant({
        group: `core-js-${major}-only-polyfill`,
        name: polyfill.name,
        code: makeRequireCodeForPolyfill(polyfill.coreJs3Module),
      });
    }

    const allPolyfillCode = polyfills.map(polyfill => {
      return makeRequireCodeForPolyfill(polyfill.coreJs3Module);
    }).join('\n');
    await createVariant({
      group: 'all-legacy-polyfills',
      name: `all-legacy-polyfills-core-js-${major}`,
      code: allPolyfillCode,
    });
  }

  removeCoreJs();

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
