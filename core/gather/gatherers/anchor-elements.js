/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* global getNodeDetails */

import BaseGatherer from '../base-gatherer.js';
import {pageFunctions} from '../../lib/page-functions.js';
import {resolveDevtoolsNodePathToObjectId} from '../driver/dom.js';

/* eslint-env browser, node */

/**
 * Function that is stringified and run in the page to collect anchor elements.
 * Additional complexity is introduced because anchors can be HTML or SVG elements.
 *
 * We use this evaluateAsync method because the `node.getAttribute` method doesn't actually normalize
 * the values like access from JavaScript in-page does.
 *
 * @return {LH.Artifacts['AnchorElements']}
 */
/* c8 ignore start */
function collectAnchorElements() {
  /** @param {string} url */
  const resolveURLOrEmpty = url => {
    try {
      return new URL(url, window.location.href).href;
    } catch (_) {
      return '';
    }
  };

  /** @param {HTMLAnchorElement|SVGAElement} node */
  function getTruncatedOnclick(node) {
    const onclick = node.getAttribute('onclick') || '';
    return onclick.slice(0, 1024);
  }

  /** @type {Array<HTMLAnchorElement|SVGAElement>} */
  // @ts-expect-error - put into scope via stringification
  const anchorElements = getElementsInDocument('a'); // eslint-disable-line no-undef

  return anchorElements.map(node => {
    if (node instanceof HTMLAnchorElement) {
      return {
        href: node.href,
        rawHref: node.getAttribute('href') || '',
        onclick: getTruncatedOnclick(node),
        role: node.getAttribute('role') || '',
        name: node.name,
        text: node.innerText, // we don't want to return hidden text, so use innerText
        rel: node.rel,
        target: node.target,
        id: node.getAttribute('id') || '',
        // @ts-expect-error - getNodeDetails put into scope via stringification
        node: getNodeDetails(node),
      };
    }

    return {
      href: resolveURLOrEmpty(node.href.baseVal),
      rawHref: node.getAttribute('href') || '',
      onclick: getTruncatedOnclick(node),
      role: node.getAttribute('role') || '',
      text: node.textContent || '',
      rel: '',
      target: node.target.baseVal || '',
      id: node.getAttribute('id') || '',
      // @ts-expect-error - getNodeDetails put into scope via stringification
      node: getNodeDetails(node),
    };
  });
}
/* c8 ignore stop */

/**
 * @param {LH.Gatherer.ProtocolSession} session
 * @param {string} devtoolsNodePath
 * @return {Promise<Array<{type: string}>>}
 */
async function getEventListeners(session, devtoolsNodePath) {
  const objectId = await resolveDevtoolsNodePathToObjectId(session, devtoolsNodePath);
  if (!objectId) return [];

  const response = await session.sendCommand('DOMDebugger.getEventListeners', {
    objectId,
  });

  return response.listeners.map(({type}) => ({type}));
}

class AnchorElements extends BaseGatherer {
  /** @type {LH.Gatherer.GathererMeta} */
  meta = {
    supportedModes: ['snapshot', 'navigation'],
  };

  /**
   * @param {LH.Gatherer.Context} passContext
   * @return {Promise<LH.Artifacts['AnchorElements']>}
   */
  async getArtifact(passContext) {
    const session = passContext.driver.defaultSession;

    const anchors = await passContext.driver.executionContext.evaluate(collectAnchorElements, {
      args: [],
      useIsolation: true,
      deps: [
        pageFunctions.getElementsInDocument,
        pageFunctions.getNodeDetails,
      ],
    });
    await session.sendCommand('DOM.enable');

    // DOM.getDocument is necessary for pushNodesByBackendIdsToFrontend to properly retrieve nodeIds if the `DOM` domain was enabled before this gatherer, invoke it to be safe.
    await session.sendCommand('DOM.getDocument', {depth: -1, pierce: true});
    const anchorsWithEventListeners = anchors.map(async anchor => {
      const listeners = await getEventListeners(session, anchor.node.devtoolsNodePath);

      return {
        ...anchor,
        listeners,
      };
    });

    const result = await Promise.all(anchorsWithEventListeners);
    await session.sendCommand('DOM.disable');
    return result;
  }
}

export default AnchorElements;
