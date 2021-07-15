/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const FRGatherer = require('../../fraggle-rock/gather/base-gatherer.js');
const dom = require('../driver/dom.js');
const {getElementsInDocument, getNodeDetails} = require('../../lib/page-functions.js');

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

  // Manually widen type to include SVG. See https://github.com/GoogleChrome/lighthouse/issues/12011.
  /** @type {Array<HTMLAnchorElement|SVGAElement>} */
  const anchorElements = getElementsInDocument('a');

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
      node: getNodeDetails(node),
    };
  });
}
/* c8 ignore stop */

/**
 * @param {LH.Gatherer.FRProtocolSession} session
 * @param {string} devtoolsNodePath
 * @return {Promise<Array<{type: string}>>}
 */
async function getEventListeners(session, devtoolsNodePath) {
  const objectId = await dom.resolveDevtoolsNodePathToObjectId(session, devtoolsNodePath);
  if (!objectId) return [];

  const response = await session.sendCommand('DOMDebugger.getEventListeners', {
    objectId,
  });

  return response.listeners.map(({type}) => ({type}));
}

class AnchorElements extends FRGatherer {
  /** @type {LH.Gatherer.GathererMeta} */
  meta = {
    supportedModes: ['snapshot', 'navigation'],
  }

  /**
   * @param {LH.Gatherer.FRTransitionalContext} passContext
   * @return {Promise<LH.Artifacts['AnchorElements']>}
   */
  async getArtifact(passContext) {
    const session = passContext.driver.defaultSession;

    const anchors = await passContext.driver.executionContext.evaluate(collectAnchorElements, {
      args: [],
      useIsolation: true,
      deps: [
        getElementsInDocument,
        getNodeDetails,
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

module.exports = AnchorElements;
