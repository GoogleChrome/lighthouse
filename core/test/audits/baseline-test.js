/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import Baseline from '../../audits/baseline.js';
import {timers} from '../test-utils.js';

describe('Baseline Audit', () => {
  let originalData;

  beforeEach(() => {
    originalData = Baseline.featureData;
    timers.useFakeTimers();
    // Freeze time at June 30, 2026
    timers.setSystemTime(new Date('2026-06-30T15:00:00Z').getTime());

    Baseline.featureData = {
      high: {
        'forced-colors': '2022-09-12',
        'aborting': '2019-03-25',
      },
      low: {
        'abortsignal-any': '2024-03-19',
      },
      limited: ['accelerometer'],
    };
  });

  afterEach(() => {
    timers.dispose();
    Baseline.featureData = originalData;
  });

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

  it('should not set debugData when a limited availability feature ' +
    'is present (newest is newly available)', async () => {
    const traceEvents = [
      {args: {feature: 'accelerometer'}, cat: 'blink.webdx_feature_usage'},
      {
        args: {feature: 'abortsignal-any'}, // low (2024-03-19)
        cat: 'blink.webdx_feature_usage',
      },
      {args: {feature: 'forced-colors'}, cat: 'blink.webdx_feature_usage'}, // high (2022-09-12)
    ];
    const result = await Baseline.audit({Trace: {traceEvents}});
    expect(result.displayValue).toBeUndefined();
    expect(result.details.debugData).toBeUndefined();
  });

  it('should not set debugData when a limited availability feature ' +
    'is present (newest is widely available)', async () => {
    const traceEvents = [
      {args: {feature: 'accelerometer'}, cat: 'blink.webdx_feature_usage'},
      {args: {feature: 'forced-colors'}, cat: 'blink.webdx_feature_usage'}, // high (2022-09-12)
    ];
    const result = await Baseline.audit({Trace: {traceEvents}});
    expect(result.displayValue).toBeUndefined();
    expect(result.details.debugData).toBeUndefined();
  });

  it('should not set debugData when a limited availability feature ' +
    'is present (only limited)', async () => {
    const traceEvents = [
      {args: {feature: 'accelerometer'}, cat: 'blink.webdx_feature_usage'},
    ];
    const result = await Baseline.audit({Trace: {traceEvents}});
    expect(result.displayValue).toBeUndefined();
    expect(result.details.debugData).toBeUndefined();
  });

  it('should set correct debugData when no limited availability features ' +
    'are present (newest is newly available)', async () => {
    const traceEvents = [
      {args: {feature: 'abortsignal-any'}, cat: 'blink.webdx_feature_usage'}, // low (2024-03-19)
      {args: {feature: 'forced-colors'}, cat: 'blink.webdx_feature_usage'}, // high (2022-09-12)
    ];
    const result = await Baseline.audit({Trace: {traceEvents}});
    expect(result.displayValue).toBeUndefined();
    expect(result.details.debugData).toEqual({
      type: 'debugdata',
      newestFeatureId: 'abortsignal-any',
      newestFeatureYear: '2024',
      newestFeatureLowDate: '2024-03-19',
    });
  });

  it('should set correct debugData when no limited availability features ' +
    'are present (newest is widely available)', async () => {
    const traceEvents = [
      {args: {feature: 'forced-colors'}, cat: 'blink.webdx_feature_usage'}, // high (2022-09-12)
    ];
    const result = await Baseline.audit({Trace: {traceEvents}});
    expect(result.displayValue).toBeUndefined();
    expect(result.details.debugData).toEqual({
      type: 'debugdata',
      newestFeatureId: 'forced-colors',
      newestFeatureYear: '2020',
      newestFeatureLowDate: '2020-03-12',
    });
  });

  describe('getFeatureStatus', () => {
    const fakeData = {
      high: {
        'high-feature': '2022-09-12',
      },
      low: {
        'low-feature': '2024-03-01',
      },
      limited: ['limited-feature'],
    };

    const dateJune = new Date('2026-06-30T15:00:00Z');
    const dateOct = new Date('2026-10-01T15:00:00Z');

    it('should return high status for high features', () => {
      const status = Baseline.getFeatureStatus('high-feature', fakeData, dateJune);
      expect(status).toEqual({
        displayStatus: 'Widely Available (2022-09-12)',
        baselineTier: 'high',
      });
    });

    it('should return low status for low features if under 30 months', () => {
      const status = Baseline.getFeatureStatus('low-feature', fakeData, dateJune);
      expect(status).toEqual({
        displayStatus: 'Newly Available (2024-03-01)',
        baselineTier: 'low',
      });
    });

    it('should return high status for low features if over 30 months', () => {
      const status = Baseline.getFeatureStatus('low-feature', fakeData, dateOct);
      expect(status).toEqual({
        displayStatus: 'Widely Available (2026-09-01)',
        baselineTier: 'high',
      });
    });

    it('should return limited status for limited features', () => {
      const status = Baseline.getFeatureStatus('limited-feature', fakeData, dateJune);
      expect(status).toEqual({
        displayStatus: 'Limited Availability',
        baselineTier: 'limited',
      });
    });

    it('should return null for unknown features', () => {
      const status = Baseline.getFeatureStatus('unknown-feature-id', fakeData, dateJune);
      expect(status).toBeNull();
    });
  });
});
