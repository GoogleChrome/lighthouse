/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import UnusedJavaScript from '../../../audits/byte-efficiency/unused-javascript.js';
import {networkRecordsToDevtoolsLog} from '../../network-records-to-devtools-log.js';
import {createScript, loadSourceMapAndUsageFixture} from '../../test-utils.js';

const scriptUrlToId = new Map();

/**
 * @param {string} url
 */
function getScriptId(url) {
  let id = scriptUrlToId.get(url);
  if (!id) {
    id = String(scriptUrlToId.size + 1);
    scriptUrlToId.set(url, id);
  }
  return id;
}

/**
 * @param {string} url
 * @param {number} transferSize
 * @param {LH.Crdp.Network.ResourceType} resourceType
 */
function generateRecord(url, transferSize, resourceType) {
  return {url, transferSize, resourceType, responseHeaders: [
    {name: 'Content-Encoding', value: 'gzip'},
  ]};
}

/**
 * @param {string} url
 * @param {Array<[number, number, number]>} ranges
 * @return {Crdp.Profiler.ScriptCoverage}
 */
function generateCoverage(url, ranges) {
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

  return {scriptId: getScriptId(url), url, functions};
}

/**
 * @param {string} url
 * @param {Array<[number, number, number]>} ranges
 * @return {{script: LH.Artifacts.Script, coverage: Crdp.Profiler.ScriptCoverage}}
 */
function generateScriptWithCoverage(url, ranges) {
  const length = Math.max(...ranges.map(r => r[1]));
  const script = createScript({url, scriptId: getScriptId(url), length});
  const coverage = generateCoverage(url, ranges);
  return {script, coverage};
}

function makeJsUsage(usages) {
  return usages.reduce((acc, cur) => {
    acc[cur.scriptId] = cur;
    return acc;
  }, {});
}

describe('UnusedJavaScript audit', () => {
  const domain = 'https://www.google.com';
  const scriptUnknown = {coverage: generateCoverage(domain, [[0, 3000, false]])};
  /* eslint-disable max-len */
  const scriptA = generateScriptWithCoverage(`${domain}/scriptA.js`, [[0, 100, true]]);
  const scriptB = generateScriptWithCoverage(`${domain}/scriptB.js`, [[0, 200, true], [0, 50, false]]);
  const inlineA = generateScriptWithCoverage(`${domain}/inline.html`, [[0, 5000, true], [5000, 6000, false]]);
  const inlineB = generateScriptWithCoverage(`${domain}/inline.html`, [[0, 15000, true], [0, 5000, false]]);
  /* eslint-enable max-len */
  const all = [scriptA, scriptB, scriptUnknown, inlineA, inlineB];
  const recordA = generateRecord(`${domain}/scriptA.js`, 35000, 'Script');
  const recordB = generateRecord(`${domain}/scriptB.js`, 50000, 'Script');
  const recordInline = generateRecord(`${domain}/inline.html`, 1000000, 'Document');

  it('should work', async () => {
    const context = {
      computedCache: new Map(),
      options: {
        // Lower the threshold so we don't need huge resources to make a test.
        unusedThreshold: 2000,
      },
    };
    const networkRecords = [recordA, recordB, recordInline];
    const artifacts = {
      Scripts: all.map((s) => s.script).filter(Boolean),
      JsUsage: makeJsUsage(all.map((s) => s.coverage)),
      devtoolsLogs: {defaultPass: networkRecordsToDevtoolsLog(networkRecords)},
      SourceMaps: [],
    };
    const result = await UnusedJavaScript.audit_(artifacts, networkRecords, context);
    expect(result.items.map(item => item.url)).toEqual([
      'https://www.google.com/scriptB.js',
      'https://www.google.com/inline.html',
    ]);

    // Only two scripts should meet the unused bytes threshold.
    expect(result.items).toHaveLength(2);

    const scriptBWaste = result.items[0];
    assert.equal(scriptBWaste.url, `${domain}/scriptB.js`);
    assert.equal(scriptBWaste.totalBytes, 50000);
    assert.equal(scriptBWaste.wastedBytes, 12500);
    assert.equal(scriptBWaste.wastedPercent, 25);

    const inlineBWaste = result.items[1];
    assert.equal(inlineBWaste.url, `${domain}/inline.html`);
    assert.equal(inlineBWaste.totalBytes, 15000);
    assert.equal(inlineBWaste.wastedBytes, 5000);
    assert.equal(Math.round(inlineBWaste.wastedPercent), 33);
  });

  it('should augment when provided source maps', async () => {
    const context = {
      computedCache: new Map(),
      options: {
        // Lower the threshold so we don't need huge resources to make a test.
        unusedThreshold: 2000,
        // Default threshold is 512, but is lowered here so that squoosh generates more
        // results.
        bundleSourceUnusedThreshold: 100,
      },
    };
    const {map, content, usage} = loadSourceMapAndUsageFixture('squoosh');
    const url = 'https://squoosh.app/main-app.js';
    const networkRecords = [generateRecord(url, content.length, 'Script')];
    const artifacts = {
      JsUsage: makeJsUsage([usage]),
      devtoolsLogs: {defaultPass: networkRecordsToDevtoolsLog(networkRecords)},
      SourceMaps: [{scriptId: 'squoosh', scriptUrl: url, map}],
      Scripts: [{scriptId: 'squoosh', url, content}].map(createScript),
    };
    const result = await UnusedJavaScript.audit_(artifacts, networkRecords, context);

    expect(result.items).toMatchInlineSnapshot(`
      Array [
        Object {
          "subItems": Object {
            "items": Array [
              Object {
                "source": "(unmapped)",
                "sourceBytes": 10061,
                "sourceWastedBytes": 3760,
              },
              Object {
                "source": "…src/codecs/webp/encoder-meta.ts",
                "sourceBytes": 660,
                "sourceWastedBytes": 660,
              },
              Object {
                "source": "…src/lib/util.ts",
                "sourceBytes": 4043,
                "sourceWastedBytes": 500,
              },
              Object {
                "source": "…src/custom-els/RangeInput/index.ts",
                "sourceBytes": 2138,
                "sourceWastedBytes": 293,
              },
              Object {
                "source": "…node_modules/comlink/comlink.js",
                "sourceBytes": 4117,
                "sourceWastedBytes": 256,
              },
            ],
            "type": "subitems",
          },
          "totalBytes": 83742,
          "url": "https://squoosh.app/main-app.js",
          "wastedBytes": 6961,
          "wastedPercent": 8.312435814764395,
        },
      ]
    `);
  });
});
