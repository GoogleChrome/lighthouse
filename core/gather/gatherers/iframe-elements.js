/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* global getNodeDetails */

import BaseGatherer from '../base-gatherer.js';
import {pageFunctions} from '../../lib/page-functions.js';

/* eslint-env browser, node */

/**
 * @return {LH.Artifacts['IFrameElements']}
 */
/* c8 ignore start */
function collectIFrameElements() {
  const realBoundingClientRect = window.__HTMLElementBoundingClientRect ||
    window.HTMLElement.prototype.getBoundingClientRect;

  // @ts-expect-error - put into scope via stringification
  const iFrameElements = getElementsInDocument('iframe'); // eslint-disable-line no-undef
  return iFrameElements.map(/** @param {HTMLIFrameElement} node */ (node) => {
    const clientRect = realBoundingClientRect.call(node);
    const {top, bottom, left, right, width, height} = clientRect;
    return {
      id: node.id,
      src: node.src,
      clientRect: {top, bottom, left, right, width, height},
      // @ts-expect-error - put into scope via stringification
      isPositionFixed: isPositionFixed(node), // eslint-disable-line no-undef
      // @ts-expect-error - getNodeDetails put into scope via stringification
      node: getNodeDetails(node),
    };
  });
}
/* c8 ignore stop */

class IFrameElements extends BaseGatherer {
  /** @type {LH.Gatherer.GathererMeta} */
  meta = {
    supportedModes: ['snapshot', 'navigation'],
  };

  /**
   * @param {LH.Gatherer.Context} passContext
   * @return {Promise<LH.Artifacts['IFrameElements']>}
   * @override
   */
  async getArtifact(passContext) {
    const driver = passContext.driver;

    const iframeElements = await driver.executionContext.evaluate(collectIFrameElements, {
      args: [],
      useIsolation: true,
      deps: [
        pageFunctions.getElementsInDocument,
        pageFunctions.isPositionFixed,
        pageFunctions.getNodeDetails,
      ],
    });
    return iframeElements;
  }
}

export default IFrameElements;
