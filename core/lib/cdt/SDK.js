/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

const SDK = {
  SourceMap: require('./generated/SourceMap.js'),
};

// Add `lastColumnNumber` to mappings. This will eventually be added to CDT.
// @ts-expect-error
SDK.SourceMap.prototype.computeLastGeneratedColumns = function() {
  const mappings = this.mappings();
  if (mappings.length && mappings[0].lastColumnNumber !== undefined) return;

  for (let i = 0; i < mappings.length - 1; i++) {
    const mapping = mappings[i];
    const nextMapping = mappings[i + 1];
    if (mapping.lineNumber === nextMapping.lineNumber) {
      mapping.lastColumnNumber = nextMapping.columnNumber;
    }
  }

  // Now, all but the last mapping on each line will have 'lastColumnNumber' set to a number.
};

module.exports = SDK;
