/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

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

export {minifyDevtoolsLog};
