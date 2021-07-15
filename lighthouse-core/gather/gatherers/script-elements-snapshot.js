/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* global getNodeDetails getElementsInDocument */

const FRGatherer = require('../../fraggle-rock/gather/base-gatherer.js');
const pageFunctions = require('../../lib/page-functions.js');

/**
 * @return {LH.Artifacts['ScriptElements']}
 */
/* c8 ignore start */
function collectAllScriptElements() {
  /** @type {HTMLScriptElement[]} */
  // @ts-expect-error - getElementsInDocument put into scope via stringification
  const scripts = getElementsInDocument('script');

  return scripts.map(script => {
    return {
      type: script.type || null,
      src: script.src || null,
      id: script.id || null,
      async: script.async,
      defer: script.defer,
      source: script.closest('head') ? 'head' : 'body',
      content: script.src ? null : script.text,
      requestId: null,
      // @ts-expect-error - getNodeDetails put into scope via stringification
      node: getNodeDetails(script),
    };
  });
}
/* c8 ignore stop */

/**
 * @fileoverview Gets JavaScript file contents.
 */
class ScriptElementsSnapshot extends FRGatherer {
  /** @type {LH.Gatherer.GathererMeta} */
  meta = {
    supportedModes: ['snapshot'],
  }

  /**
   * @param {LH.Crdp.Debugger.ScriptParsedEvent} event
   */
  onScriptParsed(event) {
    if (event.embedderName) {
      this._scriptParsedEvents.push(event);
    }
  }

  constructor() {
    super();
    /** @type {LH.Crdp.Debugger.ScriptParsedEvent[]} */
    this._scriptParsedEvents = [];
    this.onScriptParsed = this.onScriptParsed.bind(this);
  }

  /**
   * @param {LH.Gatherer.FRTransitionalContext} context
   */
  async startSensitiveInstrumentation(context) {
    const session = context.driver.defaultSession;
    await session.on('Debugger.scriptParsed', this.onScriptParsed);
    await session.sendCommand('Debugger.enable');
  }

  /**
   * @param {LH.Gatherer.FRTransitionalContext} context
   */
  async stopSensitiveInstrumentation(context) {
    const session = context.driver.defaultSession;
    await session.sendCommand('Debugger.disable');
    await session.off('Debugger.scriptParsed', this.onScriptParsed);
  }

  /**
   * @param {LH.Gatherer.FRTransitionalContext} context
   * @return {Promise<LH.Artifacts['ScriptElements']>}
   */
  async _getArtifact(context) {
    const session = context.driver.defaultSession;
    const executionContext = context.driver.executionContext;

    if (context.gatherMode === 'snapshot') {
      await this.startSensitiveInstrumentation(context);
      await this.stopSensitiveInstrumentation(context);
    }

    const scripts = await executionContext.evaluate(collectAllScriptElements, {
      args: [],
      useIsolation: true,
      deps: [
        pageFunctions.getNodeDetailsString,
        pageFunctions.getElementsInDocument,
      ],
    });

    await session.sendCommand('Debugger.enable');
    await Promise.all(this._scriptParsedEvents.map(async event => {
      const scriptId = event.scriptId;
      const url = event.embedderName;
      if (!url) return;

      const {scriptSource} = await session.sendCommand('Debugger.getScriptSource', {scriptId});
      const matchedScriptElement = scripts.find(script => script.src === url);
      if (matchedScriptElement) {
        matchedScriptElement.content = scriptSource;
      } else {
        scripts.push({
          type: null,
          src: url,
          id: null,
          async: false,
          defer: false,
          source: 'network',
          requestId: null,
          content: scriptSource,
          node: null,
        });
      }
    }));
    await session.sendCommand('Debugger.disable');
    return scripts;
  }

  /**
   * @param {LH.Gatherer.FRTransitionalContext} context
   */
  async getArtifact(context) {
    return this._getArtifact(context);
  }
}

module.exports = ScriptElementsSnapshot;
