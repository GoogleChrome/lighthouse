/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import PageExecutionTimings from '../../audits/mainthread-work-breakdown.js';
import {getURLArtifactFromDevtoolsLog, readJson} from '../test-utils.js';
import {networkRecordsToDevtoolsLog} from '../network-records-to-devtools-log.js';
import {defaultSettings} from '../../config/constants.js';
import {createTestTrace} from '../create-test-trace.js';

const acceptableTrace = readJson('../fixtures/traces/progressive-app-m60.json', import.meta);
const acceptableDevtoolsLog = readJson('../fixtures/traces/progressive-app-m60.devtools.log.json', import.meta);
const siteWithRedirectTrace = readJson('../fixtures/artifacts/redirect/trace.json', import.meta);
const siteWithRedirectDevtoolsLog = readJson('../fixtures/artifacts/redirect/devtoolslog.json', import.meta);
const loadTraceOld = readJson('../fixtures/traces/load.json', import.meta);
const loadTrace = readJson('../fixtures/artifacts/animation/trace.json', import.meta);
const loadDevtoolsLog = readJson('../fixtures/artifacts/animation/devtoolslog.json', import.meta);

const options = PageExecutionTimings.defaultOptions;

const acceptableTraceExpectations = {
  parseHTML: 14,
  styleLayout: 308,
  paintCompositeRender: 87,
  scriptEvaluation: 215,
  scriptParseCompile: 25,
  garbageCollection: 48,
  other: 663,
};

