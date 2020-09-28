/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
// @ts-lmaonocheck - TODO: cut down on exported artifact properties not needed by audits
'use strict';

const Gatherer = require('./gatherer.js');
const pageFunctions = require('../../lib/page-functions.js');
const TraceProcessor = require('../../lib/tracehouse/trace-processor.js');

/* global window, MutationObserver, document, performance, getNodePath, getOuterHTMLSnippet, getNodeSelector, getNodeLabel */


function setupObserver() {
  // @ts-expect-error ___observedIframes does not exist on window by default
  window.___observedIframes = [];
  // @ts-expect-error ___observer does not exist on window by default
  window.___observer = new MutationObserver((records) => {
    const currTime = performance.now();
    for (const record of records) {
      if (record.type !== 'childList') return;
      const addedNodes = Array.from(record.addedNodes || []);
      if (!addedNodes || !addedNodes.some(node => node.nodeName === 'IFRAME')) return;
      for (const node of addedNodes) {
        if (node.nodeName !== 'IFRAME') continue;
        // TODO: verify that Iframe src is of an ad network / ignore non-ad iframes
        // @ts-expect-error ___observedIframes does not exist on window by default
        window.___observedIframes.push({
          time: currTime,
          // @ts-expect-error - put into scope via stringification
          devtoolsNodePath: getNodePath(node),
          // @ts-expect-error - put into scope via stringification
          snippet: getOuterHTMLSnippet(node),
          // @ts-expect-error - put into scope via stringification
          selector: getNodeSelector(node),
          // @ts-expect-error - put into scope via stringification
          nodeLabel: getNodeLabel(node),
        });
      }
    }
  });
  // @ts-expect-error ___observer does not exist on window by default
  window.___observer.observe(document, {childList: true, subtree: true});
}

/**
 * //@return {Array<LH.Artifacts.DOMTimestamp>}
 */
function getDOMTimestamps() {
  // @ts-expect-error ___observer does not exist on window by default
  window.___observer.disconnect();
  // @ts-expect-error ___observedIframes does not exist on window by default
  return window.___observedIframes;
}

/**
 * @param {LH.Artifacts.TraceOfTab['layoutShiftTimelineEvents']} layoutEvents
 * @return {Array<LH.Artifacts.DOMWindow>}
 */
function getLayoutShiftWindows(layoutEvents) {
  const windows = [];
  let end = undefined;
  let start = undefined;
  for (let i = layoutEvents.length - 1; i >= 0; i--) {
    if (!end && layoutEvents[i].event.name === 'LayoutShift') {
      if (i - 1 >= 0 && layoutEvents[i - 1].event.name === 'UpdateLayerTree') {
        // TODO: have to confirm that the layoutshift happens within ULT
        end = layoutEvents[i - 1].timing;
        i -= 1;
        continue;
      }
    }
    if (end && layoutEvents[i].event.name === 'UpdateLayerTree') {
      start = layoutEvents[i].timing;
      windows.push({start, end});
      end = undefined;
      start = undefined;
    } else if (end && layoutEvents[i].event.name === 'LayoutShift') {
      if (i - 1 >= 0 && layoutEvents[i - 1].event.name === 'UpdateLayerTree') {
        start = layoutEvents[i - 1].timing;
        windows.push({start, end});
        end = layoutEvents[i - 1].timing;
        start = undefined;
        i -= 1;
      }
    }
  }
  return windows;
}

class DOMTimeline extends Gatherer {
  /**
   * @param {LH.Gatherer.PassContext} passContext
   */
  // @ts-expect-error we will not return a phase result
  async beforePass(passContext) {
    const script = `(() => {
      ${pageFunctions.getNodePathString}
      ${pageFunctions.getNodeLabelString}
      ${pageFunctions.getNodeSelectorString}
      ${pageFunctions.getOuterHTMLSnippetString}
      ${setupObserver.toString()
        .replace('function setupObserver() {', '')
        .replace('e});\n}', 'e});')}
    })()`;
    return passContext.driver.evaluateScriptOnNewDocument(script);
  }


  /**
   * @param {LH.Gatherer.PassContext} passContext
   * @param {LH.Gatherer.LoadData} loadData
   * @return {Promise<LH.Artifacts['DOMTimeline']>}
   */
  async afterPass(passContext, loadData) {
    const driver = passContext.driver;
    if (!loadData.trace) {
      throw new Error('Trace is missing!');
    }

    const layoutEvents =
      TraceProcessor.computeTraceOfTab(loadData.trace).layoutShiftTimelineEvents;

    const windows = getLayoutShiftWindows(layoutEvents);

    const expression = `(() => {
      return (${getDOMTimestamps.toString()})();
    })()`;

    const timestamps = await driver.evaluateAsync(expression);

    return {timestamps, windows};
  }
}

module.exports = DOMTimeline;

