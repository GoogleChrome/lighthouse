/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const fs = require('fs');
const assert = require('assert').strict;
const {computeCSSTokenLength, computeJSTokenLength} = require('../../lib/minification-estimator.js'); // eslint-disable-line max-len

const angularFullScript = fs.readFileSync(require.resolve('angular/angular.js'), 'utf8');

/* eslint-env jest */

describe('minification estimator', () => {
  describe('CSS', () => {
    it('should compute length of meaningful content', () => {
      const full = `
        /*
         * a complicated comment
         * that is
         * several
         * lines
         */
        .my-class {
          /* a simple comment */
          width: 100px;
          height: 100px;
        }
      `;

      const minified = '.my-class{width:100px;height:100px;}';
      assert.equal(computeCSSTokenLength(full), minified.length);
    });

    it('should handle string edge cases', () => {
      const pairs = [
        ['.my-class { content: "/*"; }', '.my-class{content:"/*";}'],
        ['.my-class { content: \'/* */\'; }', '.my-class{content:\'/* */\';}'],
        ['.my-class { content: "/*\\\\a"; }', '.my-class{content:"/*\\\\a";}'],
        ['.my-class { content: "/*\\"a"; }', '.my-class{content:"/*\\"a";}'],
        ['.my-class { content: "hello }', '.my-class { content: "hello }'],
        ['.my-class { content: "hello" }', '.my-class{content:"hello"}'],
      ];

      for (const [full, minified] of pairs) {
        assert.equal(
          computeCSSTokenLength(full),
          minified.length,
          `did not handle ${full} properly`
        );
      }
    });

    it('should handle comment edge cases', () => {
      const full = `
        /* here is a cool "string I found" */
        .my-class {
          content: "/*";
        }
      `;

      const minified = '.my-class{content:"/*";}';
      assert.equal(computeCSSTokenLength(full), minified.length);
    });

    it('should handle license comments', () => {
      const full = `
        /*!
         * @LICENSE
         * Apache 2.0
         */
        .my-class {
          width: 100px;
        }
      `;

      const minified = `/*!
         * @LICENSE
         * Apache 2.0
         */.my-class{width:100px;}`;
      assert.equal(computeCSSTokenLength(full), minified.length);
    });

    it('should handle unbalanced comments', () => {
      const full = `
        /*
        .my-class {
          width: 100px;
        }
      `;

      assert.equal(computeCSSTokenLength(full), full.length);
    });

    it('should handle data URIs', () => {
      const uri = 'data:image/jpeg;base64,asdfadiosgjwiojasfaasd';
      const full = `
        .my-other-class {
          background: data("${uri}");
          height: 100px;
        }
     `;

      const minified = `.my-other-class{background:data("${uri}");height:100px;}`;
      assert.equal(computeCSSTokenLength(full), minified.length);
    });

    it('should handle reeally long strings', () => {
      let hugeCss = '';
      for (let i = 0; i < 10000; i++) {
        hugeCss += `.my-class-${i} { width: 100px; height: 100px; }\n`;
      }

      assert.ok(computeCSSTokenLength(hugeCss) < 0.9 * hugeCss.length);
    });
  });

  describe('JS', () => {
    it('should compute the length of tokens', () => {
      const js = `
        const foo = 1;
        const bar = 2;
        console.log(foo + bar);
      `;

      const tokensOnly = 'constfoo=1;constbar=2;console.log(foo+bar);';
      assert.equal(computeJSTokenLength(js), tokensOnly.length);
    });

    it('should handle single-line comments', () => {
      const js = `
        // ignore me
        12345
      `;

      assert.equal(computeJSTokenLength(js), 5);
    });

    it('should handle multi-line comments', () => {
      const js = `
        /* ignore
         * me
         * too
         */
        12345
      `;

      assert.equal(computeJSTokenLength(js), 5);
    });

    it('should handle strings', () => {
      const pairs = [
        [`'//123' // ignored`, 7], // single quotes
        [`"//123" // ignored`, 7], // double quotes
        [`'     ' // ignored`, 7], // whitespace in strings count
        [`"\\" // not ignored"`, 19], // escaped quotes handled
      ];

      for (const [js, len] of pairs) {
        assert.equal(computeJSTokenLength(js), len, `expected '${js}' to have token length ${len}`);
      }
    });

    it('should handle template literals', () => {
      const js = `
        \`/* don't ignore this */\` // 25 characters
        12345
      `;

      assert.equal(computeJSTokenLength(js), 25 + 5);
    });

    it('should handle regular expressions', () => {
      const js = `
        /regex '/ // this should be in comment not string 123456789
      `;

      assert.equal(computeJSTokenLength(js), 9);
    });

    it('should handle regular expression character classes', () => {
      // test a slash inside of a character class to make sure it doesn't end the regex
      // The below is the string-equivalent of
      const _ = /regex [^/]\//.test('this should be in string not comment 123456789');

      const js = `
        /regex [^/]\\//.test('this should be in string not comment 123456789')
      `;

      assert.equal(computeJSTokenLength(js), 69);
      assert.equal(computeJSTokenLength(js), js.trim().length);
    });

    it('should handle escaped regular expression characters', () => {
      // test an escaped [ to make sure we can still close regexes
      // This is the string-equivalent of
      const _ = /regex \[/; // this should be in comment not string 123456789

      const js = `
        /regex \\[/ // this should be in comment not string 123456789
      `;

      assert.equal(computeJSTokenLength(js), 10);
    });

    it('should distinguish regex from divide', () => {
      const js = `
        return 1 / 2 // hello
      `;

      assert.equal(computeJSTokenLength(js), 9);
    });

    it('should handle large, real javscript files', () => {
      assert.equal(angularFullScript.length, 1371888);
      // 1 - 334968 / 1364217 = estimated 75% smaller minified
      assert.equal(computeJSTokenLength(angularFullScript), 337959);
    });
  });
});
