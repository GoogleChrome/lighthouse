/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import log from 'lighthouse-logger';

import {makeComputedArtifact} from './computed-artifact.js';
import SDK from '../lib/cdt/SDK.js';

/**
 * Calculate the number of bytes contributed by each source file
 * @param {LH.Artifacts.Bundle['map']} map
 * @param {number} contentLength
 * @param {string} content
 * @return {LH.Artifacts.Bundle['sizes']}
 */
function computeGeneratedFileSizes(map, contentLength, content) {
  const lines = content.split('\n');
  /** @type {Record<string, number>} */
  const files = {};
  const totalBytes = contentLength;
  let unmappedBytes = totalBytes;

  // @ts-expect-error: This function is added in SDK.js. This will eventually be added to CDT.
  map.computeLastGeneratedColumns();

  for (const mapping of map.mappings()) {
    const source = mapping.sourceURL;
    const lineNum = mapping.lineNumber;
    const colNum = mapping.columnNumber;
    const lastColNum = mapping.lastColumnNumber;

    // Webpack sometimes emits null mappings.
    // https://github.com/mozilla/source-map/pull/303
    if (!source) continue;

    // Lines and columns are zero-based indices. Visually, lines are shown as a 1-based index.

    const line = lines[lineNum];
    if (line === null || line === undefined) {
      const errorMessage = `${map.url()} mapping for line out of bounds: ${lineNum + 1}`;
      log.error('JSBundles', errorMessage);
      return {errorMessage};
    }

    if (colNum > line.length) {
      const errorMessage =
        `${map.url()} mapping for column out of bounds: ${lineNum + 1}:${colNum}`;
      log.error('JSBundles', errorMessage);
      return {errorMessage};
    }

    let mappingLength = 0;
    if (lastColNum !== undefined) {
      if (lastColNum > line.length) {
        const errorMessage =
          `${map.url()} mapping for last column out of bounds: ${lineNum + 1}:${lastColNum}`;
        log.error('JSBundles', errorMessage);
        return {errorMessage};
      }
      mappingLength = lastColNum - colNum;
    } else {
      // Add +1 to account for the newline.
      mappingLength = line.length - colNum + 1;
    }
    files[source] = (files[source] || 0) + mappingLength;
    unmappedBytes -= mappingLength;
  }

  return {
    files,
    unmappedBytes,
    totalBytes,
  };
}

class JSBundles {
  /**
   * @param {Pick<LH.Artifacts, 'SourceMaps'|'Scripts'>} artifacts
   */
  static async compute_(artifacts) {
    const {SourceMaps, Scripts} = artifacts;

    /** @type {LH.Artifacts.Bundle[]} */
    const bundles = [];

    // Collate map and script, compute file sizes.
    for (const SourceMap of SourceMaps) {
      if (!SourceMap.map) continue;
      const {scriptId, map: rawMap} = SourceMap;

      if (!rawMap.mappings) continue;

      const script = Scripts.find(s => s.scriptId === scriptId);
      if (!script) continue;

      const compiledUrl = SourceMap.scriptUrl || 'compiled.js';
      const mapUrl = SourceMap.sourceMapUrl || 'compiled.js.map';
      const map = new SDK.SourceMap(compiledUrl, mapUrl, rawMap);

      const sizes = computeGeneratedFileSizes(map, script.length || 0, script.content || '');

      const bundle = {
        rawMap,
        script,
        map,
        sizes,
      };
      bundles.push(bundle);
    }

    return bundles;
  }
}

const JSBundlesComputed = makeComputedArtifact(JSBundles, ['Scripts', 'SourceMaps']);
export {JSBundlesComputed as JSBundles};
