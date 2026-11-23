/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import {expect} from 'expect';

import {UnusedCSS} from '../../computed/unused-css.js';

describe('UnusedCSS computed artifact', () => {
  /**
   * @param {string} content
   * @param {number} length
   */
  function generate(content, length) {
    const arr = [];
    for (let i = 0; i < length; i++) {
      arr.push(content);
    }
    return arr.join('');
  }

  const preview = UnusedCSS.determineContentPreview;

  describe('#determineContentPreview', () => {
    /**
     * @param {string} actual
     * @param {string} expected
     */
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
    /** @typedef {LH.Util.FirstParamType<typeof UnusedCSS.mapSheetToResult>} StyleSheetInfo */
    /** @type {StyleSheetInfo} */
    let baseSheet;
    const baseUrl = 'http://g.co/';

    /**
     * @param {{header?: Partial<LH.Crdp.CSS.CSSStyleSheetHeader>, content?: string, usedRules?: Array<{startOffset: number, endOffset: number}>}} overrides
     */
    function map(overrides) {
      const header = {
        ...baseSheet.header,
        ...overrides.header,
      };
      if (overrides.header?.sourceURL) {
        header.sourceURL = baseUrl + overrides.header.sourceURL;
      }
      const usedRules = (overrides.usedRules ?? baseSheet.usedRules).map(r => ({
        styleSheetId: '1',
        used: true,
        ...r,
      }));
      const sheet = {
        ...baseSheet,
        ...overrides,
        header,
        usedRules,
      };
      return UnusedCSS.mapSheetToResult(sheet);
    }

    beforeEach(() => {
      baseSheet = {
        header: {
          styleSheetId: '1',
          frameId: '1',
          sourceURL: baseUrl,
          origin: 'regular',
          title: '',
          disabled: false,
          isInline: false,
          isMutable: false,
          isConstructed: false,
          startLine: 0,
          startColumn: 0,
          length: 5,
          endLine: 0,
          endColumn: 5,
        },
        content: 'dummy',
        usedRules: [],
        networkRecord: undefined,
      };
    });

    it('correctly computes wastedBytes', () => {
      assert.equal(map({usedRules: []}).wastedPercent, 100);
      assert.equal(map({usedRules: [{startOffset: 0, endOffset: 3}]}).wastedPercent, 40);
      assert.equal(map({usedRules: [{startOffset: 0, endOffset: 5}]}).wastedPercent, 0);
    });

    it('merges overlapping and duplicate usedRule ranges', () => {
      // Nested child rule inside parent rule range, plus duplicated parent rule range.
      assert.equal(map({
        usedRules: [
          {startOffset: 0, endOffset: 3},
          {startOffset: 1, endOffset: 2},
          {startOffset: 0, endOffset: 3},
        ],
      }).wastedPercent, 40);

      // Partially overlapping ranges: [0, 2] and [1, 3] => 3 used bytes out of 5.
      assert.equal(map({
        usedRules: [
          {startOffset: 1, endOffset: 3},
          {startOffset: 0, endOffset: 2},
        ],
      }).wastedPercent, 40);
    });

    it('correctly computes url', () => {
      const expectedPreview = 'dummy';
      assert.strictEqual(map({header: {sourceURL: '', isInline: false}}).url, expectedPreview);
      assert.strictEqual(map({header: {sourceURL: 'a', isInline: true}}).url, expectedPreview);
      assert.equal(map({header: {sourceURL: 'foobar'}}).url, 'http://g.co/foobar');
    });
  });
});
