/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-disable no-console */

/**
 * @fileoverview Minifies a devtools log by removing noisy header values, eliminating data URIs, etc.
 */

const headersToKeep = new Set([
  // Request headers
  'accept',
  'accept-encoding',
  'accept-ranges',
  // Response headers
  'status',
  'content-length',
  'content-type',
  'content-encoding',
  'content-range',
  'etag',
  'cache-control',
  'last-modified',
  'link',
  'x-robots-tag',
]);

/** @param {LH.Crdp.Network.Headers} [headers] */
function cleanHeaders(headers) {
  if (!headers) return;

  for (const key of Object.keys(headers)) {
    if (!headersToKeep.has(key.toLowerCase())) delete headers[key];
  }
}

/** @param {{url: string}} obj */
function cleanDataURI(obj) {
  obj.url = obj.url.replace(/^(data:.*?base64,).*/, '$1FILLER');
}

/** @param {LH.Crdp.Network.Response} [response] */
function cleanResponse(response) {
  if (!response) return;
  cleanDataURI(response);
  cleanHeaders(response.requestHeaders);
  cleanHeaders(response.headers);
  response.securityDetails = undefined;
  response.headersText = undefined;
  response.requestHeadersText = undefined;

  /** @type {any} */
  const timing = response.timing || {};
  for (const [k, v] of Object.entries(timing)) {
    if (v === -1) timing[k] = undefined;
  }
}

/**
 * @param {LH.DevtoolsLog} log
 * @return {LH.DevtoolsLog}
 */
function minifyDevtoolsLog(log) {
  return log.map(original => {
    /** @type {LH.Protocol.RawEventMessage} */
    const entry = JSON.parse(JSON.stringify(original));

    switch (entry.method) {
      case 'Network.requestWillBeSent':
        cleanDataURI(entry.params.request);
        cleanHeaders(entry.params.request.headers);
        cleanResponse(entry.params.redirectResponse);
        break;
      case 'Network.responseReceived':
        cleanResponse(entry.params.response);
        break;
    }

    return entry;
  });
}

module.exports = {minifyDevtoolsLog};
