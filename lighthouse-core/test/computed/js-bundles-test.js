/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */
const fs = require('fs');
const JSBundles = require('../../computed/js-bundles.js');

function load(name) {
  const mapJson = fs.readFileSync(`${__dirname}/../fixtures/source-maps/${name}.js.map`, 'utf-8');
  const content = fs.readFileSync(`${__dirname}/../fixtures/source-maps/${name}.js`, 'utf-8');
  return {map: JSON.parse(mapJson), content};
}

describe('JSBundles computed artifact', () => {
  it('collates script element and source map', async () => {
    const artifacts = {
      SourceMaps: [{
        scriptUrl: 'https://www.example.com/app.js', map: {sources: ['index.js'], mappings: 'AAAA'},
      }],
      ScriptElements: [{src: 'https://www.example.com/app.js', content: ''}],
    };
    const context = {computedCache: new Map()};
    const results = await JSBundles.request(artifacts, context);
    expect(results).toHaveLength(1);
    const result = results[0];
    expect(result.rawMap).toBe(artifacts.SourceMaps[0].map);
    expect(result.script).toBe(artifacts.ScriptElements[0]);
  });

  it('works (simple map)', async () => {
    // This map is from source-map-explorer.
    // https://github.com/danvk/source-map-explorer/tree/4b95f6e7dfe0058d791dcec2107fee43a1ebf02e/tests
    const {map, content} = load('foo.min');
    const artifacts = {
      SourceMaps: [{scriptUrl: 'https://example.com/foo.min.js', map}],
      ScriptElements: [{src: 'https://example.com/foo.min.js', content}],
    };
    const context = {computedCache: new Map()};
    const results = await JSBundles.request(artifacts, context);

    expect(results).toHaveLength(1);
    const result = results[0];

    // Determine sizes.
    expect(result.sizes).toMatchInlineSnapshot(`
      Object {
        "files": Object {
          "node_modules/browser-pack/_prelude.js": 480,
          "src/bar.js": 104,
          "src/foo.js": 98,
        },
        "totalBytes": 718,
        "unmappedBytes": 36,
      }
    `);

    // Test the mapping.
    const entry = result.map.findEntry(0, 644);
    expect(entry).toMatchInlineSnapshot(`
      SourceMapEntry {
        "columnNumber": 644,
        "lastColumnNumber": 648,
        "lineNumber": 0,
        "name": "bar",
        "sourceColumnNumber": 15,
        "sourceLineNumber": 3,
        "sourceURL": "src/foo.js",
      }
    `);
    expect(result.map.sourceLineMapping(
      entry.sourceURL, entry.sourceLineNumber, entry.sourceColumnNumber)).toBe(entry);

    expect(result.map.sourceLineMapping('bogus', 0, 0)).toBe(null);
  });

  it('works (simple map) (null source)', async () => {
    // This map is from source-map-explorer.
    // https://github.com/danvk/source-map-explorer/tree/4b95f6e7dfe0058d791dcec2107fee43a1ebf02e/tests
    const {map, content} = load('foo.min');
    map.sources[1] = null;
    const artifacts = {
      SourceMaps: [{scriptUrl: 'https://example.com/foo.min.js', map}],
      ScriptElements: [{src: 'https://example.com/foo.min.js', content}],
    };
    const context = {computedCache: new Map()};
    const results = await JSBundles.request(artifacts, context);

    expect(results).toHaveLength(1);
    const result = results[0];

    // Determine sizes.
    expect(result.sizes).toMatchInlineSnapshot(`
      Object {
        "files": Object {
          "node_modules/browser-pack/_prelude.js": 480,
          "null": 104,
          "src/foo.js": 98,
        },
        "totalBytes": 718,
        "unmappedBytes": 36,
      }
    `);

    // Test the mapping.
    const entry = result.map.findEntry(0, 644);
    expect(entry).toMatchInlineSnapshot(`
      SourceMapEntry {
        "columnNumber": 644,
        "lastColumnNumber": 648,
        "lineNumber": 0,
        "name": "bar",
        "sourceColumnNumber": 15,
        "sourceLineNumber": 3,
        "sourceURL": "src/foo.js",
      }
    `);
    expect(result.map.sourceLineMapping(
      entry.sourceURL, entry.sourceLineNumber, entry.sourceColumnNumber)).toBe(entry);
  });

  it('works (complex map)', async () => {
    const {map, content} = load('squoosh');
    const artifacts = {
      SourceMaps: [{scriptUrl: 'https://squoosh.app/main-app.js', map}],
      ScriptElements: [{src: 'https://squoosh.app/main-app.js', content}],
    };
    const context = {computedCache: new Map()};
    const results = await JSBundles.request(artifacts, context);

    expect(results).toHaveLength(1);
    const result = results[0];

    // Determine sizes.
    expect(result.sizes).toMatchInlineSnapshot(`
      Object {
        "files": Object {
          "webpack:///./node_modules/comlink/comlink.js": 4117,
          "webpack:///./node_modules/linkstate/dist/linkstate.es.js": 412,
          "webpack:///./node_modules/pointer-tracker/dist/PointerTracker.mjs": 2672,
          "webpack:///./node_modules/pretty-bytes/index.js": 635,
          "webpack:///./src/codecs/browser-bmp/encoder-meta.ts": 343,
          "webpack:///./src/codecs/browser-bmp/encoder.ts": 101,
          "webpack:///./src/codecs/browser-gif/encoder-meta.ts": 343,
          "webpack:///./src/codecs/browser-gif/encoder.ts": 101,
          "webpack:///./src/codecs/browser-jp2/encoder-meta.ts": 349,
          "webpack:///./src/codecs/browser-jp2/encoder.ts": 101,
          "webpack:///./src/codecs/browser-jpeg/encoder-meta.ts": 282,
          "webpack:///./src/codecs/browser-jpeg/encoder.ts": 115,
          "webpack:///./src/codecs/browser-jpeg/options.ts": 35,
          "webpack:///./src/codecs/browser-pdf/encoder-meta.ts": 349,
          "webpack:///./src/codecs/browser-pdf/encoder.ts": 101,
          "webpack:///./src/codecs/browser-png/encoder-meta.ts": 268,
          "webpack:///./src/codecs/browser-png/encoder.tsx": 101,
          "webpack:///./src/codecs/browser-tiff/encoder-meta.ts": 347,
          "webpack:///./src/codecs/browser-tiff/encoder.ts": 101,
          "webpack:///./src/codecs/browser-webp/encoder-meta.ts": 358,
          "webpack:///./src/codecs/browser-webp/encoder.ts": 115,
          "webpack:///./src/codecs/browser-webp/options.ts": 34,
          "webpack:///./src/codecs/decoders.ts": 206,
          "webpack:///./src/codecs/encoders.ts": 336,
          "webpack:///./src/codecs/generic/quality-option.tsx": 398,
          "webpack:///./src/codecs/generic/util.ts": 159,
          "webpack:///./src/codecs/identity/encoder-meta.ts": 46,
          "webpack:///./src/codecs/imagequant/options.tsx": 1052,
          "webpack:///./src/codecs/imagequant/processor-meta.ts": 40,
          "webpack:///./src/codecs/input-processors.ts": 11,
          "webpack:///./src/codecs/mozjpeg/encoder-meta.ts": 436,
          "webpack:///./src/codecs/mozjpeg/options.tsx": 4416,
          "webpack:///./src/codecs/optipng/encoder-meta.ts": 59,
          "webpack:///./src/codecs/optipng/options.tsx": 366,
          "webpack:///./src/codecs/preprocessors.ts": 75,
          "webpack:///./src/codecs/processor-worker/index.ts": 50,
          "webpack:///./src/codecs/processor.ts": 2380,
          "webpack:///./src/codecs/resize/options.tsx": 3970,
          "webpack:///./src/codecs/resize/processor-meta.ts": 225,
          "webpack:///./src/codecs/resize/processor-sync.ts": 462,
          "webpack:///./src/codecs/resize/util.ts": 134,
          "webpack:///./src/codecs/rotate/processor-meta.ts": 18,
          "webpack:///./src/codecs/tiny.webp": 89,
          "webpack:///./src/codecs/webp/encoder-meta.ts": 660,
          "webpack:///./src/codecs/webp/options.tsx": 5114,
          "webpack:///./src/components/Options/index.tsx": 2176,
          "webpack:///./src/components/Options/style.scss": 410,
          "webpack:///./src/components/Output/custom-els/PinchZoom/index.ts": 3653,
          "webpack:///./src/components/Output/custom-els/TwoUp/index.ts": 2088,
          "webpack:///./src/components/Output/custom-els/TwoUp/styles.css": 75,
          "webpack:///./src/components/Output/index.tsx": 5199,
          "webpack:///./src/components/Output/style.scss": 447,
          "webpack:///./src/components/checkbox/index.tsx": 247,
          "webpack:///./src/components/checkbox/style.scss": 106,
          "webpack:///./src/components/compress/custom-els/MultiPanel/index.ts": 3461,
          "webpack:///./src/components/compress/custom-els/MultiPanel/styles.css": 105,
          "webpack:///./src/components/compress/index.tsx": 8782,
          "webpack:///./src/components/compress/result-cache.ts": 611,
          "webpack:///./src/components/compress/style.scss": 132,
          "webpack:///./src/components/expander/index.tsx": 901,
          "webpack:///./src/components/expander/style.scss": 66,
          "webpack:///./src/components/range/index.tsx": 566,
          "webpack:///./src/components/range/style.scss": 200,
          "webpack:///./src/components/results/FileSize.tsx": 445,
          "webpack:///./src/components/results/index.tsx": 1538,
          "webpack:///./src/components/results/style.scss": 780,
          "webpack:///./src/components/select/index.tsx": 291,
          "webpack:///./src/components/select/style.scss": 103,
          "webpack:///./src/custom-els/RangeInput/index.ts": 2138,
          "webpack:///./src/custom-els/RangeInput/styles.css": 180,
          "webpack:///./src/lib/clean-modify.ts": 331,
          "webpack:///./src/lib/icons.tsx": 2531,
          "webpack:///./src/lib/util.ts": 4043,
        },
        "totalBytes": 83748,
        "unmappedBytes": 10061,
      }
    `);

    // Test the mapping.
    const entry = result.map.findEntry(0, 80476);
    expect(entry).toMatchInlineSnapshot(`
      SourceMapEntry {
        "columnNumber": 80469,
        "lastColumnNumber": 80482,
        "lineNumber": 0,
        "name": "workerResize",
        "sourceColumnNumber": 31,
        "sourceLineNumber": 119,
        "sourceURL": "webpack:///./src/components/compress/index.tsx",
      }
    `);
    expect(result.map.sourceLineMapping(
      entry.sourceURL, entry.sourceLineNumber, entry.sourceColumnNumber)).toBe(entry);
  });

  describe('fault tolerance', () => {
    let data;
    let map;
    let content;

    beforeEach(() => {
      data = load('foo.min');
      map = data.map;
      content = data.content;
    });

    async function test() {
      const artifacts = {
        SourceMaps: [{scriptUrl: 'https://example.com/foo.min.js', map}],
        ScriptElements: [{src: 'https://example.com/foo.min.js', content}],
      };
      const context = {computedCache: new Map()};
      const results = await JSBundles.request(artifacts, context);
      const result = results[0];
      const entry = result.map.findEntry(0, 644);
      return {sizes: result.sizes, entry};
    }

    it('1', async () => {
      map.mappings = 'blahblah blah';
      expect(await test()).toMatchInlineSnapshot(`
        Object {
          "entry": SourceMapEntry {
            "columnNumber": -13,
            "lineNumber": 0,
            "name": "r",
            "sourceColumnNumber": -418,
            "sourceLineNumber": -432,
            "sourceURL": undefined,
          },
          "sizes": Object {
            "files": Object {},
            "totalBytes": 718,
            "unmappedBytes": 718,
          },
        }
      `);
    });

    it('2', async () => {
      content = 'blahblah blah';
      expect(await test()).toMatchInlineSnapshot(`
        Object {
          "entry": SourceMapEntry {
            "columnNumber": 644,
            "lastColumnNumber": 648,
            "lineNumber": 0,
            "name": "bar",
            "sourceColumnNumber": 15,
            "sourceLineNumber": 3,
            "sourceURL": "src/foo.js",
          },
          "sizes": Object {
            "files": Object {},
            "totalBytes": 13,
            "unmappedBytes": 13,
          },
        }
      `);
    });

    it('3', async () => {
      content = '';
      expect(await test()).toMatchInlineSnapshot(`
        Object {
          "entry": SourceMapEntry {
            "columnNumber": 644,
            "lastColumnNumber": 648,
            "lineNumber": 0,
            "name": "bar",
            "sourceColumnNumber": 15,
            "sourceLineNumber": 3,
            "sourceURL": "src/foo.js",
          },
          "sizes": Object {
            "files": Object {},
            "totalBytes": 0,
            "unmappedBytes": 0,
          },
        }
      `);
    });

    it('4', async () => {
      map.names = ['blah'];
      expect(await test()).toMatchInlineSnapshot(`
        Object {
          "entry": SourceMapEntry {
            "columnNumber": 644,
            "lastColumnNumber": 648,
            "lineNumber": 0,
            "name": undefined,
            "sourceColumnNumber": 15,
            "sourceLineNumber": 3,
            "sourceURL": "src/foo.js",
          },
          "sizes": Object {
            "files": Object {
              "node_modules/browser-pack/_prelude.js": 480,
              "src/bar.js": 104,
              "src/foo.js": 98,
            },
            "totalBytes": 718,
            "unmappedBytes": 36,
          },
        }
      `);
    });
  });
});
