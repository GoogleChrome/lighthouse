/**
 * @license Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {makeComputedArtifact} from './computed-artifact.js';

/**
 * @typedef WasteData
 * @property {Uint8Array} unusedByIndex
 * @property {number} unusedLength
 * @property {number} contentLength
 */

/**
 * @typedef ComputeInput
 * @property {string} scriptId
 * @property {Omit<LH.Crdp.Profiler.ScriptCoverage, 'url'>} scriptCoverage
 * @property {LH.Artifacts.Bundle=} bundle
 */

/**
 * @typedef Summary
 * @property {string} scriptId
 * @property {number} wastedBytes
 * @property {number} totalBytes
 * @property {number} wastedBytes
 * @property {number=} wastedPercent
 * @property {Record<string, number>=} sourcesWastedBytes Keyed by file name. Includes (unmapped) key too.
 */

class UnusedJavascriptSummary {
  /**
   * @param {Omit<LH.Crdp.Profiler.ScriptCoverage, 'url'>} scriptCoverage
   * @return {WasteData}
   */
  static computeWaste(scriptCoverage) {
    let maximumEndOffset = 0;
    for (const func of scriptCoverage.functions) {
      maximumEndOffset = Math.max(maximumEndOffset, ...func.ranges.map(r => r.endOffset));
    }

    // We only care about unused ranges of the script, so we can ignore all the nesting and safely
    // assume that if a range is unexecuted, all nested ranges within it will also be unexecuted.
    const unusedByIndex = new Uint8Array(maximumEndOffset);
    for (const func of scriptCoverage.functions) {
      for (const range of func.ranges) {
        if (range.count === 0) {
          for (let i = range.startOffset; i < range.endOffset; i++) {
            unusedByIndex[i] = 1;
          }
        }
      }
    }

    let unused = 0;
    for (const x of unusedByIndex) {
      unused += x;
    }

    return {
      unusedByIndex,
      unusedLength: unused,
      contentLength: maximumEndOffset,
    };
  }

  /**
   * @param {string} scriptId
   * @param {WasteData} wasteData
   * @return {Summary}
   */
  static createItem(scriptId, wasteData) {
    const wastedRatio = (wasteData.unusedLength / wasteData.contentLength) || 0;
    const wastedBytes = Math.round(wasteData.contentLength * wastedRatio);

    return {
      scriptId,
      totalBytes: wasteData.contentLength,
      wastedBytes,
      wastedPercent: 100 * wastedRatio,
    };
  }

  /**
   * @param {WasteData} wasteData
   * @param {LH.Artifacts.Bundle} bundle
   */
  static createSourceWastedBytes(wasteData, bundle) {
    if (!bundle.script.content) return;

    /** @type {Record<string, number>} */
    const files = {};

    const lineLengths = bundle.script.content.split('\n').map(l => l.length);
    let totalSoFar = 0;
    const lineOffsets = lineLengths.map(len => {
      const retVal = totalSoFar;
      totalSoFar += len + 1;
      return retVal;
    });

    // @ts-expect-error: We will upstream computeLastGeneratedColumns to CDT eventually.
    bundle.map.computeLastGeneratedColumns();
    for (const mapping of bundle.map.mappings()) {
      let offset = lineOffsets[mapping.lineNumber];

      offset += mapping.columnNumber;
      const lastColumnOfMapping = mapping.lastColumnNumber !== undefined ?
        mapping.lastColumnNumber - 1 :
        lineLengths[mapping.lineNumber];
      for (let i = mapping.columnNumber; i <= lastColumnOfMapping; i++) {
        if (wasteData.unusedByIndex[offset] === 1) {
          const key = mapping.sourceURL || '(unmapped)';
          files[key] = (files[key] || 0) + 1;
        }
        offset += 1;
      }
    }

    const dataSorted = Object.entries(files)
      .sort(([_, unusedBytes1], [__, unusedBytes2]) => unusedBytes2 - unusedBytes1);

    /** @type {Record<string, number>} */
    const bundleData = {};
    for (const [key, unusedBytes] of dataSorted) {
      bundleData[key] = unusedBytes;
    }
    return bundleData;
  }

  /**
   * @param {ComputeInput} data
   * @return {Promise<Summary>}
   */
  static async compute_(data) {
    const {scriptId, scriptCoverage, bundle} = data;

    const wasteData = UnusedJavascriptSummary.computeWaste(scriptCoverage);
    const item = UnusedJavascriptSummary.createItem(scriptId, wasteData);
    if (!bundle) return item;

    return {
      ...item,
      sourcesWastedBytes: UnusedJavascriptSummary.createSourceWastedBytes(wasteData, bundle),
    };
  }
}

const UnusedJavascriptSummaryComputed = makeComputedArtifact(
  UnusedJavascriptSummary,
  ['bundle', 'scriptCoverage', 'scriptId']
);
export {UnusedJavascriptSummaryComputed as UnusedJavascriptSummary};
