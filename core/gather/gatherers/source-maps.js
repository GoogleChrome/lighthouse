/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import SDK from '../../lib/cdt/SDK.js';
import BaseGatherer from '../base-gatherer.js';
import Scripts from './scripts.js';

/**
 * @fileoverview Gets JavaScript source maps.
 */
class SourceMaps extends BaseGatherer {
  /** @type {LH.Gatherer.GathererMeta<'Scripts'>} */
  meta = {
    supportedModes: ['timespan', 'navigation'],
    dependencies: {Scripts: Scripts.symbol},
  };

  /**
   * @param {LH.Gatherer.Driver} driver
   * @param {string} sourceMapUrl
   * @return {Promise<LH.Artifacts.RawSourceMap>}
   */
  async fetchSourceMap(driver, sourceMapUrl) {
    const response = await driver.fetcher.fetchResource(sourceMapUrl, {timeout: 1500});
    if (response.content === null) {
      throw new Error(`Failed fetching source map (${response.status})`);
    }
    return SDK.SourceMap.parseSourceMap(response.content);
  }

  /**
   * @param {string} sourceMapURL
   * @return {LH.Artifacts.RawSourceMap}
   */
  parseSourceMapFromDataUrl(sourceMapURL) {
    const buffer = Buffer.from(sourceMapURL.split(',')[1], 'base64');
    return SDK.SourceMap.parseSourceMap(buffer.toString());
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
   * @param {LH.Gatherer.Driver} driver
   * @param {LH.Artifacts.Script} script
   * @return {Promise<LH.Artifacts.SourceMap>}
   */
  async _retrieveMapFromScript(driver, script) {
    if (!script.sourceMapURL) {
      throw new Error('precondition failed: event.sourceMapURL should exist');
    }

    // `sourceMapURL` is simply the URL found in either a magic comment or an x-sourcemap header.
    // It has not been resolved to a base url.
    const isSourceMapADataUri = script.sourceMapURL.startsWith('data:');
    const scriptUrl = script.name;
    const rawSourceMapUrl = isSourceMapADataUri ?
        script.sourceMapURL :
        this._resolveUrl(script.sourceMapURL, script.name);

    if (!rawSourceMapUrl) {
      return {
        scriptId: script.scriptId,
        scriptUrl,
        errorMessage: `Could not resolve map url: ${script.sourceMapURL}`,
      };
    }

    // sourceMapUrl isn't included in the the artifact if it was a data URL.
    const sourceMapUrl = isSourceMapADataUri ? undefined : rawSourceMapUrl;

    try {
      const map = isSourceMapADataUri ?
          this.parseSourceMapFromDataUrl(rawSourceMapUrl) :
          await this.fetchSourceMap(driver, rawSourceMapUrl);

      if (typeof map.version !== 'number') throw new Error('Map has no numeric `version` field');
      if (!Array.isArray(map.sources)) throw new Error('Map has no `sources` list');
      if (typeof map.mappings !== 'string') throw new Error('Map has no `mappings` field');

      if (map.sections) {
        map.sections = map.sections.filter(section => section.map);
      }
      return {
        scriptId: script.scriptId,
        scriptUrl,
        sourceMapUrl,
        map,
      };
    } catch (err) {
      return {
        scriptId: script.scriptId,
        scriptUrl,
        sourceMapUrl,
        errorMessage: err.toString(),
      };
    }
  }

  /**
   * @param {LH.Gatherer.Context<'Scripts'>} context
   * @return {Promise<LH.Artifacts['SourceMaps']>}
   */
  async getArtifact(context) {
    const eventProcessPromises = context.dependencies.Scripts
      .filter(script => script.sourceMapURL)
      .map(script => this._retrieveMapFromScript(context.driver, script));
    return Promise.all(eventProcessPromises);
  }
}

export default SourceMaps;
