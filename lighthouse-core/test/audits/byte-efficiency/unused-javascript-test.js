/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const assert = require('assert').strict;
const fs = require('fs');
const UnusedJavaScript = require('../../../audits/byte-efficiency/unused-javascript.js');
const networkRecordsToDevtoolsLog = require('../../network-records-to-devtools-log.js');

function load(name) {
  const dir = `${__dirname}/../../fixtures/source-maps`;
  const mapJson = fs.readFileSync(`${dir}/${name}.js.map`, 'utf-8');
  const content = fs.readFileSync(`${dir}/${name}.js`, 'utf-8');
  const usageJson = fs.readFileSync(`${dir}/${name}.usage.json`, 'utf-8');
  const exportedUsage = JSON.parse(usageJson);

  // Usage is exported from DevTools, which simplifies the real format of the
  // usage protocol.
  const usage = {
    url: exportedUsage.url,
    functions: [
      {
        ranges: exportedUsage.ranges.map((range, i) => {
          return {
            startOffset: range.start,
            endOffset: range.end,
            count: i % 2 === 0 ? 0 : 1,
          };
        }),
      },
    ],
  };

  return {map: JSON.parse(mapJson), content, usage};
}

/* eslint-env jest */

function generateRecord(url, transferSize, resourceType) {
  return {url, transferSize, resourceType};
}

function generateUsage(url, ranges) {
  const functions = ranges.map(range => {
    return {
      ranges: [
        {
          startOffset: range[0],
          endOffset: range[1],
          count: range[2] ? 1 : 0,
        },
      ],
    };
  });

  return {url, functions};
}

function makeJsUsage(...usages) {
  return usages.reduce((acc, cur) => {
    acc[cur.url] = acc[cur.url] || [];
    acc[cur.url].push(cur);
    return acc;
  }, {});
}

describe('UnusedJavaScript audit', () => {
  const domain = 'https://www.google.com';
  const scriptUnknown = generateUsage(domain, [[0, 3000, false]]);
  const scriptA = generateUsage(`${domain}/scriptA.js`, [[0, 100, true]]);
  const scriptB = generateUsage(`${domain}/scriptB.js`, [[0, 200, true], [0, 50, false]]);
  const inlineA = generateUsage(`${domain}/inline.html`, [[0, 5000, true], [5000, 6000, false]]);
  const inlineB = generateUsage(`${domain}/inline.html`, [[0, 15000, true], [0, 5000, false]]);
  const recordA = generateRecord(`${domain}/scriptA.js`, 35000, 'Script');
  const recordB = generateRecord(`${domain}/scriptB.js`, 50000, 'Script');
  const recordInline = generateRecord(`${domain}/inline.html`, 1000000, 'Document');

  it('should merge duplicates', async () => {
    const context = {computedCache: new Map()};
    const networkRecords = [recordA, recordB, recordInline];
    const artifacts = {
      JsUsage: makeJsUsage(scriptA, scriptB, scriptUnknown, inlineA, inlineB),
      devtoolsLogs: {defaultPass: networkRecordsToDevtoolsLog(networkRecords)},
      SourceMaps: [],
    };
    const result = await UnusedJavaScript.audit_(artifacts, networkRecords, context);
    expect(result.items.map(item => item.url)).toEqual([
      'https://www.google.com/scriptB.js',
      'https://www.google.com/inline.html',
    ]);

    const scriptBWaste = result.items[0];
    assert.equal(scriptBWaste.totalBytes, 50000);
    assert.equal(scriptBWaste.wastedBytes, 12500);
    assert.equal(scriptBWaste.wastedPercent, 25);

    const inlineWaste = result.items[1];
    assert.equal(inlineWaste.totalBytes, 21000);
    assert.equal(inlineWaste.wastedBytes, 6000);
    assert.equal(Math.round(inlineWaste.wastedPercent), 29);
  });

  it('should augment when provided source maps', async () => {
    const context = {
      computedCache: new Map(),
      options: {
        // Default threshold is 512, but is lowered here so that squoosh generates more
        // results.
        bundleSourceUnusedThreshold: 100,
      },
    };
    const {map, content, usage} = load('squoosh');
    const url = 'https://squoosh.app/main-app.js';
    const networkRecords = [generateRecord(url, content.length, 'Script')];
    const artifacts = {
      JsUsage: makeJsUsage(usage),
      devtoolsLogs: {defaultPass: networkRecordsToDevtoolsLog(networkRecords)},
      SourceMaps: [{scriptUrl: url, map}],
      ScriptElements: [{src: url, content}],
    };
    const result = await UnusedJavaScript.audit_(artifacts, networkRecords, context);

    expect(result.items).toMatchInlineSnapshot(`
      Array [
        Object {
          "sourceBytes": Array [
            10062,
            660,
            4043,
            2138,
            4117,
          ],
          "sourceWastedBytes": Array [
            3760,
            660,
            500,
            293,
            256,
          ],
          "sources": Array [
            "(unmapped)",
            "…src/codecs/webp/encoder-meta.ts",
            "…src/lib/util.ts",
            "…src/custom-els/RangeInput/index.ts",
            "…node_modules/comlink/comlink.js",
          ],
          "totalBytes": 83748,
          "url": "https://squoosh.app/main-app.js",
          "wastedBytes": 6961,
          "wastedPercent": 8.312435814764395,
        },
      ]
    `);
  });
});
