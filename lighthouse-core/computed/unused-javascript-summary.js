/**
 * @license Copyright 2020 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const makeComputedArtifact = require('./computed-artifact.js');

/**
 * @typedef WasteData
 * @property {Uint8Array} unusedByIndex
 * @property {number} unusedLength
 * @property {number} contentLength
 */

/**
 * @typedef ComputeInput
 * @property {string} url
 * @property {LH.Crdp.Profiler.ScriptCoverage[]} scriptCoverages
 * @property {LH.Artifacts.Bundle=} bundle
 */

/**
 * @typedef Summary
 * @property {string} url
 * @property {number} wastedBytes
 * @property {number} totalBytes
 * @property {number} wastedBytes
 * @property {number=} wastedPercent
 * @property {Record<string, number>=} sourcesWastedBytes
 */

class UnusedJavascriptSummary {
  /**
   * @param {LH.Crdp.Profiler.ScriptCoverage} scriptCoverage
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
   * @param {string} url
   * @param {ReturnType<typeof UnusedJavascriptSummary.determineLengths>} lengths
   * @return {Summary}
   */
  static createItem(url, lengths) {
    const wastedRatio = (lengths.unused / lengths.content) || 0;
    const wastedBytes = Math.round(lengths.content * wastedRatio);

    return {
      url: url,
      totalBytes: lengths.content,
      wastedBytes,
      wastedPercent: 100 * wastedRatio,
    };
  }

  /**
   * @param {WasteData[]} wasteData
   */
  static determineLengths(wasteData) {
    let unused = 0;
    let content = 0;
    // TODO: this is right for multiple script tags in an HTML document,
    // but may be wrong for multiple frames using the same script resource.
    for (const usage of wasteData) {
      unused += usage.unusedLength;
      content += usage.contentLength;
    }

    return {
      content,
      unused,
    };
  }

  /**
   * @param {WasteData[]} wasteData
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

    // @ts-ignore: We will upstream computeLastGeneratedColumns to CDT eventually.
    bundle.map.computeLastGeneratedColumns();
    for (const mapping of bundle.map.mappings()) {
      let offset = lineOffsets[mapping.lineNumber];

      offset += mapping.columnNumber;
      const lastColumnOfMapping =
        // @ts-ignore: We will upstream lastColumnNumber to CDT eventually.
        (mapping.lastColumnNumber - 1) || lineLengths[mapping.lineNumber];
      for (let i = mapping.columnNumber; i <= lastColumnOfMapping; i++) {
        if (wasteData.every(data => data.unusedByIndex[offset] === 1)) {
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
    const {url, scriptCoverages, bundle} = data;

    const wasteData = scriptCoverages.map(UnusedJavascriptSummary.computeWaste);
    const lengths = UnusedJavascriptSummary.determineLengths(wasteData);
    const item = UnusedJavascriptSummary.createItem(url, lengths);
    if (!bundle) return item;

    return {
      ...item,
      sourcesWastedBytes: UnusedJavascriptSummary.createSourceWastedBytes(wasteData, bundle),
    };
  }
}

module.exports = makeComputedArtifact(UnusedJavascriptSummary);
