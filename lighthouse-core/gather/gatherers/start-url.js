/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Gatherer = require('./gatherer.js');
const URL = require('../../lib/url-shim.js');

/** @typedef {import('../driver.js')} Driver */

class StartUrl extends Gatherer {
  /**
   * Go offline, assess the start url, go back online.
   * @param {LH.Gatherer.PassContext} passContext
   * @return {Promise<LH.Artifacts['StartUrl']>}
   */
  async afterPass(passContext) {
    // `afterPass` is always online, so manually go offline to check start_url.
    await passContext.driver.goOffline();
    const result = await this._determineStartUrlAvailability(passContext);
    await passContext.driver.goOnline(passContext);

    return result;
  }

  /**
   * Grab the manifest, extract its start_url, attempt to `fetch()` it while offline
   * @param {LH.Gatherer.PassContext} passContext
   * @return {Promise<LH.Artifacts['StartUrl']>}
   */
  async _determineStartUrlAvailability(passContext) {
    const WebAppManifest = passContext.baseArtifacts.WebAppManifest;
    const startUrlInfo = this._readManifestStartUrl(WebAppManifest);
    if (startUrlInfo.isReadFailure) {
      return {statusCode: -1, explanation: startUrlInfo.reason};
    }

    try {
      const statusAndExplanation =
        await this._attemptStartURLFetch(passContext.driver, startUrlInfo.startUrl);
      return {url: startUrlInfo.startUrl, ...statusAndExplanation};
    } catch (err) {
      return {
        url: startUrlInfo.startUrl,
        statusCode: -1,
        explanation: 'Error while fetching start_url via service worker.',
      };
    }
  }

  /**
   * Read the parsed manifest and return failure reasons or the startUrl
   * @param {LH.Artifacts.Manifest|null} WebAppManifest
   * @return {{isReadFailure: true, reason: string}|{isReadFailure: false, startUrl: string}}
   */
  _readManifestStartUrl(WebAppManifest) {
    if (!WebAppManifest || !WebAppManifest.value) {
      const detailedMsg = WebAppManifest && WebAppManifest.warning;

      if (detailedMsg) {
        return {isReadFailure: true, reason: `Error fetching web app manifest: ${detailedMsg}.`};
      } else {
        return {isReadFailure: true, reason: `No usable web app manifest found on page.`};
      }
    }

    // Even if the start URL had a parser warning, the browser will still supply a fallback URL.
    return {isReadFailure: false, startUrl: WebAppManifest.value.start_url.value};
  }

  /**
   * Try to `fetch(start_url)`, return true if fetched by SW
   * Resolves when we have a matched network request
   * @param {Driver} driver
   * @param {string} startUrl
   * @return {Promise<{statusCode: number, explanation: string}>}
   */
  _attemptStartURLFetch(driver, startUrl) {
    // TODO(phulce): clean up this setTimeout once the response has happened
    // Wait up to 3s to get a matched network request from the fetch() to work
    const timeoutPromise = new Promise(resolve =>
      setTimeout(
        () => resolve({
          statusCode: -1,
          explanation: `Timed out waiting for start_url (${startUrl}) to respond.`,
        }),
        3000
      )
    );

    const fetchPromise = new Promise(resolve => {
      driver.on('Network.responseReceived', onResponseReceived);

      /** @param {LH.Crdp.Network.ResponseReceivedEvent} responseEvent */
      function onResponseReceived(responseEvent) {
        const {response} = responseEvent;
        // ignore mismatched URLs
        if (!URL.equalWithExcludedFragments(response.url, startUrl)) return;

        driver.off('Network.responseReceived', onResponseReceived);

        if (!response.fromServiceWorker) {
          return resolve({
            statusCode: -1,
            explanation: 'The start_url did respond, but not via a service worker.',
          });
        }
        // SW-served fetch of the start_URL. Note, the status code could be anything.
        return resolve({statusCode: response.status});
      }
    });

    return driver
      .evaluateAsync(`window.location = '${startUrl}'`)
      .then(() => Promise.race([fetchPromise, timeoutPromise]));
  }
}

module.exports = StartUrl;
