/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {makeComputedArtifact} from './computed-artifact.js';
import {JSBundles} from './js-bundles.js';

const RELATIVE_SIZE_THRESHOLD = 0.1;
const ABSOLUTE_SIZE_THRESHOLD_BYTES = 1024 * 0.5;

class ModuleDuplication {
  /**
   * @param {string} source
   */
  static normalizeSource(source) {
    // Trim trailing question mark - b/c webpack.
    source = source.replace(/\?$/, '');

    // Normalize paths for dependencies by only keeping everything after the last `node_modules`.
    const lastNodeModulesIndex = source.lastIndexOf('node_modules');
    if (lastNodeModulesIndex !== -1) {
      source = source.substring(lastNodeModulesIndex);
    }

    return source;
  }

  /**
   * @param {string} source
   */
  static _shouldIgnoreSource(source) {
    // Ignore bundle overhead.
    if (source.includes('webpack/bootstrap')) return true;
    if (source.includes('(webpack)/buildin')) return true;

    // Ignore webpack module shims, i.e. aliases of the form `module.exports = window.jQuery`
    if (source.includes('external ')) return true;

    return false;
  }

  /**
   * @param {Map<string, Array<{scriptId: string, resourceSize: number}>>} moduleNameToSourceData
   */
  static _normalizeAggregatedData(moduleNameToSourceData) {
    for (const [key, originalSourceData] of moduleNameToSourceData.entries()) {
      let sourceData = originalSourceData;

      // Sort by resource size.
      sourceData.sort((a, b) => b.resourceSize - a.resourceSize);

      // Remove modules smaller than a % size of largest.
      if (sourceData.length > 1) {
        const largestResourceSize = sourceData[0].resourceSize;
        sourceData = sourceData.filter(data => {
          const percentSize = data.resourceSize / largestResourceSize;
          return percentSize >= RELATIVE_SIZE_THRESHOLD;
        });
      }

      // Remove modules smaller than an absolute theshold.
      sourceData = sourceData.filter(data => data.resourceSize >= ABSOLUTE_SIZE_THRESHOLD_BYTES);

      // Delete source datas with only one value (no duplicates).
      if (sourceData.length > 1) {
        moduleNameToSourceData.set(key, sourceData);
      } else {
        moduleNameToSourceData.delete(key);
      }
    }
  }

  /**
   * @param {Pick<LH.Artifacts, 'Scripts'|'SourceMaps'>} artifacts
   * @param {LH.Artifacts.ComputedContext} context
   */
  static async compute_(artifacts, context) {
    const bundles = await JSBundles.request(artifacts, context);

    /**
     * @typedef SourceData
     * @property {string} source
     * @property {number} resourceSize
     */

    /** @type {Map<LH.Artifacts.RawSourceMap, SourceData[]>} */
    const sourceDatasMap = new Map();

    // Determine size of each `sources` entry.
    for (const {rawMap, sizes} of bundles) {
      if ('errorMessage' in sizes) continue;

      /** @type {SourceData[]} */
      const sourceDataArray = [];
      sourceDatasMap.set(rawMap, sourceDataArray);

      for (let i = 0; i < rawMap.sources.length; i++) {
        if (this._shouldIgnoreSource(rawMap.sources[i])) continue;

        const sourceKey = (rawMap.sourceRoot || '') + rawMap.sources[i];
        const sourceSize = sizes.files[sourceKey];
        sourceDataArray.push({
          source: ModuleDuplication.normalizeSource(rawMap.sources[i]),
          resourceSize: sourceSize,
        });
      }
    }

    /** @type {Map<string, Array<{scriptId: string, scriptUrl: string, resourceSize: number}>>} */
    const moduleNameToSourceData = new Map();
    for (const {rawMap, script} of bundles) {
      const sourceDataArray = sourceDatasMap.get(rawMap);
      if (!sourceDataArray) continue;

      for (const sourceData of sourceDataArray) {
        let data = moduleNameToSourceData.get(sourceData.source);
        if (!data) {
          data = [];
          moduleNameToSourceData.set(sourceData.source, data);
        }
        data.push({
          scriptId: script.scriptId,
          scriptUrl: script.url,
          resourceSize: sourceData.resourceSize,
        });
      }
    }

    this._normalizeAggregatedData(moduleNameToSourceData);
    return moduleNameToSourceData;
  }
}

const ModuleDuplicationComputed =
  makeComputedArtifact(ModuleDuplication, ['Scripts', 'SourceMaps']);
export {ModuleDuplicationComputed as ModuleDuplication};
