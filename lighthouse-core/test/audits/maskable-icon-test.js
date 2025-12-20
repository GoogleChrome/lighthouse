/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const MaskableIconAudit = require('../../audits/maskable-icon.js');
const manifestParser = require('../../lib/manifest-parser.js');

const manifestSrc = JSON.stringify(require('../fixtures/manifest.json'));
const manifestWithoutMaskableSrc =
  JSON.stringify(require('../fixtures/manifest-no-maskable-icon.json'));
const EXAMPLE_MANIFEST_URL = 'https://example.com/manifest.json';
const EXAMPLE_DOC_URL = 'https://example.com/index.html';

/**
 * @param {string}
 */
function generateMockArtifacts(src = manifestSrc) {
  const exampleManifest = manifestParser(src, EXAMPLE_MANIFEST_URL, EXAMPLE_DOC_URL);

  return {
    WebAppManifest: exampleManifest,
    InstallabilityErrors: {errors: []},
  };
}

function generateMockAuditContext() {
  return {
    computedCache: new Map(),
  };
}

/* eslint-env jest */

describe('Maskable Icon Audit', () => {
  const context = generateMockAuditContext();

  it('fails when the manifest fails to be parsed', async () => {
    const artifacts = generateMockArtifacts();
    artifacts.WebAppManifest = null;

    const auditResult = await MaskableIconAudit.audit(artifacts, context);
    expect(auditResult.score).toEqual(0);
  });

  it('fails when the manifest contains no maskable icons', async () => {
    const artifacts = generateMockArtifacts(manifestWithoutMaskableSrc);

    const auditResult = await MaskableIconAudit.audit(artifacts, context);
    expect(auditResult.score).toEqual(0);
  });

  it('passes when the manifest contains at least one maskable icon', async () => {
    const artifacts = generateMockArtifacts();

    const auditResult = await MaskableIconAudit.audit(artifacts, context);
    expect(auditResult.score).toEqual(1);
  });
});
