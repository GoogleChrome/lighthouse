/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const assert = require('assert').strict;
const UnusedCSS = require('../../computed/unused-css.js');

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
        assert.ok(actual.includes(line.trim()), `${line} is found in preview`);
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
            } ...
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
              font-size: 20px; ... } ...
          `.trim());
    });

    it('correctly computes long comment content preview', () => {
      const longContent = `
          /**
           * @license ${generate('a', 100)}
           */
          `.trim();

      assert.ok(/aaa\.\.\./.test(preview(longContent)));
    });
  });

  describe('#mapSheetToResult', () => {
    let baseSheet;
    const baseUrl = 'http://g.co/';

    function map(overrides, url = baseUrl) {
      if (overrides.header && overrides.header.sourceURL) {
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
      assert.strictEqual(map({header: {sourceURL: ''}}).url, expectedPreview);
      assert.strictEqual(map({header: {sourceURL: 'a'}}, 'http://g.co/a').url, expectedPreview);
      assert.equal(map({header: {sourceURL: 'foobar'}}).url, 'http://g.co/foobar');
    });
  });
});
