/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import BaseGatherer from '../base-gatherer.js';

/**
 * @return {LH.Artifacts.ViewportDimensions}
 */
/* c8 ignore start */
function getViewportDimensions() {
  // window.innerWidth to get the scrollable size of the window (irrespective of zoom)
  // window.outerWidth to get the size of the visible area
  // window.devicePixelRatio to get ratio of logical pixels to physical pixels
  return {
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    outerWidth: window.outerWidth,
    outerHeight: window.outerHeight,
    devicePixelRatio: window.devicePixelRatio,
  };
}
/* c8 ignore stop */

class ViewportDimensions extends BaseGatherer {
  /** @type {LH.Gatherer.GathererMeta} */
  meta = {
    supportedModes: ['snapshot', 'timespan', 'navigation'],
  };

  /**
   * @param {LH.Gatherer.Context} passContext
   * @return {Promise<LH.Artifacts.ViewportDimensions>}
   */
  async getArtifact(passContext) {
    const driver = passContext.driver;

    const dimensions = await driver.executionContext.evaluate(getViewportDimensions, {
      args: [],
      useIsolation: true,
    });

    const allNumeric = Object.values(dimensions).every(Number.isFinite);
    if (!allNumeric) {
      const results = JSON.stringify(dimensions);
      throw new Error(`ViewportDimensions results were not numeric: ${results}`);
    }

    return dimensions;
  }
}

export default ViewportDimensions;
