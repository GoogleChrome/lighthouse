/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import GeolocationOnStartAudit from '../../../audits/dobetterweb/geolocation-on-start.js';

describe('UX: geolocation audit', () => {
  it('fails when geolocation has been automatically requested', async () => {
    const text = 'Do not request geolocation permission without a user action.';

    const context = {computedCache: new Map()};
    const auditResult = await GeolocationOnStartAudit.audit({
      ConsoleMessages: [
        {source: 'violation', url: 'https://example.com/', text},
        {source: 'violation', url: 'https://example2.com/two', text},
        {source: 'violation', url: 'http://abc.com/', text: 'No document.write'},
        {source: 'deprecation', url: 'https://example.com/two'},
      ],
      SourceMaps: [],
      Scripts: [],
    }, context);
    assert.equal(auditResult.score, 0);
    assert.equal(auditResult.details.items.length, 2);
  });

  it('passes when geolocation has not been automatically requested', async () => {
    const context = {computedCache: new Map()};
    const auditResult = await GeolocationOnStartAudit.audit({
      ConsoleMessages: [],
      SourceMaps: [],
      Scripts: [],
    }, context);
    assert.equal(auditResult.score, 1);
    assert.equal(auditResult.details.items.length, 0);
  });
});
