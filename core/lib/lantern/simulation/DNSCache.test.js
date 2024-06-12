/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Lantern from '../lantern.js';

const {DNSCache} = Lantern.Simulation;

const MULTIPLIER = DNSCache.RTT_MULTIPLIER;

describe('DNSCache', () => {
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
    it('should set the DNS resolution time for a request', () => {
      dns.setResolvedAt(request.parsedURL.host, 123);
      const resolutionTime = dns.getTimeUntilResolution(request);
      expect(resolutionTime).toEqual(123);
    });
  });
});
