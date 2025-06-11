/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import DocWriteUseAudit from '../../../audits/dobetterweb/no-document-write.js';

const URL = 'https://example.com';

describe('Page does not use document.write()', () => {
  it('passes when document.write() is not used', async () => {
    const auditResult = await DocWriteUseAudit.audit({
      ConsoleMessages: [],
      URL: {finalDisplayedUrl: URL},
      SourceMaps: [],
      Scripts: [],
    }, {computedCache: new Map()});
    assert.equal(auditResult.score, 1);
    assert.equal(auditResult.details.items.length, 0);
  });

  it('fails when document.write() is used', async () => {
    const text = 'Do not use document.write';
    const auditResult = await DocWriteUseAudit.audit({
      URL: {finalDisplayedUrl: URL},
      ConsoleMessages: [
        {source: 'violation', url: 'https://example.com/', text},
        {source: 'violation', url: 'https://example2.com/two', text},
        {source: 'violation', url: 'http://abc.com/', text: 'Long event handler!'},
        {source: 'deprecation', url: 'https://example.com/two'},
      ],
      SourceMaps: [],
      Scripts: [],
    }, {computedCache: new Map()});
    assert.equal(auditResult.score, 0);
    assert.equal(auditResult.details.items.length, 2);
  });
});
