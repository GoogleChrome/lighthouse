/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ThemedOmniboxAudit = require('../../audits/themed-omnibox.js');
const assert = require('assert').strict;
const manifestParser = require('../../lib/manifest-parser.js');

const manifestSrc = JSON.stringify(require('../fixtures/manifest.json'));
const EXAMPLE_MANIFEST_URL = 'https://example.com/manifest.json';
const EXAMPLE_DOC_URL = 'https://example.com/index.html';

/**
 * @param {string} src
 */
function generateMockArtifacts(src = manifestSrc) {
  const exampleManifest = manifestParser(src, EXAMPLE_MANIFEST_URL, EXAMPLE_DOC_URL);

  return {
    WebAppManifest: exampleManifest,
    InstallabilityErrors: {errors: []},
    MetaElements: [{name: 'theme-color', content: '#bada55'}],
  };
}

function generateMockAuditContext() {
  return {
    computedCache: new Map(),
  };
}

/* eslint-env jest */
describe('PWA: themed omnibox audit', () => {
  it('fails if page had no manifest', () => {
    const artifacts = generateMockArtifacts();
    artifacts.WebAppManifest = null;
    const context = generateMockAuditContext();

    return ThemedOmniboxAudit.audit(artifacts, context).then(result => {
      assert.strictEqual(result.score, 0);
      assert.ok(result.explanation.includes('No manifest was fetched'), result.explanation);
    });
  });

  // Need to disable camelcase check for dealing with theme_color.
  /* eslint-disable camelcase */
  it('fails when a minimal manifest contains no theme_color', () => {
    const artifacts = generateMockArtifacts(JSON.stringify({
      start_url: '/',
    }));
    const context = generateMockAuditContext();

    return ThemedOmniboxAudit.audit(artifacts, context).then(result => {
      assert.equal(result.score, 0);
      assert.ok(result.explanation);
    });
  });

  it('succeeds when a minimal manifest contains a theme_color', () => {
    const artifacts = generateMockArtifacts(JSON.stringify({
      theme_color: '#bada55',
    }));
    const context = generateMockAuditContext();
    return ThemedOmniboxAudit.audit(artifacts, context).then(result => {
      assert.equal(result.score, 1);
      assert.equal(result.explanation, undefined);
    });
  });

  /* eslint-enable camelcase */
  it('succeeds when a complete manifest contains a theme_color', () => {
    const artifacts = generateMockArtifacts();
    const context = generateMockAuditContext();
    return ThemedOmniboxAudit.audit(artifacts, context).then(result => {
      assert.equal(result.score, 1);
      assert.equal(result.explanation, undefined);
    });
  });

  it('fails and warns when no theme-color meta tag found', () => {
    const artifacts = generateMockArtifacts();
    artifacts.MetaElements = [];
    const context = generateMockAuditContext();
    return ThemedOmniboxAudit.audit(artifacts, context).then(result => {
      assert.equal(result.score, 0);
      assert.ok(result.explanation);
    });
  });

  it('fails and warns when theme-color has an invalid CSS color', () => {
    const artifacts = generateMockArtifacts();
    artifacts.MetaElements = [{name: 'theme-color', content: '#1234567'}];
    const context = generateMockAuditContext();
    return ThemedOmniboxAudit.audit(artifacts, context).then(result => {
      assert.equal(result.score, 0);
      assert.ok(result.explanation.includes('valid CSS color'));
    });
  });

  it('succeeds when theme-color present in the html', () => {
    const artifacts = generateMockArtifacts();
    artifacts.MetaElements = [{name: 'theme-color', content: '#fafa33'}];
    const context = generateMockAuditContext();
    return ThemedOmniboxAudit.audit(artifacts, context).then(result => {
      assert.equal(result.score, 1);
      assert.equal(result.explanation, undefined);
    });
  });

  it('succeeds when theme-color has a CSS nickname content value', () => {
    const artifacts = generateMockArtifacts();
    artifacts.MetaElements = [{name: 'theme-color', content: 'red'}];
    const context = generateMockAuditContext();
    return ThemedOmniboxAudit.audit(artifacts, context).then(result => {
      assert.equal(result.score, 1);
      assert.equal(result.explanation, undefined);
    });
  });

  it('succeeds when theme-color has a CSS4 nickname content value', async () => {
    const artifacts = generateMockArtifacts();
    artifacts.MetaElements = [{name: 'theme-color', content: 'rebeccapurple'}]; // <3
    const context = generateMockAuditContext();

    const result = await ThemedOmniboxAudit.audit(artifacts, context);
    assert.equal(result.score, 1);
    assert.equal(result.explanation, undefined);
  });

  it('fails if HTML theme color is good, but manifest themecolor is bad', () => {
    const artifacts = generateMockArtifacts(JSON.stringify({
      start_url: '/',
    }));
    const context = generateMockAuditContext();
    return ThemedOmniboxAudit.audit(artifacts, context).then(result => {
      assert.equal(result.score, 0);
      assert.ok(result.explanation.includes('does not have `theme_color`'), result.explanation);
    });
  });

  it('fails if HTML theme color is bad, and manifest themecolor is good', () => {
    const artifacts = generateMockArtifacts();
    artifacts.MetaElements = [{name: 'theme-color'}];
    const context = generateMockAuditContext();
    return ThemedOmniboxAudit.audit(artifacts, context).then(result => {
      assert.equal(result.score, 0);
      assert.ok(result.explanation.includes('theme-color meta tag'), result.explanation);
    });
  });
});
