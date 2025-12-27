/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
// @ts-nocheck

/* eslint-disable no-console */

import http from 'http';
import zlib from 'zlib';
import path from 'path';
import fs from 'fs';
import {parse as parseQueryString} from 'querystring';
import {parse as parseURL} from 'url';
import {URLSearchParams} from 'url';

import mime from 'mime-types';
import glob from 'glob';

import {LH_ROOT} from '../../../shared/root.js';

const HEADER_SAFELIST = new Set(['x-robots-tag', 'link', 'content-security-policy', 'set-cookie']);
const wasInvokedDirectly = import.meta.main;

class Server {
  baseDir = `${LH_ROOT}/cli/test/fixtures`;

  /**
   * @param {number} port
   */
  constructor(port) {
    this._port = port;
    this._server = http.createServer(this._requestHandler.bind(this));
    /** @type {(data: string) => string=} */
    this._dataTransformer = undefined;
    /** @type {string[]} */
    this._requestUrls = [];
  }

  getPort() {
    return this._server.address().port;
  }

  /**
   * @param {=number} port
   * @param {=string} hostname
   */
  listen(port, hostname) {
    this._server.listen(port, hostname);
    return new Promise((resolve, reject) => {
      this._server.on('listening', resolve);
      this._server.on('error', reject);
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      this._server.close(err => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  /**
   * @param {(data: string) => string=} fn
   */
  setDataTransformer(fn) {
    this._dataTransformer = fn;
  }

  /**
   * @return {string[]}
   */
  takeRequestUrls() {
    const requestUrls = this._requestUrls;
    this._requestUrls = [];
    return requestUrls;
  }

  /**
   * @param {http.IncomingMessage} request
   */
  _updateRequestUrls(request) {
    // Favicon is not fetched in headless mode and robots is not fetched by every test.
    // Ignoring these makes the assertion much simpler.
    if (['/favicon.ico', '/robots.txt'].includes(request.url)) return;
    this._requestUrls.push(request.url);
  }

  /**
   * @param {http.IncomingMessage} request
   * @param {http.ServerResponse} response
   */
  _requestHandler(request, response) {
    const requestUrl = parseURL(request.url);
    this._updateRequestUrls(request);
    const filePath = requestUrl.pathname;
    const queryString = requestUrl.search && parseQueryString(requestUrl.search.slice(1));
    let absoluteFilePath = path.join(this.baseDir, filePath);
    const sendResponse = (statusCode, data) => {
      // Used by Smokerider.
      if (this._dataTransformer) data = this._dataTransformer(data);

      const headers = {
        'Access-Control-Allow-Origin': '*',
        'Origin-Agent-Cluster': '?1',
      };

      // This enables an important test in Smokerider - to check if the universal fetcher
      // used for robots.txt (and source maps) is able to fetch freely while ignoring CORS constraints.
      if (filePath === '/robots.txt') {
        delete headers['Access-Control-Allow-Origin'];
      }

      const contentType = mime.lookup(filePath);
      const charset = mime.lookup(contentType);
      // `mime.contentType` appends the correct charset too.
      // Note: it seems to miss just one case, svg. Doesn't matter much, we'll just allow
      // svgs to fallback to binary encoding. `Content-Type: image/svg+xml` is sufficient for our use case.
      // see https://github.com/jshttp/mime-types/issues/66
      if (contentType) headers['Content-Type'] = mime.contentType(contentType);

      let delay = 0;
      let useGzip = false;
      if (queryString) {
        const params = new URLSearchParams(queryString);
        // set document status-code
        if (params.has('status_code')) {
          statusCode = parseInt(params.get('status_code'), 10);
        }

        // set delay of request when present
        if (params.has('delay')) {
          delay = parseInt(params.get('delay'), 10) || 2000;
        }

        if (params.has('extra_header')) {
          const extraHeaders = new URLSearchParams(params.get('extra_header'));
          for (const [headerName, headerValue] of extraHeaders) {
            if (HEADER_SAFELIST.has(headerName.toLowerCase())) {
              headers[headerName] = headers[headerName] || [];
              headers[headerName].push(headerValue);
            }
          }
        }

        if (params.has('gzip')) {
          useGzip = Boolean(params.get('gzip'));
        }

        // redirect url to new url if present
        if (params.has('redirect')) {
          const redirectsRemaining = Math.max(Number(params.get('redirect_count') || '') - 1, 0);
          const newRedirectsParam = `redirect_count=${redirectsRemaining}`;
          const recursiveRedirectUrl = request.url.replace(/redirect_count=\d+/, newRedirectsParam);
          const redirectUrl = redirectsRemaining ? recursiveRedirectUrl : params.get('redirect');
          return setTimeout(sendRedirect, delay, redirectUrl);
        }
      }

      if (useGzip) {
        data = zlib.gzipSync(data);
        headers['Content-Encoding'] = 'gzip';

        // Set special header for Lightrider, needed for Smokerider.
        // In production LR, this header is set by the production fetcher. For smokerider,
        // a different fetcher is used, so we must set this header here instead, to excercies
        // the parts of the LH netcode that expects this header.
        // This _should_ be the byte size of the entire response
        // (encoded content, headers, chunk overhead, etc.) but - a rough estimate is OK
        // because the smoke test byte expectations have some wiggle room.
        headers['X-TotalFetchedSize'] = Buffer.byteLength(data) + JSON.stringify(headers).length;
      }

      response.statusCode = statusCode;
      for (const [name, value] of Object.entries(headers)) {
        response.setHeader(name, value);
      }
      const encoding = charset === 'UTF-8' ? 'utf-8' : 'binary';

      // Delay the response
      if (delay > 0) {
        return setTimeout(finishResponse, delay, data, encoding);
      }

      finishResponse(data, encoding);
    };

    // Create an index page that lists the available test pages.
    if (filePath === '/') {
      const fixturePaths = glob.sync('**/*.html', {cwd: this.baseDir});
      const html = `
        <html>
        <h1>Smoke test fixtures</h1>
        ${fixturePaths.map(p => `<a href=${encodeURI(p)}>${escape(p)}</a>`).join('<br>')}
      `;
      response.statusCode = 200;
      response.setHeader('Content-Security-Policy', `default-src 'none';`);
      sendResponse(200, html);
      return;
    }

    if (filePath.startsWith('/dist/gh-pages')) {
      // Rewrite viewer paths to point to that location.
      absoluteFilePath = path.join(this.baseDir, '/../../../', filePath);
    }

    // Disallow file requests outside of LH folder
    const filePathDir = path.parse(absoluteFilePath).dir;
    if (!filePathDir.startsWith(LH_ROOT)) {
      return readFileCallback(new Error('Disallowed path'));
    }

    // Check if the file exists, then read it and serve it.
    fs.exists(absoluteFilePath, fsExistsCallback);

    function fsExistsCallback(fileExists) {
      if (!fileExists) {
        return sendResponse(404, `404 - File not found. ${filePath}`);
      }
      fs.readFile(absoluteFilePath, 'binary', readFileCallback);
    }

    function readFileCallback(err, file) {
      if (err) {
        console.error('Unable to read local file %s:', absoluteFilePath, err);
        return sendResponse(500, '500 - Internal Server Error');
      }
      sendResponse(200, file);
    }

    function sendRedirect(url) {
      // Redirects can only contain ASCII characters.
      if (url.split('').some(char => char.charCodeAt(0) > 256)) {
        response.statusCode = 500;
        response.write(`Invalid redirect URL: ${url}`);
        response.end();
        return;
      }

      response.statusCode = 302;
      response.setHeader('Location', url);
      response.end();
    }

    function finishResponse(data, encoding) {
      response.write(data, encoding);
      response.end();
    }
  }
}

async function createServers() {
  const servers = [10200, 10503, 10420].map(port => {
    const server = new Server(port);
    server._server.on('error', e => console.error(e.message));
    if (wasInvokedDirectly) {
      server._server.on('listening', _ => console.log(`listening on http://localhost:${port}`));
    }
    return server;
  });

  const outcomes = await Promise.allSettled(servers.map(s => s.listen(s._port, 'localhost')));
  if (outcomes.some(o => o.status === 'rejected')) {
    if (outcomes.every(o => o.reason.message.includes('already'))) {
      console.warn('😧 Server already up. Continuing…');
    } else {
      console.error(outcomes.map(o => o.reason));
      throw new Error('One or more servers did not start correctly');
    }
  }
  return servers;
}

// If called directly (such as via `yarn static-server`) then start all of the servers.
if (wasInvokedDirectly) {
  createServers();
}

export {
  Server,
  createServers,
};
