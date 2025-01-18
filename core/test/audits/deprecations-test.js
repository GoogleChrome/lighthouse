/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import DeprecationsAudit from '../../audits/deprecations.js';

describe('Deprecations audit', () => {
  it('passes when no deprecations were found', async () => {
    const context = {computedCache: new Map()};
    const auditResult = await DeprecationsAudit.audit({
      InspectorIssues: {deprecationIssue: []},
      SourceMaps: [],
      Scripts: [],
    }, context);
    assert.equal(auditResult.score, 1);
    assert.equal(auditResult.details.items.length, 0);
  });

  it('fails when deprecation messages are found', async () => {
    const URL = 'http://example.com';

    const context = {computedCache: new Map()};
    const auditResult = await DeprecationsAudit.audit({
      InspectorIssues: {
        deprecationIssue: [
          {
            message: 'Deprecation message 123',
            sourceCodeLocation: {
              url: URL,
              lineNumber: 123,
              columnNumber: 100,
            },
          },
          {
            message: 'Deprecation message 456',
            sourceCodeLocation: {
              url: 'http://example2.com',
              lineNumber: 456,
              columnNumber: 100,
            },
          },
          {
            // Does not exist anymore.
            type: 'EventPath',
            sourceCodeLocation: {
              url: URL,
              lineNumber: 100,
              columnNumber: 100,
            },
          },
          {
            type: 'RTCPeerConnectionGetStatsLegacyNonCompliant',
            sourceCodeLocation: {
              url: URL,
              lineNumber: 101,
              columnNumber: 100,
            },
          },
        ],
      },
      SourceMaps: [],
      Scripts: [],
    }, context);

    assert.equal(auditResult.score, 0);
    expect(auditResult.displayValue).toBeDisplayString('4 warnings found');
    assert.equal(auditResult.details.items.length, 4);
    assert.equal(auditResult.details.items[0].value, 'Deprecation message 123');
    assert.equal(auditResult.details.items[0].source.url, URL);
    assert.equal(auditResult.details.items[0].source.line, 123);
    assert.equal(auditResult.details.items[0].source.column, 99);
    assert.equal(auditResult.details.items[1].value, 'Deprecation message 456');
    expect(auditResult.details.items[2].value).toEqual('EventPath');
    expect(auditResult.details.items[2].subItems).toEqual(undefined);
    expect(auditResult.details.items[3].value).toBeDisplayString(
      // eslint-disable-next-line max-len
      'The callback-based getStats() is deprecated and will be removed. Use the spec-compliant getStats() instead.');
    expect(auditResult.details.items[3].subItems.items[0]).toMatchObject({
      text: expect.toBeDisplayString('Check the feature status page for more details.'),
      url: 'https://chromestatus.com/feature/4631626228695040',
    });
    expect(auditResult.details.items[3].subItems.items[1]).toMatchObject({
      text: expect.toBeDisplayString('This change will go into effect with milestone 117.'),
      url: 'https://chromiumdash.appspot.com/schedule',
    });
  });
});
