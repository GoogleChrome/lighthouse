/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import assert from 'assert/strict';
import {createRequire} from 'module';

import {computeCSSTokenLength, computeJSTokenLength} from '../../lib/minification-estimator.js'; // eslint-disable-line max-len
import {LH_ROOT} from '../../../shared/root.js';

const require = createRequire(import.meta.url);

const angularJs = fs.readFileSync(require.resolve('angular/angular.js'), 'utf8');
const courseheroFilename =
  `${LH_ROOT}/core/test/fixtures/source-maps/coursehero-bundle-2.js`;
const courseheroJs = fs.readFileSync(courseheroFilename, 'utf8');

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

    it('should handle regex as switch case clause edge cases', () => {
      const js = `
        switch(true){case/^hello!/.test("hello!"):"///123456789"}
      `;

      assert.equal(computeJSTokenLength(js), 57);
      assert.equal(computeJSTokenLength(js), js.trim().length);
    });

    it('should handle large, real, unminified javscript files', () => {
      assert.equal(angularJs.length, 1374505);
      const minificationPct = 1 - computeJSTokenLength(angularJs) / angularJs.length;
      // Unminified source script. estimated 75.3% smaller minified
      expect(minificationPct).toBeCloseTo(0.753);
    });

    it('should handle large, real, already-minified javscript files', () => {
      assert.equal(courseheroJs.length, 439832);
      const minificationPct = 1 - computeJSTokenLength(courseheroJs) / courseheroJs.length;
      // Already-minified source script. estimated 1% smaller minified
      expect(minificationPct).toBeCloseTo(0.01);
    });

    it('should handle nested template literals', () => {
      // Basic nested literals
      const nestedTemplates = 'window.myString=`foo${` bar ${` baz ${` bam `} `} `} `';
      expect(computeJSTokenLength(nestedTemplates)).toEqual(nestedTemplates.length);

      // Can get rid of 5 spaces after inner code braces
      const nestedWithCode = 'window.myString=`foo${` bar ${{}     }`}`';
      expect(computeJSTokenLength(nestedWithCode)).toEqual(nestedWithCode.length - 5);

      // Ignore braces in string
      const nestedTemplatesBrace = 'window.myString=`{foo${` }bar ${` baz ${` bam `} `} `} `';
      expect(computeJSTokenLength(nestedTemplatesBrace)).toEqual(nestedTemplatesBrace.length);

      // Handles multiple string braces (Has 4 spaces)
      const nestedStrings = 'window.myString=`${({foo: bar.map(() => ({baz: `${\'}\'}`}))})}`';
      expect(computeJSTokenLength(nestedStrings)).toEqual(nestedStrings.length - 4);

      // Handles braces outside template literal (2 spaces + 4 spaces)
      const outerBraces = '{  foo:{bar:`baz ${bam.get({}    )}`}}';
      expect(computeJSTokenLength(outerBraces)).toEqual(outerBraces.length - 6);
    });

    it('should handle else keyword followed by a regex pattern in scripts', () => {
      const script = '} else/^hello!/.test(n)?(d=element.parseFromString("Hi/Hello there!")';
      const minified = '}else/^hello!/.test(n)?(d=element.parseFromString("Hi/Hello there!")';
      expect(computeJSTokenLength(script)).toEqual(minified.length);
    });
  });
});
