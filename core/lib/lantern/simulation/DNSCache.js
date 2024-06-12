/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Lantern from '../lantern.js';

// A DNS lookup will usually take ~1-2 roundtrips of connection latency plus the extra DNS routing time.
// Example: https://www.webpagetest.org/result/180703_3A_e33ec79747c002ed4d7bcbfc81462203/1/details/#waterfall_view_step1
// Example: https://www.webpagetest.org/result/180707_1M_89673eb633b5d98386de95dfcf9b33d5/1/details/#waterfall_view_step1
// DNS is highly variable though, many times it's a little more than 1, but can easily be 4-5x RTT.
// We'll use 2 since it seems to give the most accurate results on average, but this can be tweaked.
const DNS_RESOLUTION_RTT_MULTIPLIER = 2;

class DNSCache {
  /**
   * @param {{rtt: number}} options
   */
  constructor({rtt}) {
    this._rtt = rtt;

    /** @type {Map<string, {resolvedAt: number}>} */
    this._resolvedDomainNames = new Map();
  }

  /**
   * @param {Lantern.NetworkRequest} request
   * @param {{requestedAt: number, shouldUpdateCache: boolean}=} options
   * @return {number}
   */
  getTimeUntilResolution(request, options) {
    const {requestedAt = 0, shouldUpdateCache = false} = options || {};

    const domain = request.parsedURL.host;
    const cacheEntry = this._resolvedDomainNames.get(domain);
    let timeUntilResolved = this._rtt * DNSCache.RTT_MULTIPLIER;
    if (cacheEntry) {
      const timeUntilCachedIsResolved = Math.max(cacheEntry.resolvedAt - requestedAt, 0);
      timeUntilResolved = Math.min(timeUntilCachedIsResolved, timeUntilResolved);
    }

    const resolvedAt = requestedAt + timeUntilResolved;
    if (shouldUpdateCache) this._updateCacheResolvedAtIfNeeded(request, resolvedAt);

    return timeUntilResolved;
  }

  /**
   * @param {Lantern.NetworkRequest} request
   * @param {number} resolvedAt
   */
  _updateCacheResolvedAtIfNeeded(request, resolvedAt) {
    const domain = request.parsedURL.host;
    const cacheEntry = this._resolvedDomainNames.get(domain) || {resolvedAt};
    cacheEntry.resolvedAt = Math.min(cacheEntry.resolvedAt, resolvedAt);
    this._resolvedDomainNames.set(domain, cacheEntry);
  }

  /**
   * Forcefully sets the DNS resolution time for a request.
   * Useful for testing and alternate execution simulations.
   *
   * @param {string} domain
   * @param {number} resolvedAt
   */
  setResolvedAt(domain, resolvedAt) {
    this._resolvedDomainNames.set(domain, {resolvedAt});
  }
}

DNSCache.RTT_MULTIPLIER = DNS_RESOLUTION_RTT_MULTIPLIER;

export {DNSCache};
