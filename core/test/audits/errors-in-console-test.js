/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import ErrorLogsAudit from '../../audits/errors-in-console.js';

describe('ConsoleMessages error logs audit', () => {
  it('passes when no console messages were found', async () => {
    const context = {options: {}, computedCache: new Map()};
    const auditResult = await ErrorLogsAudit.audit({
      ConsoleMessages: [],
      SourceMaps: [],
      Scripts: [],
    }, context);
    assert.equal(auditResult.score, 1);
    assert.ok(!auditResult.displayValue, 0);
    assert.equal(auditResult.details.items.length, 0);
  });

  it('filter out the non error logs', async () => {
    const context = {options: {}, computedCache: new Map()};
    const auditResult = await ErrorLogsAudit.audit({
      ConsoleMessages: [
        {
          level: 'info',
          source: 'network',
          text: 'This is a simple info msg',
        },
      ],
      SourceMaps: [],
      Scripts: [],
    }, context);
    assert.equal(auditResult.score, 1);
    assert.equal(auditResult.details.items.length, 0);
  });

  it('fails when error logs are found ', async () => {
    const context = {options: {}, computedCache: new Map()};
    const auditResult = await ErrorLogsAudit.audit({
      ConsoleMessages: [
        {
          level: 'error',
          source: 'network',
          text: 'The server responded with a status of 404 (Not Found)',
          url: 'http://www.example.com/favicon.ico',
        }, {
          level: 'error',
          source: 'network',
          text: 'WebSocket connection failed: Unexpected response code: 500',
          url: 'http://www.example.com/wsconnect.ws',
        },
        {
          'timestamp': 1506535813608.003,
          'source': 'exception',
          'level': 'error',
          'text': 'TypeError: Cannot read property \'msie\' of undefined',
          'url': 'http://example.com/fancybox.js',
          'stackTrace': {
            'callFrames': [
              {
                'url': 'http://example.com/fancybox.js',
                'lineNumber': 28,
                'columnNumber': 20,
              },
            ],
          },
        },
      ],
      SourceMaps: [],
      Scripts: [],
    }, context);

    assert.equal(auditResult.score, 0);
    assert.equal(auditResult.details.items.length, 3);
    assert.equal(
      auditResult.details.items[0].sourceLocation.url, 'http://www.example.com/favicon.ico');
    assert.equal(auditResult.details.items[0].description,
      'The server responded with a status of 404 (Not Found)');
    assert.equal(auditResult.details.items[1].sourceLocation.url,
      'http://example.com/fancybox.js');
    assert.equal(auditResult.details.items[1].description,
      'TypeError: Cannot read property \'msie\' of undefined');
    assert.equal(
      auditResult.details.items[2].sourceLocation.url, 'http://www.example.com/wsconnect.ws');
    assert.equal(auditResult.details.items[2].description,
      'WebSocket connection failed: Unexpected response code: 500');
  });

  it('handle the case when some logs fields are undefined', async () => {
    const context = {options: {}, computedCache: new Map()};
    const auditResult = await ErrorLogsAudit.audit({
      ConsoleMessages: [
        {
          level: 'error',
        },
      ],
      SourceMaps: [],
      Scripts: [],
    }, context);
    assert.equal(auditResult.score, 0);
    assert.equal(auditResult.details.items.length, 1);
    // sourceLocation is undefined
    assert.strictEqual(auditResult.details.items[0].sourceLocation, undefined);
    // text is undefined
    assert.strictEqual(auditResult.details.items[0].description, undefined);
  });

  // Checks bug #4188
  it('handle the case when exception info is not present', async () => {
    const context = {options: {}, computedCache: new Map()};
    const auditResult = await ErrorLogsAudit.audit({
      ConsoleMessages: [{
        'source': 'exception',
        'level': 'error',
        'timestamp': 1506535813608.003,
        'url': 'http://example.com/fancybox.js',
        'text': 'TypeError: Cannot read property \'msie\' of undefined',
        'stackTrace': {
          'callFrames': [
            {
              'url': 'http://example.com/fancybox.js',
              'lineNumber': 28,
              'columnNumber': 20,
            },
          ],
        },
      }],
      SourceMaps: [],
      Scripts: [],
    }, context);
    assert.equal(auditResult.score, 0);
    assert.equal(auditResult.details.items.length, 1);
    assert.strictEqual(
      auditResult.details.items[0].sourceLocation.url, 'http://example.com/fancybox.js');
    assert.strictEqual(auditResult.details.items[0].description,
      'TypeError: Cannot read property \'msie\' of undefined');
  });

  describe('options', () => {
    it('does nothing with an empty pattern', async () => {
      const options = {ignoredPatterns: ''};
      const context = {options, computedCache: new Map()};
      const result = await ErrorLogsAudit.audit({
        ConsoleMessages: [
          {
            level: 'error',
            source: 'network',
            text: 'This is a simple error msg',
          },
        ],
        SourceMaps: [],
        Scripts: [],
      }, context);

      expect(result.score).toBe(0);
      expect(result.details.items).toHaveLength(1);
    });

    it('does nothing with an empty description', async () => {
      const options = {ignoredPatterns: 'pattern'};
      const context = {options, computedCache: new Map()};
      const result = await ErrorLogsAudit.audit({
        ConsoleMessages: [
          {
            level: 'error',
          },
        ],
        SourceMaps: [],
        Scripts: [],
      }, context);

      expect(result.score).toBe(0);
      expect(result.details.items).toHaveLength(1);
    });

    it('does nothing with an empty description', async () => {
      const options = {ignoredPatterns: 'pattern'};
      const context = {options, computedCache: new Map()};
      const result = await ErrorLogsAudit.audit({
        ConsoleMessages: [
          {
            level: 'error',
          },
        ],
        SourceMaps: [],
        Scripts: [],
      }, context);

      expect(result.score).toBe(0);
      expect(result.details.items).toHaveLength(1);
    });

    it('filters console messages as a string', async () => {
      const options = {ignoredPatterns: ['simple']};
      const context = {options, computedCache: new Map()};
      const result = await ErrorLogsAudit.audit({
        ConsoleMessages: [
          {
            level: 'error',
            source: 'network',
            text: 'This is a simple error msg',
          },
        ],
        SourceMaps: [],
        Scripts: [],
      }, context);

      expect(result.score).toBe(1);
      expect(result.details.items).toHaveLength(0);
    });

    it('filters console messages as a regex', async () => {
      const options = {ignoredPatterns: [/simple.*msg/]};
      const context = {options, computedCache: new Map()};
      const result = await ErrorLogsAudit.audit({
        ConsoleMessages: [
          {
            level: 'error',
            source: 'network',
            text: 'This is a simple error msg',
          },
        ],
        SourceMaps: [],
        Scripts: [],
      }, context);

      expect(result.score).toBe(1);
      expect(result.details.items).toHaveLength(0);
    });

    it('filters exceptions with both regex and strings', async () => {
      const options = {ignoredPatterns: [/s.mple/i, 'really']};
      const context = {options, computedCache: new Map()};
      const result = await ErrorLogsAudit.audit({
        ConsoleMessages: [
          {
            source: 'exception',
            level: 'error',
            url: 'http://example.com/url.js',
            text: 'Simple Error: You messed up',
          },
          {
            source: 'exception',
            level: 'error',
            url: 'http://example.com/url.js',
            text: 'Bad Error: You really messed up',
          },
        ],
        SourceMaps: [],
        Scripts: [],
      }, context);

      expect(result.score).toBe(1);
      expect(result.details.items).toHaveLength(0);
    });
  });

  describe('defaultOptions', () => {
    // See https://github.com/GoogleChrome/lighthouse/issues/10198
    it('filters out blocked_by_client.inspector messages by default', async () => {
      const context = {options: ErrorLogsAudit.defaultOptions, computedCache: new Map()};
      const auditResult = await ErrorLogsAudit.audit({
        ConsoleMessages: [{
          'source': 'exception',
          'level': 'error',
          'timestamp': 1506535813608.003,
          'url': 'https://www.facebook.com/tr/',
          'text': 'Failed to load resource: net::ERR_BLOCKED_BY_CLIENT.Inspector',
        }],
        SourceMaps: [],
        Scripts: [],
      }, context);
      assert.equal(auditResult.score, 1);
      assert.equal(auditResult.details.items.length, 0);
    });
  });
});
