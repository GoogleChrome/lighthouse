/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import BootupTime from '../../audits/bootup-time.js';
import {getURLArtifactFromDevtoolsLog, readJson} from '../test-utils.js';
import {defaultSettings} from '../../config/constants.js';

const acceptableTrace = readJson('../fixtures/traces/progressive-app-m60.json', import.meta);
const acceptableDevtoolsLogs = readJson('../fixtures/traces/progressive-app-m60.devtools.log.json', import.meta);
const errorTrace = readJson('../fixtures/traces/no_fmp_event.json', import.meta);

describe('Performance: bootup-time audit', () => {
  const auditOptions = Object.assign({}, BootupTime.defaultOptions, {thresholdInMs: 10});

  it('should compute the correct BootupTime values', () => {
    const artifacts = Object.assign({
      traces: {[BootupTime.DEFAULT_PASS]: acceptableTrace},
      devtoolsLogs: {[BootupTime.DEFAULT_PASS]: acceptableDevtoolsLogs},
      URL: getURLArtifactFromDevtoolsLog(acceptableDevtoolsLogs),
      GatherContext: {gatherMode: 'navigation'},
    });
    const settings = JSON.parse(JSON.stringify(defaultSettings));
    settings.throttlingMethod = 'devtools';
    const context = {options: auditOptions, settings, computedCache: new Map()};

    return BootupTime.audit(artifacts, context).then(output => {
      expect(output.details.items).toMatchInlineSnapshot(`
Array [
  Object {
    "scriptParseCompile": 0.022,
    "scripting": 7.619999999999981,
    "total": 1025.2669999999957,
    "url": "Unattributable",
  },
  Object {
    "scriptParseCompile": 6.469,
    "scripting": 97.69500000000002,
    "total": 127.15300000000002,
    "url": "https://www.googletagmanager.com/gtm.js?id=GTM-Q5SW",
  },
  Object {
    "scriptParseCompile": 1.295,
    "scripting": 31.776,
    "total": 61.05500000000001,
    "url": "https://pwa.rocks/script.js",
  },
  Object {
    "scriptParseCompile": 9.629,
    "scripting": 40.88899999999999,
    "total": 55.246999999999986,
    "url": "https://www.google-analytics.com/analytics.js",
  },
  Object {
    "scriptParseCompile": 1.229,
    "scripting": 6.131,
    "total": 36.947,
    "url": "https://pwa.rocks/",
  },
  Object {
    "scriptParseCompile": 1.239,
    "scripting": 25.210000000000004,
    "total": 27.805000000000007,
    "url": "https://www.google-analytics.com/plugins/ua/linkid.js",
  },
]
`);

      assert.equal(Math.round(output.numericValue), 229);
      assert.equal(output.details.items.length, 6);
      assert.equal(output.score, 1);
      assert.deepStrictEqual(output.metricSavings, {TBT: 41.604711667016595});
    });
  }, 10000);

  it('should compute the correct values when simulated', async () => {
    const artifacts = Object.assign({
      traces: {defaultPass: acceptableTrace},
      devtoolsLogs: {defaultPass: acceptableDevtoolsLogs},
      URL: getURLArtifactFromDevtoolsLog(acceptableDevtoolsLogs),
      GatherContext: {gatherMode: 'navigation'},
    });

    const options = auditOptions;
    const settings = JSON.parse(JSON.stringify(defaultSettings));
    settings.throttling.cpuSlowdownMultiplier = 3;
    const computedCache = new Map();
    const output = await BootupTime.audit(artifacts, {options, settings, computedCache});

    expect(output.details.items).toMatchInlineSnapshot(`
Array [
  Object {
    "scriptParseCompile": 0.066,
    "scripting": 22.859999999999943,
    "total": 3075.8009999999867,
    "url": "Unattributable",
  },
  Object {
    "scriptParseCompile": 19.407,
    "scripting": 293.08500000000004,
    "total": 381.459,
    "url": "https://www.googletagmanager.com/gtm.js?id=GTM-Q5SW",
  },
  Object {
    "scriptParseCompile": 3.885,
    "scripting": 95.328,
    "total": 183.165,
    "url": "https://pwa.rocks/script.js",
  },
  Object {
    "scriptParseCompile": 28.887,
    "scripting": 122.66699999999997,
    "total": 165.74099999999999,
    "url": "https://www.google-analytics.com/analytics.js",
  },
  Object {
    "scriptParseCompile": 3.6870000000000003,
    "scripting": 18.393,
    "total": 110.84100000000002,
    "url": "https://pwa.rocks/",
  },
  Object {
    "scriptParseCompile": 3.7170000000000005,
    "scripting": 75.63000000000001,
    "total": 83.415,
    "url": "https://www.google-analytics.com/plugins/ua/linkid.js",
  },
  Object {
    "scriptParseCompile": 0,
    "scripting": 0,
    "total": 23.897999999999996,
    "url": "Browser GC",
  },
  Object {
    "scriptParseCompile": 8.943,
    "scripting": 9.882,
    "total": 21.03,
    "url": "https://www.google-analytics.com/cx/api.js?experiment=jdCfRmudTmy-0USnJ8xPbw",
  },
  Object {
    "scriptParseCompile": 0,
    "scripting": 0.12,
    "total": 20.156999999999996,
    "url": "https://pwa.rocks/0ff789bf.js",
  },
  Object {
    "scriptParseCompile": 7.638,
    "scripting": 6.27,
    "total": 15.282,
    "url": "https://www.google-analytics.com/cx/api.js?experiment=qvpc5qIfRC2EMnbn6bbN5A",
  },
]
`);
    assert.equal(output.score, 0.98);
    assert.equal(Math.round(output.numericValue), 720);
    assert.deepStrictEqual(output.metricSavings, {TBT: 0});
  });

  it('should get no data when no events are present', () => {
    const artifacts = Object.assign({
      traces: {defaultPass: errorTrace},
      devtoolsLogs: {defaultPass: []},
      URL: {
        requestedUrl: 'https://example.com',
        mainDocumentUrl: 'https://example.com',
        finalDisplayedUrl: 'https://example.com',
      },
      GatherContext: {gatherMode: 'navigation'},
    });
    const settings = JSON.parse(JSON.stringify(defaultSettings));
    settings.throttlingMethod = 'devtools';
    const context = {options: auditOptions, settings, computedCache: new Map()};

    return BootupTime.audit(artifacts, context).then(output => {
      assert.equal(output.details.items.length, 0);
      assert.equal(output.score, 1);
      assert.equal(Math.round(output.numericValue), 0);
      assert.deepStrictEqual(output.metricSavings, {TBT: 0});
    });
  });
});
