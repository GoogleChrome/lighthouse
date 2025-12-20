/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/** @typedef {import('../driver.js')} Driver */

const Gatherer = require('./gatherer.js');
const URL = require('../../lib/url-shim.js');

/**
 * @fileoverview Gets JavaScript source maps.
 */
class SourceMaps extends Gatherer {
  constructor() {
    super();
    /** @type {LH.Crdp.Debugger.ScriptParsedEvent[]} */
    this._scriptParsedEvents = [];
    this.onScriptParsed = this.onScriptParsed.bind(this);
  }

  /**
   * @param {Driver} driver
   * @param {string} sourceMapUrl
   * @return {Promise<LH.Artifacts.RawSourceMap>}
   */
  async fetchSourceMap(driver, sourceMapUrl) {
    /** @type {string} */
    const sourceMapJson = await driver.fetcher.fetchResource(sourceMapUrl, {timeout: 1500});
    return JSON.parse(sourceMapJson);
  }

  /**
   * @param {string} sourceMapURL
   * @return {LH.Artifacts.RawSourceMap}
   */
  parseSourceMapFromDataUrl(sourceMapURL) {
    const buffer = Buffer.from(sourceMapURL.split(',')[1], 'base64');
    return JSON.parse(buffer.toString());
  }

  /**
   * @param {LH.Crdp.Debugger.ScriptParsedEvent} event
   */
  onScriptParsed(event) {
    if (event.sourceMapURL) {
      this._scriptParsedEvents.push(event);
    }
  }

  /**
   * @param {LH.Gatherer.PassContext} passContext
   */
  async beforePass(passContext) {
    const driver = passContext.driver;
    driver.on('Debugger.scriptParsed', this.onScriptParsed);
    await driver.sendCommand('Debugger.enable');
  }

  /**
   * @param {string} url
   * @param {string} base
   * @return {string|undefined}
   */
  _resolveUrl(url, base) {
    try {
      return new URL(url, base).href;
    } catch (e) {
      return;
    }
  }

  /**
   * @param {Driver} driver
   * @param {LH.Crdp.Debugger.ScriptParsedEvent} event
   * @return {Promise<LH.Artifacts.SourceMap>}
   */
  async _retrieveMapFromScriptParsedEvent(driver, event) {
    if (!event.sourceMapURL) {
      throw new Error('precondition failed: event.sourceMapURL should exist');
    }

    // `sourceMapURL` is simply the URL found in either a magic comment or an x-sourcemap header.
    // It has not been resolved to a base url.
    const isSourceMapADataUri = event.sourceMapURL.startsWith('data:');
    const scriptUrl = event.url;
    const rawSourceMapUrl = isSourceMapADataUri ?
        event.sourceMapURL :
        this._resolveUrl(event.sourceMapURL, event.url);

    if (!rawSourceMapUrl) {
      return {
        scriptUrl,
        errorMessage: `Could not resolve map url: ${event.sourceMapURL}`,
      };
    }

    // sourceMapUrl isn't included in the the artifact if it was a data URL.
    const sourceMapUrl = isSourceMapADataUri ? undefined : rawSourceMapUrl;

    try {
      const map = isSourceMapADataUri ?
          this.parseSourceMapFromDataUrl(rawSourceMapUrl) :
          await this.fetchSourceMap(driver, rawSourceMapUrl);
      if (map.sections) {
        map.sections = map.sections.filter(section => section.map);
      }
      return {
        scriptUrl,
        sourceMapUrl,
        map,
      };
    } catch (err) {
      return {
        scriptUrl,
        sourceMapUrl,
        errorMessage: err.toString(),
      };
    }
  }

  /**
   * @param {LH.Gatherer.PassContext} passContext
   * @return {Promise<LH.Artifacts['SourceMaps']>}
   */
  async afterPass(passContext) {
    const driver = passContext.driver;

    driver.off('Debugger.scriptParsed', this.onScriptParsed);
    await driver.sendCommand('Debugger.disable');

    await driver.fetcher.enableRequestInterception();
    const eventProcessPromises = this._scriptParsedEvents
      .map((event) => this._retrieveMapFromScriptParsedEvent(driver, event));
    return Promise.all(eventProcessPromises);
  }
}

module.exports = SourceMaps;
