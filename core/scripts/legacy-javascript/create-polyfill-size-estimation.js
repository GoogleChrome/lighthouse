/**
 * @license Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable no-console */

/**
 * @fileoverview - Used to generate size estimation data for polyfills in LegacyJavaScript audit.
 *
 * Returns a flattened graph of modules found in bundles used for an individual core-js polyfill.
 * See PolyfillSizeEstimator typedef for explanations of the structure of the graph properties
 *
 * USAGE:
 *   1. Run `node run.js`
 *   2. Run `node create-polyfill-size-estimation.js`
 *   3. Inspect `polyfill-graph-data.json`
 */

/**
 * @typedef PolyfillSizeEstimator
 * @property {Record<string, number[]>} dependencies indexed by the polyfill name. array of module indices
 * @property {number[]} moduleSizes indices in the arrays in `.dependencies` are for this array
 * @property {number} maxSize sum of `.moduleSizes`
*/

import fs from 'fs';

import prettyJSONStringify from 'pretty-json-stringify';

import {makeHash} from './hash.js';
import LegacyJavascript from '../../audits/byte-efficiency/legacy-javascript.js';
import {JSBundles} from '../../computed/js-bundles.js';
import {LH_ROOT} from '../../../shared/root.js';

const hash = makeHash();
const VARIANT_DIR = `${LH_ROOT}/core/scripts/legacy-javascript/variants/${hash}`;
const OUTPUT_PATH = `${LH_ROOT}/core/audits/byte-efficiency/polyfill-graph-data.json`;
const COMMON_MODULE = 'commonCoreJs';

/**
 * @param {number[]} arr
 */
function sum(arr) {
  return arr.reduce((acc, cur) => acc + cur, 0);
}

/**
 * Computes a mapping of polyfill names to their list of dependencies.
 * @return {Map<string, string[]>}
 */
function getPolyfillDependencies() {
  /** @type {Map<string, string[]>} */
  const polyfillDependencies = new Map();

  for (const {name, coreJs3Module} of LegacyJavascript.getCoreJsPolyfillData()) {
    const folder = coreJs3Module.replace(/[^a-zA-Z0-9]+/g, '-');
    const bundleMapPath =
      `${VARIANT_DIR}/core-js-3-only-polyfill/${folder}/main.bundle.min.js.map`;
    /** @type {LH.Artifacts.RawSourceMap} */
    const bundleMap = JSON.parse(fs.readFileSync(bundleMapPath, 'utf-8'));
    polyfillDependencies.set(name, bundleMap.sources.filter(s => s.startsWith('node_modules')));
  }

  return polyfillDependencies;
}

async function main() {
  const polyfillDependencies = getPolyfillDependencies();

  // Find the common modules amongst all the corejs polyfills, and replace with a singular
  // common module to make the graph smaller.
  const allCoreJsPolyfillModules = [...polyfillDependencies.values()];
  const commonModules = allCoreJsPolyfillModules[0].filter(potentialCommonModule => {
    return allCoreJsPolyfillModules.every(modules => modules.includes(potentialCommonModule));
  });
  for (const [name, modules] of polyfillDependencies.entries()) {
    const modulesCommonFlattened = modules.filter(module => !commonModules.includes(module));
    modulesCommonFlattened.unshift(COMMON_MODULE);
    polyfillDependencies.set(name, modulesCommonFlattened);
  }

  const bundlePath =
    `${VARIANT_DIR}/all-legacy-polyfills/all-legacy-polyfills-core-js-3/main.bundle.min.js`;
  const bundleContents = fs.readFileSync(bundlePath, 'utf-8');
  const bundleMap = JSON.parse(fs.readFileSync(bundlePath + '.map', 'utf-8'));
  /** @type {Pick<LH.Artifacts, 'Scripts'|'SourceMaps'>} */
  const artifacts = {
    // @ts-expect-error don't need most properties on Script.
    Scripts: [{scriptId: '', url: '', content: bundleContents}],
    SourceMaps: [{scriptId: '', scriptUrl: '', map: bundleMap}],
  };
  const bundles = await JSBundles.compute_(artifacts);
  if ('errorMessage' in bundles[0].sizes) throw new Error(bundles[0].sizes.errorMessage);
  const bundleFileSizes = bundles[0].sizes.files;

  const allModules = Object.keys(bundleFileSizes).filter(s => s.startsWith('node_modules'));
  const moduleSizes = allModules.map(module => {
    return bundleFileSizes[module];
  });
  allModules.unshift(COMMON_MODULE);
  moduleSizes.unshift(sum(commonModules.map(m => bundleFileSizes[m])));

  /** @type {Record<string, number[]>} */
  const polyfillDependenciesEncoded = {};
  for (const [name, modules] of polyfillDependencies.entries()) {
    polyfillDependenciesEncoded[name] = modules.map(module => allModules.indexOf(module));
  }

  // For now, hardcode non-corejs polyfills.
  moduleSizes.push(3000);
  polyfillDependenciesEncoded['focus-visible'] = [moduleSizes.length - 1];

  const maxSize = sum(moduleSizes);

  /** @type {PolyfillSizeEstimator} */
  const polyfillDependencyGraphData = {
    moduleSizes,
    dependencies: polyfillDependenciesEncoded,
    maxSize,
  };

  const json = prettyJSONStringify(polyfillDependencyGraphData, {
    tab: '  ',
    spaceBeforeColon: '',
    spaceInsideObject: '',
    shouldExpand: value => !Array.isArray(value),
  });
  fs.writeFileSync(OUTPUT_PATH, json);
}

main();
