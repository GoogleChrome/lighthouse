/**
 * @license Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as LH from '../../types/lh.js';

/**
 * @fileoverview Fetcher is a utility for making requests to any arbitrary resource,
 * ignoring normal browser constraints such as CORS.
 */

/** @typedef {{content: string|null, status: number|null}} FetchResponse */

class Fetcher {
  /**
   * @param {LH.Gatherer.ProtocolSession} session
   */
  constructor(session) {
    this.session = session;
  }

  /**
   * Fetches any resource using the network directly.
   *
   * @param {string} url
   * @param {{timeout: number}=} options timeout is in ms
   * @return {Promise<FetchResponse>}
   */
  async fetchResource(url, options = {timeout: 2_000}) {
    // In Lightrider, `Network.loadNetworkResource` is not implemented, but fetch
    // is configured to work for any resource.
    if (global.isLightrider) {
      return this._wrapWithTimeout(this._fetchWithFetchApi(url), options.timeout);
    }

    return this._fetchResourceOverProtocol(url, options);
  }

  /**
   * @param {string} url
   * @return {Promise<FetchResponse>}
   */
  async _fetchWithFetchApi(url) {
    const response = await fetch(url);

    let content = null;
    try {
      content = await response.text();
    } catch {}

    return {
      content,
      status: response.status,
    };
  }

  /**
   * @param {string} handle
   * @param {{timeout: number}=} options,
   * @return {Promise<string>}
   */
  async _readIOStream(handle, options = {timeout: 2_000}) {
    const startTime = Date.now();

    let ioResponse;
    let data = '';
    while (!ioResponse || !ioResponse.eof) {
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime > options.timeout) {
        throw new Error('Waiting for the end of the IO stream exceeded the allotted time.');
      }
      ioResponse = await this.session.sendCommand('IO.read', {handle});
      const responseData = ioResponse.base64Encoded ?
        Buffer.from(ioResponse.data, 'base64').toString('utf-8') :
        ioResponse.data;
      data = data.concat(responseData);
    }

    return data;
  }

  /**
   * @param {string} url
   * @return {Promise<{stream: LH.Crdp.IO.StreamHandle|null, status: number|null}>}
   */
  async _loadNetworkResource(url) {
    const frameTreeResponse = await this.session.sendCommand('Page.getFrameTree');
    const networkResponse = await this.session.sendCommand('Network.loadNetworkResource', {
      frameId: frameTreeResponse.frameTree.frame.id,
      url,
      options: {
        disableCache: true,
        includeCredentials: true,
      },
    });

    return {
      stream: networkResponse.resource.success ? (networkResponse.resource.stream || null) : null,
      status: networkResponse.resource.httpStatusCode || null,
    };
  }

  /**
   * @param {string} url
   * @param {{timeout: number}} options timeout is in ms
   * @return {Promise<FetchResponse>}
   */
  async _fetchResourceOverProtocol(url, options) {
    const startTime = Date.now();
    const response = await this._wrapWithTimeout(this._loadNetworkResource(url), options.timeout);

    const isOk = response.status && response.status >= 200 && response.status <= 299;
    if (!response.stream || !isOk) return {status: response.status, content: null};

    const timeout = options.timeout - (Date.now() - startTime);
    const content = await this._readIOStream(response.stream, {timeout});
    return {status: response.status, content};
  }

  /**
   * @template T
   * @param {Promise<T>} promise
   * @param {number} ms
   */
  async _wrapWithTimeout(promise, ms) {
    /** @type {NodeJS.Timeout} */
    let timeoutHandle;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutHandle = setTimeout(reject, ms, new Error('Timed out fetching resource'));
    });

    /** @type {Promise<T>} */
    const wrappedPromise = await Promise.race([promise, timeoutPromise])
      .finally(() => clearTimeout(timeoutHandle));
    return wrappedPromise;
  }
}

export {Fetcher};
