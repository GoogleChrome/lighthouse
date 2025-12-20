/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const assert = require('assert').strict;
const LegacyJavascript = require('../../audits/legacy-javascript.js');
const networkRecordsToDevtoolsLog = require('../network-records-to-devtools-log.js');

/**
 * @param {Array<{url: string, code: string, map?: LH.Artifacts.RawSourceMap}>} scripts
 * @return {LH.Artifacts}
 */
const createArtifacts = (scripts) => {
  const networkRecords = scripts.map(({url}, index) => ({
    requestId: String(index),
    url,
  }));
  return {
    URL: {finalUrl: 'https://www.example.com', requestedUrl: 'https://www.example.com'},
    devtoolsLogs: {defaultPass: networkRecordsToDevtoolsLog(networkRecords)},
    ScriptElements: scripts.map(({url, code}, index) => {
      return {
        src: url,
        content: code,
        requestId: String(index),
      };
    }),
    SourceMaps: scripts.reduce((acc, {url, map}) => {
      if (!map) return acc;
      acc.push({
        scriptUrl: url,
        map,
      });
      return acc;
    }, []),
  };
};

/**
 * @param {string[]} codeSnippets
 * @return {string[]}
 */
const createVariants = (codeSnippets) => {
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

/* eslint-env jest */
describe('LegacyJavaScript audit', () => {
  it('passes code with no polyfills', async () => {
    const artifacts = createArtifacts([
      {
        code: 'var message = "hello world"; console.log(message);',
        url: 'https://www.example.com/a.js',
      },
      {
        code: 'SomeGlobal = function() {}',
        url: 'https://www.example.com/a.js',
      },
      {
        code: 'SomeClass.prototype.someFn = function() {}',
        url: 'https://www.example.com/a.js',
      },
      {
        code: 'Object.defineProperty(SomeClass.prototype, "someFn", function() {})',
        url: 'https://www.example.com/a.js',
      },
    ]);
    const result = await LegacyJavascript.audit(artifacts, {computedCache: new Map()});
    assert.equal(result.score, 1);
    assert.equal(result.extendedInfo.signalCount, 0);
  });

  it('passes code with a legacy polyfill in third party resource', async () => {
    const artifacts = createArtifacts([
      {
        code: 'String.prototype.repeat = function() {}',
        url: 'https://www.googletagmanager.com/a.js',
      },
    ]);
    const result = await LegacyJavascript.audit(artifacts, {computedCache: new Map()});
    assert.equal(result.score, 1);
    assert.equal(result.extendedInfo.signalCount, 1);
  });

  it('fails code with a legacy polyfill', async () => {
    const artifacts = createArtifacts([
      {
        code: 'String.prototype.repeat = function() {}',
        url: 'https://www.example.com/a.js',
      },
    ]);
    const result = await LegacyJavascript.audit(artifacts, {computedCache: new Map()});
    assert.equal(result.score, 0);
    assert.equal(result.extendedInfo.signalCount, 1);
    expect(result.details.items[0].signals).toEqual(['String.prototype.repeat']);
  });

  it('fails code with multiple legacy polyfills', async () => {
    const artifacts = createArtifacts([
      {
        code: 'String.prototype.repeat = function() {}; String.prototype.includes = function() {}',
        url: 'https://www.example.com/a.js',
      },
    ]);
    const result = await LegacyJavascript.audit(artifacts, {computedCache: new Map()});
    assert.equal(result.score, 0);
    assert.equal(result.extendedInfo.signalCount, 2);
  });

  it('counts multiple of the same polyfill from the same script only once', async () => {
    const artifacts = createArtifacts([
      {
        code: (() => {
          // eslint-disable-next-line no-extend-native
          String.prototype.repeat = function() {};
          // eslint-disable-next-line no-extend-native
          Object.defineProperty(String.prototype, 'repeat', function() {});
        }),
        url: 'https://www.example.com/a.js',
      },
    ]);
    const result = await LegacyJavascript.audit(artifacts, {computedCache: new Map()});
    assert.equal(result.score, 0);
    assert.equal(result.extendedInfo.signalCount, 1);
  });

  it('should identify polyfills in multiple patterns', async () => {
    const codeSnippets = [
      'String.prototype.repeat = function() {}',
      'String.prototype["repeat"] = function() {}',
      'String.prototype[\'repeat\'] = function() {}',
      'Object.defineProperty(String.prototype, "repeat", function() {})',
      'Object.defineProperty(String.prototype, \'repeat\', function() {})',
      'Object.defineProperty(window, \'WeakMap\', function() {})',
      '$export($export.S,"Object",{values:function values(t){return i(t)}})',
      'WeakMap = function() {}',
      'window.WeakMap = function() {}',
      'function WeakMap() {}',
      'String.raw = function() {}',
    ];
    const variants = createVariants(codeSnippets);
    const scripts = variants.map((code, i) => {
      return {code, url: `https://www.example.com/${i}.js`};
    });
    const getCodeForUrl = url => scripts.find(script => script.url === url).code;
    const artifacts = createArtifacts(scripts);

    const result = await LegacyJavascript.audit(artifacts, {computedCache: new Map()});
    expect(result.details.items.map(item => getCodeForUrl(item.url)))
      .toEqual(scripts.map(script => getCodeForUrl(script.url)));
    assert.equal(result.score, 0);
  });

  it('should not misidentify legacy code', async () => {
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
    const getCodeForUrl = url => scripts.find(script => script.url === url).code;
    const artifacts = createArtifacts(scripts);

    const result = await LegacyJavascript.audit(artifacts, {computedCache: new Map()});
    expect(result.details.items.map(item => getCodeForUrl(item.url))).toEqual([]);
    assert.equal(result.score, 1);
  });

  it('uses source maps to identify polyfills', async () => {
    const map = {
      sources: [
        'node_modules/blah/blah/es6.string.repeat.js',
      ],
      mappings: 'blah',
    };
    const script = {code: 'blah blah', url: 'https://www.example.com/0.js', map};
    const artifacts = createArtifacts([script]);

    const result = await LegacyJavascript.audit(artifacts, {computedCache: new Map()});
    expect(result.details.items[0].signals).toEqual(['String.prototype.repeat']);
    expect(result.details.items[0].locations).toMatchObject([{line: 0, column: 0}]);
  });

  it('uses location from pattern matching over source map', async () => {
    const map = {
      sources: [
        'node_modules/blah/blah/es6.string.repeat.js',
      ],
      mappings: 'blah',
    };
    const script = {
      code: 'some code;\nString.prototype.repeat = function() {}',
      url: 'https://www.example.com/0.js',
      map,
    };
    const artifacts = createArtifacts([script]);

    const result = await LegacyJavascript.audit(artifacts, {computedCache: new Map()});
    expect(result.details.items[0].signals).toEqual(['String.prototype.repeat']);
    expect(result.details.items[0].locations).toMatchObject([{line: 1, column: 0}]);
  });
});

describe('LegacyJavaScript signals', () => {
  it('expect babel-preset-env = true variant to not have any signals', () => {
    for (const summaryFilename of ['summary-signals.json', 'summary-signals-nomaps.json']) {
      const signalSummary = require(`../../scripts/legacy-javascript/${summaryFilename}`);
      const expectedMissingSignals = [
        'core-js-2-preset-env-esmodules/true',
        'core-js-3-preset-env-esmodules/true',
      ];
      for (const expectedVariant of expectedMissingSignals) {
        expect(signalSummary.variantsMissingSignals).toContain(expectedVariant);
      }
    }
  });
});
