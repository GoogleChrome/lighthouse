/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {detectLegacyJavaScript} from '../../lib/legacy-javascript.js';
import SDK from '../../lib/cdt/SDK.js';
import {readJson} from '../test-utils.js';

/**
 * @param {Array<{code: string, map?: LH.Artifacts.RawSourceMap}>} scripts
 * @return {import('../../lib/legacy-javascript.js').Result[]}
 */
const getResults = scripts => {
  return scripts.map(script => {
    const map = script.map ? new SDK.SourceMap('', '', script.map) : null;
    return {...detectLegacyJavaScript(script.code, map), snippet: script.code.slice(0, 20)};
  }).filter(result => result.matches.length);
};

/**
 * @param {string[]} codeSnippets
 * @return {string[]}
 */
const createVariants = codeSnippets => {
  const variants = [];

  for (const codeSnippet of codeSnippets) {
    // Explicitly don't create a variant for just `codeSnippet`,
    // because making the patterns work with a starting anchor (^)
    // complicates the expressions more than its worth.
    variants.push(`;${codeSnippet}`);
    variants.push(` ${codeSnippet}`);
  }

  return variants;
};
describe('detectLegacyJavaScript', () => {
  it('passes code with no polyfills', () => {
    const results = getResults([
      {code: 'var message = "hello world"; console.log(message);'},
      {code: 'SomeGlobal = function() {}'},
      {code: 'SomeClass.prototype.someFn = function() {}'},
      {code: 'Object.defineProperty(SomeClass.prototype, "someFn", function() {})'},
    ]);
    expect(results).toHaveLength(0);
  });

  it('legacy polyfill in first party resource contributes to wasted bytes', () => {
    const results = getResults([
      {code: 'String.prototype.repeat = function() {}'},
    ]);
    expect(results).toHaveLength(1);
    expect(results[0].matches[0].name).toEqual('String.prototype.repeat');
    expect(results[0].estimatedByteSavings).toMatchInlineSnapshot(`27910`);
  });

  it('fails code with multiple legacy polyfills', () => {
    const results = getResults([
      {code: 'String.prototype.repeat = function() {}; Array.prototype.forEach = function() {}'},
    ]);
    expect(results).toHaveLength(1);
    expect(results[0].matches).toMatchObject([
      {name: 'Array.prototype.forEach'},
      {name: 'String.prototype.repeat'},
    ]);
  });

  it('counts multiple of the same polyfill from the same script only once', () => {
    const results = getResults([
      {
        code: (() => {
          // eslint-disable-next-line no-extend-native
          String.prototype.repeat = function() {};
          // eslint-disable-next-line no-extend-native
          Object.defineProperty(String.prototype, 'repeat', function() {});
        }).toString(),
      },
    ]);
    expect(results).toHaveLength(1);
  });

  it('should identify polyfills in multiple patterns', () => {
    const codeSnippets = [
      'String.prototype.repeat = function() {}',
      'String.prototype["repeat"] = function() {}',
      'String.prototype["repeat"] = function() {}',
      'Object.defineProperty(String.prototype, "repeat", function() {})',
      'Object.defineProperty(String.prototype, "repeat", function() {})',
      'String.raw = function() {}',

      // es-shims (object.entries)
      'no(Object,{entries:r},{entries:function',
      'no(Array.prototype,{findLast:r},{findLast:function',

      // Class polyfills.
      // Currently not used. See create-polyfill-module-data.js
      // 'Object.defineProperty(window, \'WeakSet\', function() {})',
      // 'WeakSet = function() {}',
      // 'window.WeakSet = function() {}',
      // Collection polyfills.
      // 'collection("WeakSet",(function(init){return',
    ];
    const variants = createVariants(codeSnippets);
    const scripts = variants.map((code, i) => {
      return {code, url: `https://www.example.com/${i}.js`};
    });
    const results = getResults(scripts);
    expect(results).toHaveLength(variants.length);
  });

  it('should not misidentify legacy code', () => {
    const codeSnippets = [
      'i.prototype.toArrayBuffer = blah',
      'this.childListChangeMap=void 0',
      't.toPromise=u,t.makePromise=u,t.fromPromise=function(e){return new o.default',
      'var n=new Error(h.apply(void 0,[d].concat(f)));n.name="Invariant Violation";',
      'var b=typeof Map==="function"?new Map():void 0',
      'd.Promise=s;var y,g,v,b=function(n,o,t){if(function(t){if("function"!=typeof t)th',
    ];
    const variants = createVariants(codeSnippets);
    const scripts = variants.map((code, i) => {
      return {code, url: `https://www.example.com/${i}.js`};
    });
    const results = getResults(scripts);
    expect(results).toHaveLength(0);
  });

  it('uses source maps to identify polyfills', () => {
    const map = {
      version: 3,
      sources: ['node_modules/blah/blah/es.string.repeat.js'],
      mappings: 'blah',
    };
    const script = {code: 'blah blah', map};
    const results = getResults([script]);

    expect(results).toHaveLength(1);
    expect(results[0].matches).toMatchObject([
      {name: 'String.prototype.repeat', line: 0, column: 0},
    ]);
  });

  it('uses location from pattern matching over source map', () => {
    const map = {
      version: 3,
      sources: ['node_modules/blah/blah/es6.string.repeat.js'],
      mappings: 'blah',
    };
    const script = {
      code: 'some code;\nString.prototype.repeat = function() {}',
      url: 'https://www.example.com/0.js',
      map,
    };
    const results = getResults([script]);

    expect(results).toHaveLength(1);
    expect(results[0].matches).toMatchObject([
      {name: 'String.prototype.repeat', line: 1, column: 0},
    ]);
  });

  it('detects non-corejs modules from source maps', () => {
    const map = {
      version: 3,
      sources: [
        'node_modules/focus-visible/dist/focus-visible.js',
        'node_modules/esnext.array.find-last/index.js',
        'node_modules/es.object.entries/index.js',
      ],
      mappings: 'blah',
    };
    const script = {
      code: '// blah blah blah',
      url: 'https://www.example.com/0.js',
      map,
    };
    const results = getResults([script]);

    expect(results).toHaveLength(1);
    expect(results[0].matches).toMatchObject([
      {name: 'Array.prototype.findLast'},
      {name: 'Object.entries'},
      {name: 'focus-visible'},
    ]);
    expect(results[0].estimatedByteSavings).toBe(36369);
  });
});