describe('Performance: page execution timings audit', () => {
  function keyOutput(output) {
    const keyedOutput = {};
    for (const item of output.details.items) {
      keyedOutput[item.group] = Math.round(item.duration);
    }
    return keyedOutput;
  }

  let context;

  beforeEach(() => {
    const settings = JSON.parse(JSON.stringify(defaultSettings));
    settings.throttlingMethod = 'devtools';

    context = {
      computedCache: new Map(),
      settings,
      options,
    };
  });

  it('should compute the correct pageExecutionTiming values for the trace', async () => {
    const artifacts = {
      traces: {defaultPass: acceptableTrace},
      devtoolsLogs: {defaultPass: acceptableDevtoolsLog},
      URL: getURLArtifactFromDevtoolsLog(acceptableDevtoolsLog),
      GatherContext: {gatherMode: 'navigation'},
    };

    const output = await PageExecutionTimings.audit(artifacts, context);
    assert.deepStrictEqual(keyOutput(output), acceptableTraceExpectations);
    assert.equal(Math.round(output.numericValue), 1360);
    assert.equal(output.details.items.length, 7);
    assert.equal(output.score, 0.98);
    expect(output.metricSavings.TBT).toBeCloseTo(48.3, 0.1);
  });

  it('should compute the correct values when simulated', async () => {
    const artifacts = {
      traces: {defaultPass: acceptableTrace},
      devtoolsLogs: {defaultPass: acceptableDevtoolsLog},
      URL: getURLArtifactFromDevtoolsLog(acceptableDevtoolsLog),
      GatherContext: {gatherMode: 'navigation'},
    };

    context.settings.throttlingMethod = 'simulate';
    context.settings.throttling.cpuSlowdownMultiplier = 3;
    const output = await PageExecutionTimings.audit(artifacts, context);

    const keyedOutput = keyOutput(output);
    for (const key of Object.keys(acceptableTraceExpectations)) {
      const actual = keyedOutput[key];
      const expected = acceptableTraceExpectations[key] * 3;
      assert.ok(Math.abs(actual - expected) <= 2, `expected ${expected} got ${actual}`);
    }

    assert.equal(Math.round(output.numericValue), 4081);
    assert.equal(output.details.items.length, 7);
    assert.equal(output.score, 0.48);
    expect(output.metricSavings.TBT).toBeCloseTo(478, 0.1);
  });

  it('should compute the correct values for the redirect trace', async () => {
    const artifacts = {
      traces: {defaultPass: siteWithRedirectTrace},
      devtoolsLogs: {defaultPass: siteWithRedirectDevtoolsLog},
      URL: getURLArtifactFromDevtoolsLog(siteWithRedirectDevtoolsLog),
      GatherContext: {gatherMode: 'navigation'},
    };

    context.settings.throttlingMethod = 'provided';

    const output = await PageExecutionTimings.audit(artifacts, context);
    expect(keyOutput(output)).toMatchInlineSnapshot(`
Object {
  "garbageCollection": 14,
  "other": 188,
  "paintCompositeRender": 11,
  "parseHTML": 52,
  "scriptEvaluation": 577,
  "scriptParseCompile": 67,
  "styleLayout": 70,
}
`);
    expect(Math.round(output.numericValue)).toMatchInlineSnapshot(`979`);
    assert.equal(output.details.items.length, 7);
    assert.equal(output.score, 1);
    expect(output.metricSavings.TBT).toBeCloseTo(171.95, 0.1);
  });

  it('should compute the correct values for the load trace (legacy)', async () => {
    assert(loadTraceOld.find(e => e.name === 'TracingStartedInPage'));
    const artifacts = {
      traces: {defaultPass: {traceEvents: loadTraceOld}},
      GatherContext: {gatherMode: 'navigation'},
      // `loadTraceOld` doesn't have a DT log
      // These are just standard values that cause an error.
      devtoolsLogs: {defaultPass: []},
      URL: {
        requestedUrl: 'https://example.com/',
        mainDocumentUrl: 'https://example.com/',
        finalDisplayedUrl: 'https://example.com/',
      },
    };

    const output = await PageExecutionTimings.audit(artifacts, context);
    expect(keyOutput(output)).toMatchInlineSnapshot(`
Object {
  "garbageCollection": 3,
  "other": 382,
  "paintCompositeRender": 44,
  "parseHTML": 25,
  "scriptEvaluation": 347,
  "styleLayout": 131,
}
`);
    assert.equal(Math.round(output.numericValue), 933);
    assert.equal(output.details.items.length, 6);
    assert.equal(output.score, 1);
  });

  it('should compute the correct values for the load trace', async () => {
    assert(loadTrace.traceEvents.find(e => e.name === 'TracingStartedInBrowser'));
    const artifacts = {
      traces: {defaultPass: loadTrace},
      devtoolsLogs: {defaultPass: loadDevtoolsLog},
      URL: getURLArtifactFromDevtoolsLog(loadDevtoolsLog),
      GatherContext: {gatherMode: 'navigation'},
    };

    context.settings.throttlingMethod = 'simulate';

    const output = await PageExecutionTimings.audit(artifacts, context);
    expect(keyOutput(output)).toMatchInlineSnapshot(`
Object {
  "other": 319,
  "paintCompositeRender": 152,
  "parseHTML": 2,
  "scriptEvaluation": 14,
  "scriptParseCompile": 2,
  "styleLayout": 470,
}
`);
    expect(Math.round(output.numericValue)).toMatchInlineSnapshot(`958`);
    assert.equal(output.details.items.length, 6);
    assert.equal(output.score, 1);
  });

  it('should get no data when no events are present', () => {
    const mainDocumentUrl = 'https://example.com';
    const artifacts = {
      traces: {defaultPass: createTestTrace({frameUrl: mainDocumentUrl})},
      devtoolsLogs: {defaultPass: networkRecordsToDevtoolsLog([{
        url: mainDocumentUrl,
        priority: 'High',
      }])},
      URL: {
        requestedUrl: mainDocumentUrl,
        mainDocumentUrl,
        finalDisplayedUrl: mainDocumentUrl,
      },
      GatherContext: {gatherMode: 'navigation'},
    };

    return PageExecutionTimings.audit(artifacts, context).then(output => {
      assert.equal(output.details.items.length, 0);
      assert.equal(output.score, 1);
      assert.equal(Math.round(output.numericValue), 0);
      assert.deepStrictEqual(output.metricSavings, {TBT: 0});
    });
  });
});
