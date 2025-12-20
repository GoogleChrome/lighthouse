/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const assert = require('assert').strict;
const OfflineStartUrlAudit = require('../../audits/offline-start-url.js');
const manifestParser = require('../../lib/manifest-parser.js');

/* eslint-env jest */

function generateMockAuditContext() {
  return {
    computedCache: new Map(),
  };
}
function getManifest(manifest) {
  const documentUrl = 'https://example.com/';
  const manifestUrl = `${documentUrl}manifest.json`;

  return manifestParser(JSON.stringify(manifest), manifestUrl, documentUrl);
}

describe('Offline start_url audit', () => {
  it('fails if start_url is not fetched', async () => {
    const explanation = 'Unable to fetch start URL via service worker.';

    const artifacts = {
      StartUrl: {
        statusCode: -1,
        explanation,
      },
    };
    const context = generateMockAuditContext();

    const result = await OfflineStartUrlAudit.audit(artifacts, context);
    assert.strictEqual(result.score, 0);
    assert.strictEqual(result.explanation, explanation);
    assert.strictEqual(result.warnings.length, 0);
  });

  it('passes if start_url is fetched', async () => {
    const artifacts = {
      StartUrl: {statusCode: 200},
    };
    const context = generateMockAuditContext();

    const result = await OfflineStartUrlAudit.audit(artifacts, context);
    assert.strictEqual(result.score, 1);
    assert.strictEqual(result.explanation, undefined);
    assert.strictEqual(result.warnings.length, 0);
  });

  it('warns if there was a manifest start_url parsing error', async () => {
    const manifest = {
      start_url: 'https://evil.com/',
    };

    const artifacts = {
      WebAppManifest: getManifest(manifest),
      StartUrl: {statusCode: 200},
    };
    const context = generateMockAuditContext();

    const result = await OfflineStartUrlAudit.audit(artifacts, context);
    assert.strictEqual(result.score, 1);
    assert.strictEqual(result.explanation, undefined);
    assert.strictEqual(result.warnings.length, 1);
    expect(result.warnings[0]).toBeDisplayString(
      /Lighthouse couldn't read the `start_url`.*ERROR: start_url must be same-origin as document/);
  });
});
