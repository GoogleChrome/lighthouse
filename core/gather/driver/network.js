/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {NetworkRequest} from '../../lib/network-request.js';

/**
 * Return the body of the response with the given ID. Rejects if getting the
 * body times out.
 * @param {LH.Gatherer.ProtocolSession} session
 * @param {string} requestId
 * @param {number} [timeout]
 * @return {Promise<string>}
 */
async function fetchResponseBodyFromCache(session, requestId, timeout = 1000) {
  requestId = NetworkRequest.getRequestIdForBackend(requestId);

  // Encoding issues may lead to hanging getResponseBody calls: https://github.com/GoogleChrome/lighthouse/pull/4718
  // session.sendCommand will handle timeout after 1s.
  session.setNextProtocolTimeout(timeout);
  const result = await session.sendCommand('Network.getResponseBody', {requestId});
  return result.body;
}

export {fetchResponseBodyFromCache};
