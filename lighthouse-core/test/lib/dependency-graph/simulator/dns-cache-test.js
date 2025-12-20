/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const DNSCache = require('../../../../lib/dependency-graph/simulator/dns-cache.js');
const MULTIPLIER = DNSCache.RTT_MULTIPLIER;

/* eslint-env jest */

describe('DependencyGraph/Simulator/DNSCache', () => {
  let dns;
  let request;

  beforeEach(() => {
    dns = new DNSCache({rtt: 100});
    request = {parsedURL: {host: 'example.com'}};
  });

  describe('.getTimeUntilResolution', () => {
    it('should return the RTT multiplied', () => {
      const resolutionTime = dns.getTimeUntilResolution(request);
      expect(resolutionTime).toBe(100 * MULTIPLIER);
    });

    it('should return time with requestedAt', () => {
      const resolutionTime = dns.getTimeUntilResolution(request, {requestedAt: 1500});
      expect(resolutionTime).toBe(100 * MULTIPLIER);
    });

    it('should not cache by default', () => {
      dns.getTimeUntilResolution(request, {requestedAt: 0});
      const resolutionTime = dns.getTimeUntilResolution(request, {requestedAt: 1000});
      expect(resolutionTime).toBe(100 * MULTIPLIER);
    });

    it('should cache when told', () => {
      dns.getTimeUntilResolution(request, {requestedAt: 0, shouldUpdateCache: true});
      const resolutionTime = dns.getTimeUntilResolution(request, {requestedAt: 1000});
      expect(resolutionTime).toBe(0);
    });

    it('should cache by domain', () => {
      dns.getTimeUntilResolution(request, {requestedAt: 0, shouldUpdateCache: true});
      const otherRequest = {parsedURL: {host: 'other-example.com'}};
      const resolutionTime = dns.getTimeUntilResolution(otherRequest, {requestedAt: 1000});
      expect(resolutionTime).toBe(100 * MULTIPLIER);
    });

    it('should not update cache with later times', () => {
      dns.getTimeUntilResolution(request, {requestedAt: 1000, shouldUpdateCache: true});
      dns.getTimeUntilResolution(request, {requestedAt: 1500, shouldUpdateCache: true});
      dns.getTimeUntilResolution(request, {requestedAt: 500, shouldUpdateCache: true});
      dns.getTimeUntilResolution(request, {requestedAt: 5000, shouldUpdateCache: true});

      expect(dns.getTimeUntilResolution(request, {requestedAt: 0})).toBe(100 * MULTIPLIER);
      expect(dns.getTimeUntilResolution(request, {requestedAt: 550})).toBe(100 * MULTIPLIER - 50);
      expect(dns.getTimeUntilResolution(request, {requestedAt: 1000})).toBe(0);
      expect(dns.getTimeUntilResolution(request, {requestedAt: 2000})).toBe(0);
    });
  });

  describe('.setResolvedAt', () => {
    it('should set the DNS resolution time for a record', () => {
      dns.setResolvedAt(request.parsedURL.host, 123);
      const resolutionTime = dns.getTimeUntilResolution(request);
      expect(resolutionTime).toEqual(123);
    });
  });
});
