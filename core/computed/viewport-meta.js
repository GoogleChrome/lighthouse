/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import Parser from 'metaviewport-parser';

import {makeComputedArtifact} from './computed-artifact.js';

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
        rawContentString: undefined,
      };
    }

    const warnings = [];
    const rawContentString = viewportMeta.content || '';
    const parsedProps = Parser.parseMetaViewPortContent(rawContentString);

    if (Object.keys(parsedProps.unknownProperties).length) {
      warnings.push(`Invalid properties found: ${JSON.stringify(parsedProps.unknownProperties)}`);
    }
    if (Object.keys(parsedProps.invalidValues).length) {
      warnings.push(`Invalid values found: ${JSON.stringify(parsedProps.invalidValues)}`);
    }

    const viewportProps = parsedProps.validProperties;
    const initialScale = Number(viewportProps['initial-scale']);

    if (!isNaN(initialScale) && initialScale < 1) {
      return {
        hasViewportTag: true,
        isMobileOptimized: false,
        parserWarnings: warnings,
        rawContentString,
      };
    }

    const isMobileOptimized = Boolean(viewportProps.width || initialScale);

    return {
      hasViewportTag: true,
      isMobileOptimized,
      parserWarnings: warnings,
      rawContentString,
    };
  }
}

const ViewportMetaComputed = makeComputedArtifact(ViewportMeta, null);
export {ViewportMetaComputed as ViewportMeta};

/**
 * @typedef {object} ViewportMetaResult
 * @property {boolean} hasViewportTag Whether the page has any viewport tag.
 * @property {boolean} isMobileOptimized Whether the viewport tag is optimized for mobile screens.
 * @property {Array<string>} parserWarnings Warnings if the parser encountered invalid content in the viewport tag.
 * @property {string|undefined} rawContentString The `content` attribute value, if a viewport was defined.
 */
