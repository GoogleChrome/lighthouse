/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {NO_NAVIGATION} from '@paulirish/trace_engine/models/trace/types/TraceEvents.js';

import {getInsightSet} from '../../../audits/insights/insight-audit.js';
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
