/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* global caches */

const Gatherer = require('./gatherer.js');

/**
 * This is run in the page, not Lighthouse itself.
 * @return {Promise<Array<string>>}
 */
/* istanbul ignore next */
function getCacheContents() {
  // Get every cache by name.
  return caches.keys()

      // Open each one.
      .then(cacheNames => Promise.all(cacheNames.map(cacheName => caches.open(cacheName))))

      .then(caches => {
        /** @type {Array<string>} */
        const requests = [];

        // Take each cache and get any requests is contains, and bounce each one down to its URL.
        return Promise.all(caches.map(cache => {
          return cache.keys()
              .then(reqs => {
                requests.push(...reqs.map(r => r.url));
              });
        })).then(_ => {
          return requests;
        });
      });
}

class CacheContents extends Gatherer {
  /**
   * Creates an array of cached URLs.
   * @param {LH.Gatherer.PassContext} passContext
   * @return {Promise<LH.Artifacts['CacheContents']>}
   */
  async afterPass(passContext) {
    const driver = passContext.driver;

    /** @type {Array<string>|void} */
    const cacheUrls = await driver.evaluateAsync(`(${getCacheContents.toString()}())`);
    if (!cacheUrls || !Array.isArray(cacheUrls)) {
      throw new Error('Unable to retrieve cache contents');
    }

    return cacheUrls;
  }
}

module.exports = CacheContents;
