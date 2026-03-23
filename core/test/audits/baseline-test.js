/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import Baseline from '../../audits/baseline.js';

describe('Baseline Audit', () => {
  it('should return an empty list when no features are used', async () => {
    const artifacts = {
      Trace: {
        traceEvents: [],
      },
    };

    const result = await Baseline.audit(artifacts);
    expect(result.score).toEqual(1);
    expect(result.details.items).toHaveLength(0);
  });

  it('should return an empty list when trace has no custom artifact', async () => {
    const artifacts = {
      Trace: {},
    };

    const result = await Baseline.audit(artifacts);
    expect(result.score).toEqual(1);
    expect(result.details.items).toHaveLength(0);
  });

  it('should return a passing score and details when features are found', async () => {
    const traceEvents = [
      {
        args: {
          feature: 'forced-colors',
          url: 'https://example.com/app.js',
          lineNumber: 42,
          columnNumber: 15,
        },
        cat: 'blink.webdx_feature_usage',
        name: 'WebDXFeatureUsage',
      },
      {
        args: {
          feature: 'aborting',
          url: 'https://example.com/index.html',
          lineNumber: 100,
          columnNumber: 5,
        },
        cat: 'blink.webdx_feature_usage',
        name: 'WebDXFeatureUsage',
      },
      {
        args: {
          feature: 'accelerometer',
          url: 'https://example.com/sensors.js',
          lineNumber: 10,
          columnNumber: 2,
        },
        cat: 'blink.webdx_feature_usage',
        name: 'WebDXFeatureUsage',
      },
      {
        args: {
          feature: 'abortsignal-any',
          url: 'https://example.com/async.js',
          lineNumber: 20,
          columnNumber: 8,
        },
        cat: 'blink.webdx_feature_usage',
        name: 'WebDXFeatureUsage',
      },
      {
        cat: 'devtools.timeline',
        name: 'RunTask',
      },
    ];
    const artifacts = {Trace: {traceEvents}};

    const result = await Baseline.audit(artifacts);

    expect(result.score).toEqual(1);
    expect(result.details.items).toHaveLength(4);

    expect(result.details.items[0]).toEqual({
      featureId: {
        type: 'link',
        text: 'accelerometer',
        url: 'https://webstatus.dev/features/accelerometer',
      },
      displayStatus: {
        type: 'baseline-status',
        status: 'limited',
        displayString: 'Limited Availability',
      },
      source: {
        type: 'source-location',
        url: 'https://example.com/sensors.js',
        urlProvider: 'network',
        line: 9,
        column: 1,
        original: undefined,
      },
    });

    expect(result.details.items[1]).toEqual({
      featureId: {
        type: 'link',
        text: 'abortsignal-any',
        url: 'https://webstatus.dev/features/abortsignal-any',
      },
      displayStatus: {
        type: 'baseline-status',
        status: 'low',
        displayString: 'Newly Available (2024-03-19)',
      },
      source: {
        type: 'source-location',
        url: 'https://example.com/async.js',
        urlProvider: 'network',
        line: 19,
        column: 7,
        original: undefined,
      },
    });

    expect(result.details.items[2]).toEqual({
      featureId: {
        type: 'link',
        text: 'forced-colors',
        url: 'https://webstatus.dev/features/forced-colors',
      },
      displayStatus: {
        type: 'baseline-status',
        status: 'high',
        displayString: 'Widely Available (2022-09-12)',
      },
      source: {
        type: 'source-location',
        url: 'https://example.com/app.js',
        urlProvider: 'network',
        line: 41,
        column: 14,
        original: undefined,
      },
    });

    expect(result.details.items[3]).toEqual({
      featureId: {
        type: 'link',
        text: 'aborting',
        url: 'https://webstatus.dev/features/aborting',
      },
      displayStatus: {
        type: 'baseline-status',
        status: 'high',
        displayString: 'Widely Available (2019-03-25)',
      },
      source: {
        type: 'source-location',
        url: 'https://example.com/index.html',
        urlProvider: 'network',
        line: 99,
        column: 4,
        original: undefined,
      },
    });
  });
});
