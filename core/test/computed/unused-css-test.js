/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import {expect} from 'expect';

import {UnusedCSS} from '../../computed/unused-css.js';

describe('UnusedCSS computed artifact', () => {
  function generate(content, length) {
    const arr = [];
    for (let i = 0; i < length; i++) {
      arr.push(content);
    }
    return arr.join('');
  }

  const preview = UnusedCSS.determineContentPreview;

  describe('#determineContentPreview', () => {
    function assertLinesContained(actual, expected) {
      expected.split('\n').forEach(line => {
        expect(actual).toContain(line.trim());
      });
    }

    it('correctly computes short content preview', () => {
      const shortContent = `
            html, body {
              background: green;
            }
          `.trim();

      assertLinesContained(preview(shortContent), shortContent);
    });

    it('correctly computes long content preview', () => {
      const longContent = `
            body {
              color: white;
            }

            html {
              content: '${generate('random', 50)}';
            }
          `.trim();

      assertLinesContained(preview(longContent), `
            body {
              color: white;
            } …
          `.trim());
    });

    it('correctly computes long rule content preview', () => {
      const longContent = `
            body {
              color: white;
              font-size: 20px;
              content: '${generate('random', 50)}';
            }
          `.trim();

      assertLinesContained(preview(longContent), `
            body {
              color: white;
              font-size: 20px; … } …
          `.trim());
    });

    it('correctly computes long comment content preview', () => {
      const longContent = `
          /**
           * @license ${generate('a', 100)}
           */
          `.trim();

      assert.ok(/aaa…/.test(preview(longContent)));
    });
  });

  describe('#mapSheetToResult', () => {
    let baseSheet;
    const baseUrl = 'http://g.co/';

    function map(overrides, url = baseUrl) {
      if (overrides.header?.sourceURL) {
        overrides.header.sourceURL = baseUrl + overrides.header.sourceURL;
      }
      return UnusedCSS.mapSheetToResult(Object.assign(baseSheet, overrides), url);
    }

    beforeEach(() => {
      baseSheet = {
        header: {sourceURL: baseUrl},
        content: 'dummy',
        usedRules: [],
      };
    });

    it('correctly computes wastedBytes', () => {
      assert.equal(map({usedRules: []}).wastedPercent, 100);
      assert.equal(map({usedRules: [{startOffset: 0, endOffset: 3}]}).wastedPercent, 40);
      assert.equal(map({usedRules: [{startOffset: 0, endOffset: 5}]}).wastedPercent, 0);
    });

    it('correctly computes url', () => {
      const expectedPreview = 'dummy';
      assert.strictEqual(map({header: {sourceURL: '', isInline: false}}).url, expectedPreview);
      assert.strictEqual(map({header: {sourceURL: 'a', isInline: true}}, 'http://g.co/a').url, expectedPreview);
      assert.equal(map({header: {sourceURL: 'foobar'}}).url, 'http://g.co/foobar');
    });
  });
});
