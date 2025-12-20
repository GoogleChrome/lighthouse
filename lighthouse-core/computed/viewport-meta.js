/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Parser = require('metaviewport-parser');

const makeComputedArtifact = require('./computed-artifact.js');

class ViewportMeta {
  /**
   * @param {LH.GathererArtifacts['MetaElements']} MetaElements
   * @return {Promise<ViewportMetaResult>}
  */
  static async compute_(MetaElements) {
    const viewportMeta = MetaElements.find(meta => meta.name === 'viewport');

    if (!viewportMeta) {
      return {
        hasViewportTag: false,
        isMobileOptimized: false,
        parserWarnings: [],
      };
    }

    const warnings = [];
    const parsedProps = Parser.parseMetaViewPortContent(viewportMeta.content || '');

    if (Object.keys(parsedProps.unknownProperties).length) {
      warnings.push(`Invalid properties found: ${JSON.stringify(parsedProps.unknownProperties)}`);
    }
    if (Object.keys(parsedProps.invalidValues).length) {
      warnings.push(`Invalid values found: ${JSON.stringify(parsedProps.invalidValues)}`);
    }

    const viewportProps = parsedProps.validProperties;
    const isMobileOptimized = Boolean(viewportProps.width || viewportProps['initial-scale']);

    return {
      hasViewportTag: true,
      isMobileOptimized,
      parserWarnings: warnings,
    };
  }
}

module.exports = makeComputedArtifact(ViewportMeta);

/**
 * @typedef {object} ViewportMetaResult
 * @property {boolean} hasViewportTag Whether the page has any viewport tag.
 * @property {boolean} isMobileOptimized Whether the viewport tag is optimized for mobile screens.
 * @property {Array<string>} parserWarnings Warnings if the parser encountered invalid content in the viewport tag.
 */
