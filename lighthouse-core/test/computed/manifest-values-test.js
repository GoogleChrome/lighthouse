/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const ManifestValues = require('../../computed/manifest-values.js');
const assert = require('assert').strict;

const manifestSrc = JSON.stringify(require('../fixtures/manifest.json'));
const manifestParser = require('../../lib/manifest-parser.js');

function getMockContext() {
  return {
    computedCache: new Map(),
  };
}

/**
 * Simple manifest parsing helper when the manifest URLs aren't material to the
 * test. Uses example.com URLs for testing.
 * @param {string} manifestSrc
 * @return {!ManifestNode<(!Manifest|undefined)>}
 */
function noUrlManifestParser(manifestSrc) {
  const EXAMPLE_MANIFEST_URL = 'https://example.com/manifest.json';
  const EXAMPLE_DOC_URL = 'https://example.com/index.html';
  return manifestParser(manifestSrc, EXAMPLE_MANIFEST_URL, EXAMPLE_DOC_URL);
}

describe('ManifestValues computed artifact', () => {
  it('reports a parse failure if page had no manifest', async () => {
    const WebAppManifest = null;
    const InstallabilityErrors = {errors: []};
    const artifacts = {WebAppManifest, InstallabilityErrors};

    const results = await ManifestValues.request(artifacts, getMockContext());
    assert.equal(results.isParseFailure, true);
    assert.ok(results.parseFailureReason, 'No manifest was fetched');
    assert.equal(results.allChecks.length, 0);
  });

  it('reports a parse failure if page had an unparseable manifest', async () => {
    const WebAppManifest = noUrlManifestParser('{:,}');
    const InstallabilityErrors = {errors: []};
    const artifacts = {WebAppManifest, InstallabilityErrors};

    const results = await ManifestValues.request(artifacts, getMockContext());
    assert.equal(results.isParseFailure, true);
    assert.ok(results.parseFailureReason.includes('failed to parse as valid JSON'));
    assert.equal(results.allChecks.length, 0);
  });

  it('passes the parsing checks on an empty manifest', async () => {
    const WebAppManifest = noUrlManifestParser('{}');
    const InstallabilityErrors = {errors: []};
    const artifacts = {WebAppManifest, InstallabilityErrors};

    const results = await ManifestValues.request(artifacts, getMockContext());
    assert.equal(results.isParseFailure, false);
    assert.equal(results.parseFailureReason, undefined);
  });

  it('passes the all checks with fixture manifest', async () => {
    const WebAppManifest = noUrlManifestParser(manifestSrc);
    const InstallabilityErrors = {errors: []};
    const artifacts = {WebAppManifest, InstallabilityErrors};

    const results = await ManifestValues.request(artifacts, getMockContext());
    assert.equal(results.isParseFailure, false);
    assert.equal(results.parseFailureReason, undefined);

    assert.equal(results.allChecks.length, ManifestValues.manifestChecks.length);
    assert.equal(results.allChecks.every(i => i.passing), true, 'not all checks passed');
  });

  describe('color checks', () => {
    it('fails when a minimal manifest contains no background_color', async () => {
      const WebAppManifest = noUrlManifestParser(JSON.stringify({
        start_url: '/',
      }));
      const InstallabilityErrors = {errors: []};
      const artifacts = {WebAppManifest, InstallabilityErrors};

      const results = await ManifestValues.request(artifacts, getMockContext());
      const colorResults = results.allChecks.filter(i => i.id.includes('Color'));
      assert.equal(colorResults.every(i => i.passing === false), true);
    });

    it('fails when a minimal manifest contains an invalid background_color', async () => {
      const WebAppManifest = noUrlManifestParser(JSON.stringify({
        background_color: 'no',
        theme_color: 'no',
      }));
      const InstallabilityErrors = {errors: []};
      const artifacts = {WebAppManifest, InstallabilityErrors};

      const results = await ManifestValues.request(artifacts, getMockContext());
      const colorResults = results.allChecks.filter(i => i.id.includes('Color'));
      assert.equal(colorResults.every(i => i.passing === false), true);
    });

    it('succeeds when a minimal manifest contains a valid background_color', async () => {
      const WebAppManifest = noUrlManifestParser(JSON.stringify({
        background_color: '#FAFAFA',
        theme_color: '#FAFAFA',
      }));
      const InstallabilityErrors = {errors: []};
      const artifacts = {WebAppManifest, InstallabilityErrors};

      const results = await ManifestValues.request(artifacts, getMockContext());
      const colorResults = results.allChecks.filter(i => i.id.includes('Color'));
      assert.equal(colorResults.every(i => i.passing === true), true);
    });
  });

  describe('hasPWADisplayValue', () => {
    const check = ManifestValues.manifestChecks.find(i => i.id === 'hasPWADisplayValue');

    it('passes accepted values', () => {
      let manifestValue;
      manifestValue = noUrlManifestParser(JSON.stringify({display: 'minimal-ui'})).value;
      assert.equal(check.validate(manifestValue), true, 'doesnt pass minimal-ui');
      manifestValue = noUrlManifestParser(JSON.stringify({display: 'standalone'})).value;
      assert.equal(check.validate(manifestValue), true, 'doesnt pass standalone');
      manifestValue = noUrlManifestParser(JSON.stringify({display: 'fullscreen'})).value;
      assert.equal(check.validate(manifestValue), true, 'doesnt pass fullscreen');
    });
    it('fails invalid values', () => {
      let manifestValue;
      manifestValue = noUrlManifestParser(JSON.stringify({display: 'display'})).value;
      assert.equal(check.validate(manifestValue), false, 'doesnt fail display');
      manifestValue = noUrlManifestParser(JSON.stringify({display: ''})).value;
      assert.equal(check.validate(manifestValue), false, 'doesnt fail empty string');
    });
  });

  describe('icons checks', () => {
    describe('icons exist check', () => {
      it('fails when a manifest contains no icons array', async () => {
        const manifestSrc = JSON.stringify({
          name: 'NoIconsHere',
        });
        const WebAppManifest = noUrlManifestParser(manifestSrc);
        const InstallabilityErrors = {errors: []};
        const artifacts = {WebAppManifest, InstallabilityErrors};

        const results = await ManifestValues.request(artifacts, getMockContext());
        const iconResults = results.allChecks.filter(i => i.id.includes('Icons'));
        assert.equal(iconResults.every(i => i.passing === false), true);
      });

      it('fails when a manifest contains no icons', async () => {
        const manifestSrc = JSON.stringify({
          icons: [],
        });
        const WebAppManifest = noUrlManifestParser(manifestSrc);
        const InstallabilityErrors = {errors: []};
        const artifacts = {WebAppManifest, InstallabilityErrors};

        const results = await ManifestValues.request(artifacts, getMockContext());
        const iconResults = results.allChecks.filter(i => i.id.includes('Icons'));
        assert.equal(iconResults.every(i => i.passing === false), true);
      });

      it('fails when a manifest icon fails to fetch icon', async () => {
        const manifestSrc = JSON.stringify({
          icons: [{
            src: 'icon.png',
          }],
        });
        const WebAppManifest = noUrlManifestParser(manifestSrc);
        const InstallabilityErrors = {errors: [{errorId: 'no-icon-available'}]};
        const artifacts = {WebAppManifest, InstallabilityErrors};

        const results = await ManifestValues.request(artifacts, getMockContext());
        expect(results.allChecks.map(r => r.id)).toContain('fetchesIcon');
      });
    });

    describe('icons at least X size check', () => {
      it('fails when a manifest contains an icon with no size', async () => {
        const manifestSrc = JSON.stringify({
          icons: [{
            src: 'icon.png',
          }],
        });
        const WebAppManifest = noUrlManifestParser(manifestSrc);
        const InstallabilityErrors = {errors: []};
        const artifacts = {WebAppManifest, InstallabilityErrors};

        const results = await ManifestValues.request(artifacts, getMockContext());
        const iconResults = results.allChecks.filter(i => i.id.includes('Icons'));

        assert.equal(iconResults.every(i => i.passing === false), true);
      });

      it('succeeds when there\'s one icon with multiple sizes, and one is valid', async () => {
        const manifestSrc = JSON.stringify({
          icons: [{
            src: 'icon.png',
            sizes: '72x72 96x96 128x128 256x256 1024x1024',
          }],
        });
        const WebAppManifest = noUrlManifestParser(manifestSrc);
        const InstallabilityErrors = {errors: []};
        const artifacts = {WebAppManifest, InstallabilityErrors};

        const results = await ManifestValues.request(artifacts, getMockContext());
        const iconResults = results.allChecks.filter(i => i.id.includes('Icons'));

        assert.equal(iconResults.every(i => i.passing === true), true);
      });

      it('succeeds when there\'s two icons, one with and one without valid size', async () => {
        const manifestSrc = JSON.stringify({
          icons: [{
            src: 'icon.png',
          }, {
            src: 'icon2.png',
            sizes: '1256x1256',
          }],
        });
        const WebAppManifest = noUrlManifestParser(manifestSrc);
        const InstallabilityErrors = {errors: []};
        const artifacts = {WebAppManifest, InstallabilityErrors};

        const results = await ManifestValues.request(artifacts, getMockContext());
        const iconResults = results.allChecks.filter(i => i.id.includes('Icons'));

        assert.equal(iconResults.every(i => i.passing === true), true);
      });

      it('fails when an icon has a valid size, though it\'s non-square.', async () => {
        // See also: https://code.google.com/p/chromium/codesearch#chromium/src/chrome/browser/banners/app_banner_data_fetcher_unittest.cc&sq=package:chromium&type=cs&q=%22Non-square%20is%20okay%22%20file:%5Esrc/chrome/browser/banners/
        const manifestSrc = JSON.stringify({
          icons: [{
            src: 'icon-non-square.png',
            sizes: '200x220',
          }],
        });
        const WebAppManifest = noUrlManifestParser(manifestSrc);
        const InstallabilityErrors = {errors: []};
        const artifacts = {WebAppManifest, InstallabilityErrors};

        const results = await ManifestValues.request(artifacts, getMockContext());
        const iconResults = results.allChecks.filter(i => i.id.includes('Icons'));

        assert.equal(iconResults.every(i => i.passing === false), true);
      });
    });

    describe('manifest has at least one maskable icon', () => {
      it('fails when no maskable icon exists', async () => {
        const manifestSrc = JSON.stringify({
          icons: [{
            src: 'icon.png',
            purpose: 'any',
          }],
        });
        const WebAppManifest = noUrlManifestParser(manifestSrc);
        const InstallabilityErrors = {errors: []};
        const artifacts = {WebAppManifest, InstallabilityErrors};

        const results = await ManifestValues.request(artifacts, getMockContext());
        const iconResults = results.allChecks.filter(i => i.id.includes('Maskable'));

        assert.equal(iconResults.every(i => i.passing === false), true);
      });

      it('passes when an icon has the maskable purpose property', async () => {
        const manifestSrc = JSON.stringify({
          icons: [{
            src: 'icon.png',
          }, {
            src: 'icon2.png',
            purpose: 'maskable',
          }],
        });
        const WebAppManifest = noUrlManifestParser(manifestSrc);
        const InstallabilityErrors = {errors: []};
        const artifacts = {WebAppManifest, InstallabilityErrors};

        const results = await ManifestValues.request(artifacts, getMockContext());
        const iconResults = results.allChecks.filter(i => i.id.includes('Maskable'));

        assert.equal(iconResults.every(i => i.passing === true), true);
      });
    });
  });
});
