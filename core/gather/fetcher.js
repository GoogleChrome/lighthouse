/**
 * @license Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import log from 'lighthouse-logger';

import * as LH from '../../types/lh.js';
import {ProtocolSession} from './session.js';

/**
 * @fileoverview Fetcher is a utility for making requests to any arbitrary resource,
 * ignoring normal browser constraints such as CORS.
 */

/** @typedef {{content: string|null, status: number|null, headers?: Record<string, string>|null}} FetchResponse */

class Fetcher {
  /**
   * @param {LH.Gatherer.ProtocolSession} session
   * @param {LH.Puppeteer.Connection} [connection] Used to fetch resources that are not governed by the page (see `siteWide` in `fetchResource`).
   */
  constructor(session, connection) {
    this.session = session;
    this._connection = connection;
  }

  /**
   * Fetches any resource using the network directly.
   *
   * By default the fetch runs in the page's context, so the page's Content Security
   * Policy applies. Set `siteWide: true` for resources that are not the page's to
   * govern (e.g. `/robots.txt`); these are fetched from a target that does not
   * inherit the page's policy.
   *
   * @param {string} url
   * @param {{timeout?: number, siteWide?: boolean}=} options timeout is in ms
   * @return {Promise<FetchResponse>}
   */
  async fetchResource(url, options = {}) {
    const {timeout = 2_000, siteWide = false} = options;

    // In Lightrider, `Network.loadNetworkResource` is not implemented, but fetch
    // is configured to work for any resource.
    if (global.isLightrider) {
      return this._wrapWithTimeout(this._fetchWithFetchApi(url), timeout);
    }

    if (siteWide) {
      return this._fetchSiteWideResource(url, {timeout});
    }

    return this._fetchResourceOverProtocol(url, {timeout});
  }

  /**
   * @param {Headers|Record<string, string|number|boolean>|null|undefined} rawHeaders
   * @return {Record<string, string>|null}
   */
  _normalizeHeaders(rawHeaders) {
    if (!rawHeaders) return null;

    /** @type {Record<string, string>} */
    const headers = {};
    const entries = typeof /** @type {Headers} */ (rawHeaders).entries === 'function' ?
    /** @type {Headers} */ (rawHeaders).entries() :
      Object.entries(rawHeaders);

    for (const [key, value] of entries) {
      headers[key.toLowerCase()] = String(value);
    }

    return headers;
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

    const headers = this._normalizeHeaders(response.headers);

    return {
      content,
      status: response.status,
      headers,
    };
  }

  /**
   * @param {string} handle
   * @param {{timeout: number}=} options
   * @param {LH.Gatherer.ProtocolSession=} session
   * @return {Promise<string>}
   */
  async _readIOStream(handle, options = {timeout: 2_000}, session = this.session) {
    const startTime = Date.now();

    let ioResponse;
    let data = '';
    while (!ioResponse || !ioResponse.eof) {
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime > options.timeout) {
        throw new Error('Waiting for the end of the IO stream exceeded the allotted time.');
      }
      ioResponse = await session.sendCommand('IO.read', {handle});
      const responseData = ioResponse.base64Encoded ?
        Buffer.from(ioResponse.data, 'base64').toString('utf-8') :
        ioResponse.data;
      data = data.concat(responseData);
    }

    return data;
  }

  /**
   * @param {string} url
   * @param {LH.Gatherer.ProtocolSession=} session
   * @return {Promise<{stream: LH.Crdp.IO.StreamHandle|null, status: number|null, headers?: Record<string, string>|null}>}
   */
  async _loadNetworkResource(url, session = this.session) {
    const frameTreeResponse = await session.sendCommand('Page.getFrameTree');
    const networkResponse = await session.sendCommand('Network.loadNetworkResource', {
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
      headers: networkResponse.resource.headers || null,
    };
  }

  /**
   * @param {string} url
   * @param {{timeout: number}} options timeout is in ms
   * @param {LH.Gatherer.ProtocolSession=} session
   * @return {Promise<FetchResponse>}
   */
  async _fetchResourceOverProtocol(url, options, session = this.session) {
    const startTime = Date.now();
    const response =
      await this._wrapWithTimeout(this._loadNetworkResource(url, session), options.timeout);

    const headers = this._normalizeHeaders(response.headers);

    const isOk = response.status && response.status >= 200 && response.status <= 299;
    if (!response.stream || !isOk) return {status: response.status, content: null, headers};

    const timeout = options.timeout - (Date.now() - startTime);
    const content = await this._readIOStream(response.stream, {timeout}, session);
    return {status: response.status, content, headers};
  }

  /**
   * Fetches a site-wide resource (e.g. `/robots.txt`) without being subject to the
   * page's Content Security Policy. `Network.loadNetworkResource` enforces the
   * policy of the frame it is invoked on, so the fetch is performed from an
   * auxiliary `about:blank` target, which is closed when the fetch completes.
   *
   * Some embedders don't support creating targets (e.g. Firefox remote debugging);
   * in that case fall back to fetching from the page context.
   *
   * @param {string} url
   * @param {{timeout: number}} options timeout is in ms
   * @return {Promise<FetchResponse>}
   */
  async _fetchSiteWideResource(url, options) {
    const connection = this._connection;
    if (connection) {
      try {
        return await this._fetchFromAuxTarget(connection, url, options);
      } catch (err) {
        log.verbose('Fetcher', `could not fetch ${url} from an auxiliary target`, err);
      }
    }

    return this._fetchResourceOverProtocol(url, options);
  }

  /**
   * @param {LH.Puppeteer.Connection} connection
   * @param {string} url
   * @param {{timeout: number}} options timeout is in ms
   * @return {Promise<FetchResponse>}
   */
  async _fetchFromAuxTarget(connection, url, options) {
    /** @type {string|undefined} */
    let targetId;
    try {
      ({targetId} = await connection.send('Target.createTarget', {
        url: 'about:blank',
        background: true,
      }));
      const {sessionId} = await connection.send('Target.attachToTarget', {
        targetId,
        flatten: true,
      });

      // The connection registers the new session when it processes the attach
      // event, which arrives before the command's response, but poll briefly just in case.
      /** @type {LH.Puppeteer.CDPSession|null} */
      let cdpSession = connection.session(sessionId);
      for (let attempt = 0; !cdpSession && attempt < 10; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 50));
        cdpSession = connection.session(sessionId);
      }
      if (!cdpSession) {
        throw new Error(`Could not attach to auxiliary target ${targetId}`);
      }

      const session = new ProtocolSession(cdpSession);
      return await this._fetchResourceOverProtocol(url, options, session);
    } finally {
      if (targetId) {
        await connection.send('Target.closeTarget', {targetId}).catch(() => {});
      }
    }
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
