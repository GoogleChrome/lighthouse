/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {NO_NAVIGATION} from '@paulirish/trace_engine/models/trace/types/TraceEvents.js';

import {adaptInsightToAuditProduct, getInsightSet} from '../../../audits/insights/insight-audit.js';
import {defaultSettings} from '../../../config/constants.js';
import {ArbitraryEqualityMap} from '../../../lib/arbitrary-equality-map.js';

const settings = JSON.parse(JSON.stringify(defaultSettings));

/**
 * Seeds the computed artifact caches so getInsightSet doesn't run the real
 * trace processing, just the insight-set selection.
 * @param {{processedTrace: unknown, traceEngineResult: unknown}} stubs
 */
function makeContext(stubs) {
  const computedCache = new Map();

  const processedCache = new ArbitraryEqualityMap();
  processedCache.set(stubs.trace, stubs.processedTrace);
  computedCache.set('ProcessedTrace', processedCache);

  const traceEngineCache = new ArbitraryEqualityMap();
  traceEngineCache.set(
    {
      trace: stubs.trace,
      settings: stubs.settings,
      SourceMaps: stubs.SourceMaps,
      HostDPR: stubs.HostDPR,
    },
    stubs.traceEngineResult
  );
  computedCache.set('TraceEngineResult', traceEngineCache);

  return {context: {computedCache, settings}, cacheKeys: stubs};
}

function makeArtifacts(stubs) {
  return {
    Trace: stubs.trace,
    SourceMaps: stubs.SourceMaps,
    HostDPR: stubs.HostDPR,
  };
}

describe('getInsightSet', () => {
  const stubs = {
    trace: {},
    settings,
    SourceMaps: [],
    HostDPR: 1,
    processedTrace: {
      timeOriginEvt: {args: {data: {navigationId: '2'}}},
    },
    traceEngineResult: {
      data: {},
      insights: new Map([
        ['NAVIGATION_1', {navigation: {args: {data: {navigationId: '1'}}}}],
        ['NAVIGATION_2', {navigation: {args: {data: {navigationId: '2'}}}}],
        [NO_NAVIGATION, {navigation: null}],
      ]),
    },
  };

  it('selects the insight set matching the trace navigationId', async () => {
    const {context} = makeContext(stubs);
    const {insights} = await getInsightSet(makeArtifacts(stubs), context);
    expect(insights).toBe(stubs.traceEngineResult.insights.get('NAVIGATION_2'));
  });

  it('falls back to the NO_NAVIGATION insight set when there is no navigation', async () => {
    const stubsWithoutNavigation = {
      ...stubs,
      processedTrace: {timeOriginEvt: {args: {data: {}}}},
    };
    const {context} = makeContext(stubsWithoutNavigation);
    const {insights} = await getInsightSet(makeArtifacts(stubsWithoutNavigation), context);
    expect(insights).toBe(stubsWithoutNavigation.traceEngineResult.insights.get(NO_NAVIGATION));
  });
});

