/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import BaseGatherer from '../base-gatherer.js';

/**
 * @return {Promise<Array<string>>}
 */
/* c8 ignore start */
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
/* c8 ignore stop */

class CacheContents extends BaseGatherer {
  /** @type {LH.Gatherer.GathererMeta} */
  meta = {
    supportedModes: ['snapshot', 'navigation'],
  };

  /**
   * Creates an array of cached URLs.
   * @param {LH.Gatherer.Context} passContext
   * @return {Promise<LH.Artifacts['CacheContents']>}
   */
  async getArtifact(passContext) {
    const driver = passContext.driver;

    const cacheUrls = await driver.executionContext.evaluate(getCacheContents, {args: []});
    return cacheUrls;
  }
}

export default CacheContents;
