/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import LegacyJavascript from '../../../audits/byte-efficiency/legacy-javascript.js';
import {networkRecordsToDevtoolsLog} from '../../network-records-to-devtools-log.js';

/**
 * @param {Array<{url: string, code: string, map?: LH.Artifacts.RawSourceMap}>} scripts
 * @return {Promise<LH.Audits.ByteEfficiencyProduct>}
 */
const getResult = scripts => {
  const mainDocumentUrl = 'https://www.example.com';
  const networkRecords = [
    {url: mainDocumentUrl, resourceType: 'Document'},
    ...scripts.map(({url}, index) => ({
      requestId: String(index),
      url,
      responseHeaders: [],
    })),
  ];
  const artifacts = {
    GatherContext: {gatherMode: 'navigation'},
    URL: {finalDisplayedUrl: mainDocumentUrl, requestedUrl: mainDocumentUrl},
    DevtoolsLog: networkRecordsToDevtoolsLog(networkRecords),
    Scripts: scripts.map(({url, code}, index) => {
      return {
        scriptId: String(index),
        url,
        content: code,
        length: code.length,
      };
    }),
    SourceMaps: scripts.reduce((acc, {url, map}, index) => {
      if (!map) return acc;
      acc.push({
        scriptId: String(index),
        scriptUrl: url,
        map,
      });
      return acc;
    }, []),
  };
  return LegacyJavascript.audit_(artifacts, networkRecords, {computedCache: new Map()});
};

describe('LegacyJavaScript audit', () => {
  it('passes code with no polyfills', async () => {
    const result = await getResult([
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
    expect(result.wastedBytesByUrl).toMatchInlineSnapshot(`Map {}`);
  });

  it('legacy polyfill in third party resource does not contribute to wasted bytes', async () => {
    const result = await getResult([
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
          "original": undefined,
          "type": "source-location",
          "url": "https://www.googletagmanager.com/a.js",
          "urlProvider": "network",
        },
        "signal": "String.prototype.repeat",
      },
    ],
    "type": "subitems",
  },
  "totalBytes": 0,
  "url": "https://www.googletagmanager.com/a.js",
  "wastedBytes": 27910,
}
`);
    expect(result.wastedBytesByUrl).toMatchInlineSnapshot(`Map {}`);
  });

  it('legacy polyfill in first party resource contributes to wasted bytes', async () => {
    const result = await getResult([
      {
        code: 'String.prototype.repeat = function() {}',
        url: 'https://www.example.com/a.js',
      },
    ]);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].subItems.items[0].signal).toEqual('String.prototype.repeat');
    expect(result.wastedBytesByUrl).toMatchInlineSnapshot(`
Map {
  "https://www.example.com/a.js" => 27910,
}
`);
  });

  it('fails code with multiple legacy polyfills', async () => {
    const result = await getResult([
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

  it('uses source maps to identify polyfills', async () => {
    const map = {
      sources: ['node_modules/blah/blah/es.string.repeat.js'],
      mappings: 'blah',
    };
    const script = {code: 'blah blah', url: 'https://www.example.com/0.js', map};
    const result = await getResult([script]);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].subItems.items).toMatchObject([
      {
        signal: 'String.prototype.repeat',
        location: {line: 0, column: 0},
      },
    ]);
  });
});