describe('adaptInsightToAuditProduct', () => {
  function runAdaptInsight(
    insightName,
    insight,
    createDetails = () => ({type: 'table', headings: [], items: []})
  ) {
    const stubs = {
      trace: {},
      settings,
      SourceMaps: [],
      HostDPR: 1,
      processedTrace: {
        timeOriginEvt: {args: {data: {navigationId: '1'}}},
      },
      traceEngineResult: {
        data: {},
        insights: new Map([
          [
            'NAVIGATION_1',
            {
              navigation: {args: {data: {navigationId: '1'}}},
              modelErrors: {},
              model: {
                [insightName]: insight,
              },
            },
          ],
        ]),
      },
    };
    const {context} = makeContext(stubs);
    return adaptInsightToAuditProduct(makeArtifacts(stubs), context, insightName, createDetails);
  }

  it('populates numericValue and numericUnit for byte-based insights', async () => {
    const failing = await runAdaptInsight('ImageDelivery', {
      insightKey: 'ImageDelivery',
      state: 'fail',
      category: 'LCP',
      wastedBytes: 4096,
      metricSavings: {FCP: 0, LCP: 100},
    });
    expect(failing.numericValue).toBe(4096);
    expect(failing.numericUnit).toBe('byte');
    expect(failing.displayValue).toBeDefined();

    const passing = await runAdaptInsight('ImageDelivery', {
      insightKey: 'ImageDelivery',
      state: 'pass',
      category: 'LCP',
      wastedBytes: 0,
      metricSavings: undefined,
    });
    expect(passing.numericValue).toBe(0);
    expect(passing.numericUnit).toBe('byte');
    expect(passing.displayValue).toBeUndefined();

    const passingDuplicatedJs = await runAdaptInsight('DuplicatedJavaScript', {
      insightKey: 'DuplicatedJavaScript',
      state: 'pass',
      category: 'LCP',
      wastedBytes: 0,
      metricSavings: {FCP: 0, LCP: 0},
    });
    expect(passingDuplicatedJs.numericValue).toBe(0);
    expect(passingDuplicatedJs.numericUnit).toBe('byte');
    expect(passingDuplicatedJs.displayValue).toBeUndefined();
  });

  it('populates numericValue and numericUnit for time-based insights', async () => {
    const failingRenderBlocking = await runAdaptInsight('RenderBlocking', {
      insightKey: 'RenderBlocking',
      state: 'fail',
      category: 'LCP',
      metricSavings: {FCP: 350, LCP: 0},
    });
    expect(failingRenderBlocking.numericValue).toBe(350);
    expect(failingRenderBlocking.numericUnit).toBe('millisecond');
    expect(failingRenderBlocking.displayValue).toBeDefined();

    const passingRenderBlocking = await runAdaptInsight('RenderBlocking', {
      insightKey: 'RenderBlocking',
      state: 'pass',
      category: 'LCP',
      metricSavings: {FCP: 0, LCP: 0},
    });
    expect(passingRenderBlocking.numericValue).toBe(0);
    expect(passingRenderBlocking.numericUnit).toBe('millisecond');
    expect(passingRenderBlocking.displayValue).toBeUndefined();

    // FontDisplay can have -Infinity FCP savings when passing.
    const passingFontDisplay = await runAdaptInsight('FontDisplay', {
      insightKey: 'FontDisplay',
      state: 'pass',
      category: 'INP',
      metricSavings: {FCP: -Infinity},
    });
    expect(passingFontDisplay.numericValue).toBe(0);
    expect(passingFontDisplay.numericUnit).toBe('millisecond');
    expect(passingFontDisplay.displayValue).toBeUndefined();

    const failingModernHttp = await runAdaptInsight('ModernHTTP', {
      insightKey: 'ModernHTTP',
      state: 'fail',
      category: 'LCP',
      metricSavings: {FCP: 50, LCP: 120},
    });
    expect(failingModernHttp.numericValue).toBe(120);
    expect(failingModernHttp.numericUnit).toBe('millisecond');
    expect(failingModernHttp.displayValue).toBeDefined();

    const passingViewport = await runAdaptInsight('Viewport', {
      insightKey: 'Viewport',
      state: 'pass',
      category: 'INP',
      metricSavings: undefined,
    });
    expect(passingViewport.numericValue).toBe(0);
    expect(passingViewport.numericUnit).toBe('millisecond');
    expect(passingViewport.displayValue).toBeUndefined();
  });

  it('uses a deterministic millisecond numericUnit for DocumentLatency', async () => {
    const withWastedBytes = await runAdaptInsight('DocumentLatency', {
      insightKey: 'DocumentLatency',
      state: 'fail',
      category: 'ALL',
      wastedBytes: 12000,
      metricSavings: {FCP: 0, LCP: 0},
    });
    expect(withWastedBytes.numericValue).toBe(0);
    expect(withWastedBytes.numericUnit).toBe('millisecond');
    expect(withWastedBytes.displayValue).toBeDefined();

    const withMsSavingsOnly = await runAdaptInsight('DocumentLatency', {
      insightKey: 'DocumentLatency',
      state: 'fail',
      category: 'ALL',
      wastedBytes: 0,
      metricSavings: {FCP: 250, LCP: 250},
    });
    expect(withMsSavingsOnly.numericValue).toBe(250);
    expect(withMsSavingsOnly.numericUnit).toBe('millisecond');
    expect(withMsSavingsOnly.displayValue).toBeDefined();
  });

  it('preserves custom numericValue and numericUnit from createDetails', async () => {
    const domSize = await runAdaptInsight(
      'DOMSize',
      {
        insightKey: 'DOMSize',
        state: 'pass',
        category: 'INP',
      },
      () => ({
        details: {type: 'table', headings: [], items: []},
        numericValue: 153,
        numericUnit: 'element',
      })
    );
    expect(domSize.numericValue).toBe(153);
    expect(domSize.numericUnit).toBe('element');
  });

  it('leaves numericValue and numericUnit undefined for insights without savings', async () => {
    const thirdParties = await runAdaptInsight('ThirdParties', {
      insightKey: 'ThirdParties',
      state: 'informative',
      category: 'ALL',
    });
    expect(thirdParties.numericValue).toBeUndefined();
    expect(thirdParties.numericUnit).toBeUndefined();
  });
});
