/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const InstallableManifestAudit = require('../../audits/installable-manifest.js');
const assert = require('assert').strict;
const manifestParser = require('../../lib/manifest-parser.js');

const manifestSrc = JSON.stringify(require('../fixtures/manifest.json'));
const manifestDirtyJpgSrc = JSON.stringify(require('../fixtures/manifest-dirty-jpg.json'));
const EXAMPLE_MANIFEST_URL = 'https://example.com/manifest.json';
const EXAMPLE_DOC_URL = 'https://example.com/index.html';

function generateMockArtifacts(src = manifestSrc) {
  const exampleManifest = manifestParser(src, EXAMPLE_MANIFEST_URL, EXAMPLE_DOC_URL);

  const clonedArtifacts = JSON.parse(JSON.stringify({
    WebAppManifest: exampleManifest,
    InstallabilityErrors: {errors: []},
    URL: {finalUrl: 'https://example.com'},
  }));
  return clonedArtifacts;
}
function generateMockAuditContext() {
  return {
    computedCache: new Map(),
  };
}

/* eslint-env jest */
describe('PWA: webapp install banner audit', () => {
  describe('basics', () => {
    it('fails if page had no manifest', () => {
      const artifacts = generateMockArtifacts();
      artifacts.WebAppManifest = null;
      const context = generateMockAuditContext();

      return InstallableManifestAudit.audit(artifacts, context).then(result => {
        assert.strictEqual(result.score, 0);
        assert.ok(result.explanation.includes('No manifest was fetched'), result.explanation);
      });
    });

    it('fails with a non-parsable manifest', () => {
      const artifacts = generateMockArtifacts('{,:}');
      const context = generateMockAuditContext();
      return InstallableManifestAudit.audit(artifacts, context).then(result => {
        assert.strictEqual(result.score, 0);
        assert.ok(result.explanation.includes('failed to parse as valid JSON'));
      });
    });

    it('fails when an empty manifest is present', () => {
      const artifacts = generateMockArtifacts('{}');
      const context = generateMockAuditContext();
      return InstallableManifestAudit.audit(artifacts, context).then(result => {
        assert.strictEqual(result.score, 0);
        assert.ok(result.explanation);
        assert.strictEqual(result.details.items[0].failures.length, 5);
      });
    });

    it('passes with complete manifest and SW', () => {
      const context = generateMockAuditContext();
      return InstallableManifestAudit.audit(generateMockArtifacts(), context).then(result => {
        assert.strictEqual(result.score, 1, result.explanation);
        assert.strictEqual(result.explanation, undefined, result.explanation);
      });
    });
  });

  describe('one-off-failures', () => {
    it('fails when a manifest contains no start_url', () => {
      const artifacts = generateMockArtifacts();
      artifacts.WebAppManifest.value.start_url.value = undefined;
      const context = generateMockAuditContext();

      return InstallableManifestAudit.audit(artifacts, context).then(result => {
        assert.strictEqual(result.score, 0);
        assert.ok(result.explanation.includes('start_url'), result.explanation);

        const details = result.details.items[0];
        assert.strictEqual(details.failures.length, 1, details.failures);
        assert.strictEqual(details.hasStartUrl, false);
        assert.strictEqual(details.hasShortName, true);
      });
    });

    it('fails when a manifest contains no short_name', () => {
      const artifacts = generateMockArtifacts();
      artifacts.WebAppManifest.value.short_name.value = undefined;
      const context = generateMockAuditContext();

      return InstallableManifestAudit.audit(artifacts, context).then(result => {
        assert.strictEqual(result.score, 0);
        assert.ok(result.explanation.includes('short_name'), result.explanation);

        const details = result.details.items[0];
        assert.strictEqual(details.failures.length, 1, details.failures);
        assert.strictEqual(details.hasStartUrl, true);
        assert.strictEqual(details.hasShortName, false);
      });
    });

    it('fails when a manifest contains no name', () => {
      const artifacts = generateMockArtifacts();
      artifacts.WebAppManifest.value.name.value = undefined;
      const context = generateMockAuditContext();

      return InstallableManifestAudit.audit(artifacts, context).then(result => {
        assert.strictEqual(result.score, 0);
        assert.ok(result.explanation.includes('name'), result.explanation);

        const details = result.details.items[0];
        assert.strictEqual(details.failures.length, 1, details.failures);
        assert.strictEqual(details.hasStartUrl, true);
        assert.strictEqual(details.hasName, false);
      });
    });

    it('fails if page had no icons in the manifest', () => {
      const artifacts = generateMockArtifacts();
      artifacts.WebAppManifest.value.icons.value = [];
      const context = generateMockAuditContext();

      return InstallableManifestAudit.audit(artifacts, context).then(result => {
        assert.strictEqual(result.score, 0);
        assert.ok(result.explanation.includes('PNG icon'), result.explanation);

        const details = result.details.items[0];
        assert.strictEqual(details.failures.length, 2, details.failures);
        assert.strictEqual(details.hasStartUrl, true);
        assert.strictEqual(details.hasIconsAtLeast144px, false);
      });
    });

    it('fails if page had no fetchable icons in the manifest', () => {
      const artifacts = generateMockArtifacts();
      artifacts.InstallabilityErrors.errors.push({errorId: 'no-icon-available'});
      const context = generateMockAuditContext();

      return InstallableManifestAudit.audit(artifacts, context).then(result => {
        assert.strictEqual(result.score, 0);
        assert.ok(result.explanation.includes('failed to be fetched'), result.explanation);

        const details = result.details.items[0];
        assert.strictEqual(details.failures.length, 1, details.failures);
        assert.strictEqual(details.hasStartUrl, true);
        assert.strictEqual(details.hasIconsAtLeast144px, true);
      });
    });
  });

  it('fails if icons were present, but no valid PNG present', () => {
    const artifacts = generateMockArtifacts(manifestDirtyJpgSrc);
    const context = generateMockAuditContext();

    return InstallableManifestAudit.audit(artifacts, context).then(result => {
      assert.strictEqual(result.score, 0);
      assert.ok(result.explanation.includes('PNG icon'), result.explanation);

      const details = result.details.items[0];
      assert.strictEqual(details.failures.length, 1, details.failures);
      assert.strictEqual(details.hasStartUrl, true);
      assert.strictEqual(details.hasIconsAtLeast144px, false);
    });
  });
});
