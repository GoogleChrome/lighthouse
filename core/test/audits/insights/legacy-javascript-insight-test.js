/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {detectLegacyJavaScript} from '../../../lib/legacy-javascript/legacy-javascript.js';
import SDK from '../../../lib/cdt/SDK.js';

/**
 * @param {Array<{url: string, code: string, map?: LH.Artifacts.RawSourceMap}>} scripts
 */
const getResult = scripts => {
  // Note: doesn't really use the audit, but whatever.
  const items = scripts.map(script => {
    const map = script.map ? new SDK.SourceMap(script.url, script.url + '.map', script.map) : null;
    const result = detectLegacyJavaScript(script.code, map);
    return {
      url: script.url,
      wastedBytes: result.estimatedByteSavings,
      subItems: {
        type: 'subitems',
        items: result.matches.map(m => ({
          signal: m.name,
          location: {line: m.line, column: m.column},
        })),
      },
    };
  }).filter(item => item.wastedBytes);
  return {items};
};

describe('LegacyJavaScript audit', () => {
  it('passes code with no polyfills', () => {
    const result = getResult([
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
    expect(result.items).toHaveLength(0);
  });

  it('legacy polyfill in third party resource does not contribute to wasted bytes', () => {
    const result = getResult([
      {
        code: 'String.prototype.repeat = function() {}',
        url: 'https://www.googletagmanager.com/a.js',
      },
    ]);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchInlineSnapshot(`
Object {
  "subItems": Object {
    "items": Array [
      Object {
        "location": Object {
          "column": 0,
          "line": 0,
        },
        "signal": "String.prototype.repeat",
      },
    ],
    "type": "subitems",
  },
  "url": "https://www.googletagmanager.com/a.js",
  "wastedBytes": 27910,
}
`);
  });

  it('legacy polyfill in first party resource contributes to wasted bytes', () => {
    const result = getResult([
      {
        code: 'String.prototype.repeat = function() {}',
        url: 'https://www.example.com/a.js',
      },
    ]);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].subItems.items[0].signal).toEqual('String.prototype.repeat');
  });

  it('fails code with multiple legacy polyfills', () => {
    const result = getResult([
      {
        code: 'String.prototype.repeat = function() {}; Array.prototype.forEach = function() {}',
        url: 'https://www.example.com/a.js',
      },
    ]);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].subItems.items).toMatchObject([
      {signal: 'Array.prototype.forEach'},
      {signal: 'String.prototype.repeat'},
    ]);
  });

  it('uses source maps to identify polyfills', () => {
    const map = {
      sources: ['node_modules/blah/blah/es.string.repeat.js'],
      mappings: 'blah',
    };
    const script = {code: 'blah blah', url: 'https://www.example.com/0.js', map};
    const result = getResult([script]);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].subItems.items).toMatchObject([
      {
        signal: 'String.prototype.repeat',
        location: {line: 0, column: 0},
      },
    ]);
  });
});