describe('LegacyJavaScript signals', () => {
  describe('expect baseline variants to not have any signals', () => {
    const expectedMissingSignals = [
      'core-js-3-preset-env/baseline-true-bugfixes-false',
      'core-js-3-preset-env/baseline-true-bugfixes-true',
    ];

    for (const summaryFilename of ['summary-signals.json', 'summary-signals-nomaps.json']) {
      it(summaryFilename, () => {
        const signalSummary =
          readJson(`core/scripts/legacy-javascript/${summaryFilename}`);
        const failingVariants = [];
        for (const expectedVariant of expectedMissingSignals) {
          const variant = signalSummary.variants.find(v => v.dir === expectedVariant);
          if (variant.signals.length) {
            failingVariants.push(variant);
          }
        }

        if (failingVariants.length) {
          throw new Error([
            'Expected the following variants to have no signals:',
            '',
            ...failingVariants.map(v => `${v.name} ${v.bundle} (got: ${v.signals})`),
          ].join('\n'));
        }
      });
    }
  });

  describe('expect only-polyfill/only-plugin variants to detect the target signal', () => {
    for (const summaryFilename of ['summary-signals.json', 'summary-signals-nomaps.json']) {
      it(summaryFilename, () => {
        const signalSummary = readJson(`core/scripts/legacy-javascript/${summaryFilename}`);
        const failingVariants = [];

        const polyfillVariants = signalSummary.variants
          .filter(v => v.group.endsWith('only-polyfill'));
        for (const variant of polyfillVariants) {
          if (!variant.signals.includes(variant.name)) {
            failingVariants.push(variant);
          }
        }
        if (failingVariants.length) {
          throw new Error([
            'Expected the following variants to detect its polyfill:',
            '',
            ...failingVariants.map(v => `${v.name} ${v.bundle} (got: ${v.signals})`),
          ].join('\n'));
        }

        const transformVariants = signalSummary.variants
          .filter(v => v.group === 'only-plugin');
        for (const variant of transformVariants) {
          if (!variant.signals.includes(variant.name)) {
            failingVariants.push(variant);
          }
        }
        if (failingVariants.length) {
          throw new Error([
            'Expected the following variants to detect its transform:',
            '',
            ...failingVariants.map(v => `${v.name} ${v.bundle} (got: ${v.signals})`),
          ].join('\n'));
        }
      });
    }
  });
});
