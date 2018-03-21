/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Gatherer = require('./gatherer');
const manifestParser = require('../../lib/manifest-parser');

class StartUrl extends Gatherer {
  readManifest(manifest) {
    if (!manifest || !manifest.value) {
      const detailedMsg = manifest && manifest.debugString;

      if (detailedMsg) {
        const debugString = `Error fetching web app manifest: ${detailedMsg}`;
        return {
          statusCode: -1,
          debugString,
        };
      } else {
        const debugString = `No usable web app manifest found on page`;
        return {
          statusCode: -1,
          debugString,
        };
      }
    }

    if (manifest.value.start_url.debugString) {
      // Even if the start URL had an error, the browser will still supply a fallback URL.
      // Therefore, we only set the debugString here and continue with the fetch.
      return {
        statusCode: -1,
        debugString: manifest.value.start_url.debugString,
      };
    }

    return {
      statusCode: 1,
      startUrl: manifest.value.start_url.value,
    };
  }

  attemptManifestFetch(options, startUrl) {
    return new Promise(resolve => {
      const driver = options.driver;
      driver.on('Network.responseReceived', responseReceived);

      driver.goOffline(options)
        .then(() => this.executeFetchRequest(driver, startUrl))
        .then(() => driver.goOnline(options));

      function responseReceived({response}) {
        // ignore mismatched URLs
        if (response.url !== startUrl) return;

        driver.off('Network.responseReceived', responseReceived);

        if (!response.fromServiceWorker) {
          return resolve({
            statusCode: -1,
            debugString: 'Unable to fetch start URL via service worker',
          });
        }

        return resolve({
          statusCode: response.status,
          debugString: '',
        });
      }
    });
  }

  executeFetchRequest(driver, url) {
    return driver.evaluateAsync(
      `fetch('${url}')`
    );
  }


  afterPass(options) {
    return options.driver.goOnline(options)
      .then(() => options.driver.getAppManifest())
      .then(response => response && manifestParser(response.data, response.url, options.url))
      .then(manifest => {
        const {statusCode, debugString, startUrl} = this.readManifest(manifest);
        if (statusCode === -1) {
          return {statusCode, debugString};
        }

        return this.attemptManifestFetch(options, startUrl);
      }).catch(() => {
        return {
          statusCode: -1,
          debugString: 'Unable to fetch start URL via service worker',
        };
      });
  }
}

module.exports = StartUrl;
