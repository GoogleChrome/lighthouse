/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const assert = require('assert').strict;
const Util = require('../../../../report/html/renderer/util.js');
const I18n = require('../../../../report/html/renderer/i18n.js');
const sampleResult = require('../../../results/sample_v2.json');

/* eslint-env jest */
/* global URL */

describe('util helpers', () => {
  beforeEach(() => {
    Util.i18n = new I18n('en', {...Util.UIStrings});
  });

  afterEach(() => {
    Util.i18n = undefined;
  });

  it('calculates a score ratings', () => {
    assert.equal(Util.calculateRating(0.0), 'fail');
    assert.equal(Util.calculateRating(0.10), 'fail');
    assert.equal(Util.calculateRating(0.45), 'fail');
    assert.equal(Util.calculateRating(0.5), 'average');
    assert.equal(Util.calculateRating(0.75), 'average');
    assert.equal(Util.calculateRating(0.80), 'average');
    assert.equal(Util.calculateRating(0.90), 'pass');
    assert.equal(Util.calculateRating(1.00), 'pass');
  });

  it('builds device emulation string', () => {
    const get = opts => Util.getEmulationDescriptions(opts).deviceEmulation;
    assert.equal(get({emulatedFormFactor: 'none'}), 'No emulation');
    assert.equal(get({emulatedFormFactor: 'mobile'}), 'Emulated Moto G4');
    assert.equal(get({emulatedFormFactor: 'desktop'}), 'Emulated Desktop');
  });

  it('builds throttling strings when provided', () => {
    const descriptions = Util.getEmulationDescriptions({throttlingMethod: 'provided'});
    assert.equal(descriptions.cpuThrottling, 'Provided by environment');
    assert.equal(descriptions.networkThrottling, 'Provided by environment');
  });

  it('builds throttling strings when devtools', () => {
    const descriptions = Util.getEmulationDescriptions({
      throttlingMethod: 'devtools',
      throttling: {
        cpuSlowdownMultiplier: 4.5,
        requestLatencyMs: 565,
        downloadThroughputKbps: 1400.00000000001,
        uploadThroughputKbps: 600,
      },
    });

    // eslint-disable-next-line max-len
    assert.equal(descriptions.networkThrottling, '565\xa0ms HTTP RTT, 1,400\xa0Kbps down, 600\xa0Kbps up (DevTools)');
    assert.equal(descriptions.cpuThrottling, '4.5x slowdown (DevTools)');
  });

  it('builds throttling strings when simulate', () => {
    const descriptions = Util.getEmulationDescriptions({
      throttlingMethod: 'simulate',
      throttling: {
        cpuSlowdownMultiplier: 2,
        rttMs: 150,
        throughputKbps: 1600,
      },
    });

    // eslint-disable-next-line max-len
    assert.equal(descriptions.networkThrottling, '150\xa0ms TCP RTT, 1,600\xa0Kbps throughput (Simulated)');
    assert.equal(descriptions.cpuThrottling, '2x slowdown (Simulated)');
  });

  describe('#prepareReportResult', () => {
    describe('backward compatibility', () => {
      it('corrects underscored `notApplicable` scoreDisplayMode', () => {
        const clonedSampleResult = JSON.parse(JSON.stringify(sampleResult));

        let notApplicableCount = 0;
        Object.values(clonedSampleResult.audits).forEach(audit => {
          if (audit.scoreDisplayMode === 'notApplicable') {
            notApplicableCount++;
            audit.scoreDisplayMode = 'not_applicable';
          }
        });

        assert.ok(notApplicableCount > 20); // Make sure something's being tested.

        // Original audit results should be restored.
        const preparedResult = Util.prepareReportResult(clonedSampleResult);

        assert.deepStrictEqual(preparedResult.audits, sampleResult.audits);
      });

      it('corrects undefined auditDetails.type to `debugdata`', () => {
        const clonedSampleResult = JSON.parse(JSON.stringify(sampleResult));

        // Delete debugdata details types.
        let undefinedCount = 0;
        for (const audit of Object.values(clonedSampleResult.audits)) {
          if (audit.details && audit.details.type === 'debugdata') {
            undefinedCount++;
            delete audit.details.type;
          }
        }
        assert.ok(undefinedCount > 4); // Make sure something's being tested.
        assert.notDeepStrictEqual(clonedSampleResult.audits, sampleResult.audits);

        // Original audit results should be restored.
        const preparedResult = Util.prepareReportResult(clonedSampleResult);
        assert.deepStrictEqual(preparedResult.audits, sampleResult.audits);
      });

      it('corrects `diagnostic` auditDetails.type to `debugdata`', () => {
        const clonedSampleResult = JSON.parse(JSON.stringify(sampleResult));

        // Change debugdata details types.
        let diagnosticCount = 0;
        for (const audit of Object.values(clonedSampleResult.audits)) {
          if (audit.details && audit.details.type === 'debugdata') {
            diagnosticCount++;
            audit.details.type = 'diagnostic';
          }
        }
        assert.ok(diagnosticCount > 4); // Make sure something's being tested.
        assert.notDeepStrictEqual(clonedSampleResult.audits, sampleResult.audits);

        // Original audit results should be restored.
        const preparedResult = Util.prepareReportResult(clonedSampleResult);
        assert.deepStrictEqual(preparedResult.audits, sampleResult.audits);
      });

      it('corrects screenshots in the `filmstrip` auditDetails.type', () => {
        const clonedSampleResult = JSON.parse(JSON.stringify(sampleResult));

        // Strip filmstrip screenshots of data URL prefix.
        let filmstripCount = 0;
        for (const audit of Object.values(clonedSampleResult.audits)) {
          if (audit.details && audit.details.type === 'filmstrip') {
            filmstripCount++;
            for (const screenshot of audit.details.items) {
              screenshot.data = screenshot.data.slice('data:image/jpeg;base64,'.length);
            }
          }
        }
        assert.ok(filmstripCount > 0); // Make sure something's being tested.
        assert.notDeepStrictEqual(clonedSampleResult.audits, sampleResult.audits);

        // Original audit results should be restored.
        const preparedResult = Util.prepareReportResult(clonedSampleResult);
        assert.deepStrictEqual(preparedResult.audits, sampleResult.audits);
      });
    });

    it('appends stack pack descriptions to auditRefs', () => {
      const clonedSampleResult = JSON.parse(JSON.stringify(sampleResult));
      const iconDataURL = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"%3E%3C/svg%3E';
      clonedSampleResult.stackPacks = [{
        id: 'snackpack',
        title: 'SnackPack',
        iconDataURL,
        descriptions: {
          'unused-css-rules': 'Consider using snacks in packs.',
        },
      }];
      const preparedResult = Util.prepareReportResult(clonedSampleResult);

      const perfAuditRefs = preparedResult.categories.performance.auditRefs;
      const unusedCssRef = perfAuditRefs.find(ref => ref.id === 'unused-css-rules');
      assert.deepStrictEqual(unusedCssRef.stackPacks, [{
        title: 'SnackPack',
        iconDataURL,
        description: 'Consider using snacks in packs.',
      }]);

      // No stack pack on audit wth no stack pack.
      const interactiveRef = perfAuditRefs.find(ref => ref.id === 'interactive');
      assert.strictEqual(interactiveRef.stackPacks, undefined);
    });
  });

  describe('getTld', () => {
    it('returns the correct tld', () => {
      assert.equal(Util.getTld('example.com'), '.com');
      assert.equal(Util.getTld('example.co.uk'), '.co.uk');
      assert.equal(Util.getTld('example.com.br'), '.com.br');
      assert.equal(Util.getTld('example.tokyo.jp'), '.jp');
    });
  });

  describe('getRootDomain', () => {
    it('returns the correct rootDomain from a string', () => {
      assert.equal(Util.getRootDomain('https://www.example.com/index.html'), 'example.com');
      assert.equal(Util.getRootDomain('https://example.com'), 'example.com');
      assert.equal(Util.getRootDomain('https://www.example.co.uk'), 'example.co.uk');
      assert.equal(Util.getRootDomain('https://example.com.br/app/'), 'example.com.br');
      assert.equal(Util.getRootDomain('https://example.tokyo.jp'), 'tokyo.jp');
      assert.equal(Util.getRootDomain('https://sub.example.com'), 'example.com');
      assert.equal(Util.getRootDomain('https://sub.example.tokyo.jp'), 'tokyo.jp');
      assert.equal(Util.getRootDomain('http://localhost'), 'localhost');
      assert.equal(Util.getRootDomain('http://localhost:8080'), 'localhost');
    });

    it('returns the correct rootDomain from an URL object', () => {
      assert.equal(Util.getRootDomain(new URL('https://www.example.com/index.html')), 'example.com');
      assert.equal(Util.getRootDomain(new URL('https://example.com')), 'example.com');
      assert.equal(Util.getRootDomain(new URL('https://www.example.co.uk')), 'example.co.uk');
      assert.equal(Util.getRootDomain(new URL('https://example.com.br/app/')), 'example.com.br');
      assert.equal(Util.getRootDomain(new URL('https://example.tokyo.jp')), 'tokyo.jp');
      assert.equal(Util.getRootDomain(new URL('https://sub.example.com')), 'example.com');
      assert.equal(Util.getRootDomain(new URL('https://sub.example.tokyo.jp')), 'tokyo.jp');
      assert.equal(Util.getRootDomain(new URL('http://localhost')), 'localhost');
      assert.equal(Util.getRootDomain(new URL('http://localhost:8080')), 'localhost');
    });
  });

  describe('#splitMarkdownCodeSpans', () => {
    it('handles strings with no backticks in them', () => {
      expect(Util.splitMarkdownCodeSpans('regular text')).toEqual([
        {isCode: false, text: 'regular text'},
      ]);
    });

    it('does not split on a single backtick', () => {
      expect(Util.splitMarkdownCodeSpans('regular `text')).toEqual([
        {isCode: false, text: 'regular `text'},
      ]);
    });

    it('splits on backticked code', () => {
      expect(Util.splitMarkdownCodeSpans('regular `code` text')).toEqual([
        {isCode: false, text: 'regular '},
        {isCode: true, text: 'code'},
        {isCode: false, text: ' text'},
      ]);
    });

    it('splits on backticked code at the beginning of the string', () => {
      expect(Util.splitMarkdownCodeSpans('`start code` regular text')).toEqual([
        {isCode: true, text: 'start code'},
        {isCode: false, text: ' regular text'},
      ]);
    });

    it('splits on backticked code at the end of the string', () => {
      expect(Util.splitMarkdownCodeSpans('regular text `end code`')).toEqual([
        {isCode: false, text: 'regular text '},
        {isCode: true, text: 'end code'},
      ]);
    });

    it('does not split on a single backtick after split out backticked code', () => {
      expect(Util.splitMarkdownCodeSpans('regular text `code` and more `text')).toEqual([
        {isCode: false, text: 'regular text '},
        {isCode: true, text: 'code'},
        {isCode: false, text: ' and more `text'},
      ]);
    });

    it('splits on two instances of backticked code', () => {
      expect(Util.splitMarkdownCodeSpans('regular text `code` more text `and more code`')).toEqual([
        {isCode: false, text: 'regular text '},
        {isCode: true, text: 'code'},
        {isCode: false, text: ' more text '},
        {isCode: true, text: 'and more code'},
      ]);
    });

    it('splits on two directly adjacent instances of backticked code', () => {
      // eslint-disable-next-line max-len
      expect(Util.splitMarkdownCodeSpans('regular text `first code``second code` end text')).toEqual([
        {isCode: false, text: 'regular text '},
        {isCode: true, text: 'first code'},
        {isCode: true, text: 'second code'},
        {isCode: false, text: ' end text'},
      ]);
    });

    it('handles text only within backticks', () => {
      expect(Util.splitMarkdownCodeSpans('`first code``second code`')).toEqual([
        {isCode: true, text: 'first code'},
        {isCode: true, text: 'second code'},
      ]);
    });

    it('splits on two instances of backticked code separated by only a space', () => {
      // eslint-disable-next-line max-len
      expect(Util.splitMarkdownCodeSpans('`first code` `second code`')).toEqual([
        {isCode: true, text: 'first code'},
        {isCode: false, text: ' '},
        {isCode: true, text: 'second code'},
      ]);
    });
  });

  describe('#splitMarkdownLink', () => {
    it('handles strings with no links in them', () => {
      expect(Util.splitMarkdownLink('some text')).toEqual([
        {isLink: false, text: 'some text'},
      ]);
    });

    it('does not split on an incomplete markdown link', () => {
      expect(Util.splitMarkdownLink('some [not link text](text')).toEqual([
        {isLink: false, text: 'some [not link text](text'},
      ]);
    });

    it('splits on a markdown link', () => {
      expect(Util.splitMarkdownLink('some [link text](https://example.com) text')).toEqual([
        {isLink: false, text: 'some '},
        {isLink: true, text: 'link text', linkHref: 'https://example.com'},
        {isLink: false, text: ' text'},
      ]);
    });

    it('splits on an http markdown link', () => {
      expect(Util.splitMarkdownLink('you should [totally click here](http://never-mitm.com) now')).toEqual([
        {isLink: false, text: 'you should '},
        {isLink: true, text: 'totally click here', linkHref: 'http://never-mitm.com'},
        {isLink: false, text: ' now'},
      ]);
    });

    it('does not split on a non-http/https link', () => {
      expect(Util.splitMarkdownLink('some [link text](ftp://example.com) text')).toEqual([
        {isLink: false, text: 'some [link text](ftp://example.com) text'},
      ]);
    });

    it('does not split on a malformed markdown link', () => {
      expect(Util.splitMarkdownLink('some [link ]text](https://example.com')).toEqual([
        {isLink: false, text: 'some [link ]text](https://example.com'},
      ]);

      expect(Util.splitMarkdownLink('some [link text] (https://example.com')).toEqual([
        {isLink: false, text: 'some [link text] (https://example.com'},
      ]);
    });

    it('does not split on empty link text', () => {
      expect(Util.splitMarkdownLink('some [](https://example.com) empty link')).toEqual([
        {isLink: false, text: 'some [](https://example.com) empty link'},
      ]);
    });

    it('splits on a markdown link at the beginning of a string', () => {
      expect(Util.splitMarkdownLink('[link text](https://example.com) end text')).toEqual([
        {isLink: true, text: 'link text', linkHref: 'https://example.com'},
        {isLink: false, text: ' end text'},
      ]);
    });

    it('splits on a markdown link at the end of a string', () => {
      expect(Util.splitMarkdownLink('start text [link text](https://example.com)')).toEqual([
        {isLink: false, text: 'start text '},
        {isLink: true, text: 'link text', linkHref: 'https://example.com'},
      ]);
    });

    it('handles a string consisting only of a markdown link', () => {
      expect(Util.splitMarkdownLink(`[I'm only a link](https://example.com)`)).toEqual([
        {isLink: true, text: `I'm only a link`, linkHref: 'https://example.com'},
      ]);
    });

    it('handles a string starting and ending with a markdown link', () => {
      expect(Util.splitMarkdownLink('[first link](https://first.com) other text [second link](https://second.com)')).toEqual([
        {isLink: true, text: 'first link', linkHref: 'https://first.com'},
        {isLink: false, text: ' other text '},
        {isLink: true, text: 'second link', linkHref: 'https://second.com'},
      ]);
    });

    it('handles a string with adjacent markdown links', () => {
      expect(Util.splitMarkdownLink('start text [first link](https://first.com)[second link](https://second.com) and scene')).toEqual([
        {isLink: false, text: 'start text '},
        {isLink: true, text: 'first link', linkHref: 'https://first.com'},
        {isLink: true, text: 'second link', linkHref: 'https://second.com'},
        {isLink: false, text: ' and scene'},
      ]);
    });
  });
});
