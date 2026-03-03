/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import BaselineFeatureUsageGatherer from '../../../gather/gatherers/baseline-feature-usage.js';

describe('BaselineFeatureUsage gatherer', () => {
  it('extracts feature usage from trace events', async () => {
    const gatherer = new BaselineFeatureUsageGatherer();
    const traceEvents = [
      {
        args: {
          columnNumber: 25545,
          feature: 'forced-colors',
          lineNumber: 1,
          scriptId: '250',
          url: '',
        },
        cat: 'blink.webdx_feature_usage',
        name: 'WebDXFeatureUsage',
        ph: 'I',
        pid: 887902,
        s: 't',
        tid: 1,
        ts: 100034275518,
        tts: 15434586,
      },
      {
        args: {
          columnNumber: -1,
          feature: 'no-location',
          lineNumber: -1,
          scriptId: '0',
          url: '',
        },
        cat: 'blink.webdx_feature_usage',
        name: 'WebDXFeatureUsage',
        ph: 'I',
        pid: 887902,
        s: 't',
        tid: 1,
        ts: 100034275530,
        tts: 15434598,
      },
      {
        args: {
          columnNumber: 0,
          feature: 'start-of-file',
          lineNumber: 1,
          scriptId: '1',
          url: 'https://www.example.com/',
        },
        cat: 'blink.webdx_feature_usage',
        name: 'WebDXFeatureUsage',
        ph: 'I',
        pid: 887902,
        s: 't',
        tid: 1,
        ts: 100034275530,
        tts: 15434598,
      },
      {
        args: {
          columnNumber: 16338,
          feature: 'aborting',
          lineNumber: 2,
          scriptId: '161',
          url: 'https://www.example.com/script.js',
        },
        cat: 'blink.webdx_feature_usage',
        name: 'WebDXFeatureUsage',
        ph: 'I',
        pid: 887902,
        s: 't',
        tid: 1,
        ts: 100034275518,
        tts: 15434586,
      },
      {
        // Irrelevant event
        cat: 'devtools.timeline',
        name: 'RunTask',
      },
    ];

    const context = {
      dependencies: {
        Trace: {traceEvents},
      },
    };

    const artifact = await gatherer.getArtifact(context);

    expect(artifact).toEqual([
      {
        featureId: 'forced-colors',
        location: {
          url: '',
          line: 1,
          col: 25545,
        },
      },
      {
        featureId: 'no-location',
        location: {
          url: '',
          line: undefined,
          col: undefined,
        },
      },
      {
        featureId: 'start-of-file',
        location: {
          url: 'https://www.example.com/',
          line: 1,
          col: 0,
        },
      },
      {
        featureId: 'aborting',
        location: {
          url: 'https://www.example.com/script.js',
          line: 2,
          col: 16338,
        },
      },
    ]);
  });

  it('handles events without valid args gracefully', async () => {
    const gatherer = new BaselineFeatureUsageGatherer();
    const traceEvents = [
      {
        cat: 'blink.webdx_feature_usage',
        name: 'WebDXFeatureUsage',
        args: {},
      },
    ];

    const context = {
      dependencies: {
        Trace: {traceEvents},
      },
    };

    const artifact = await gatherer.getArtifact(context);
    expect(artifact).toEqual([]);
  });
});
