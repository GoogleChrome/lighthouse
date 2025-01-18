/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import a11y from './test-definitions/a11y.js';
import byteEfficiency from './test-definitions/byte-efficiency.js';
import byteGzip from './test-definitions/byte-gzip.js';
import crash from './test-definitions/crash.js';
import cspAllowAll from './test-definitions/csp-allow-all.js';
import cspBlockAll from './test-definitions/csp-block-all.js';
import dbw from './test-definitions/dobetterweb.js';
import errorsExpiredSsl from './test-definitions/errors-expired-ssl.js';
import errorsIframeExpiredSsl from './test-definitions/errors-iframe-expired-ssl.js';
import errorsInfiniteLoop from './test-definitions/errors-infinite-loop.js';
import fontSize from './test-definitions/font-size.js';
import formsAutoComplete from './test-definitions/forms-autocomplete.js';
import fpsMax from './test-definitions/fps-max.js';
import fpsMaxPassive from './test-definitions/fps-max-passive.js';
import fpsScaled from './test-definitions/fps-scaled.js';
import fpsOverflowX from './test-definitions/fps-overflow-x.js';
import issuesMixedContent from './test-definitions/issues-mixed-content.js';
import hstsFullyPresent from './test-definitions/hsts-fully-present.js';
import hstsMissingDirectives from './test-definitions/hsts-missing-directives.js';
import lanternFetch from './test-definitions/lantern-fetch.js';
import lanternIdleCallbackLong from './test-definitions/lantern-idle-callback-long.js';
import lanternIdleCallbackShort from './test-definitions/lantern-idle-callback-short.js';
import lanternOnline from './test-definitions/lantern-online.js';
import lanternSetTimeout from './test-definitions/lantern-set-timeout.js';
import lanternXhr from './test-definitions/lantern-xhr.js';
import legacyJavascript from './test-definitions/legacy-javascript.js';
import metricsDebugger from './test-definitions/metrics-debugger.js';
import metricsDelayedFcp from './test-definitions/metrics-delayed-fcp.js';
import metricsDelayedLcp from './test-definitions/metrics-delayed-lcp.js';
import metricsTrickyTti from './test-definitions/metrics-tricky-tti.js';
import metricsTrickyTtiLateFcp from './test-definitions/metrics-tricky-tti-late-fcp.js';
import oopifRequests from './test-definitions/oopif-requests.js';
import oopifScripts from './test-definitions/oopif-scripts.js';
import originIsolationCoopHeaderMissing from './test-definitions/origin-isolation-coop-header-missing.js';
import originIsolationCoopPresent from './test-definitions/origin-isolation-coop-present.js';
import perfDebug from './test-definitions/perf-debug.js';
import perfDiagnosticsAnimations from './test-definitions/perf-diagnostics-animations.js';
import perfDiagnosticsThirdParty from './test-definitions/perf-diagnostics-third-party.js';
import perfDiagnosticsUnsizedImages from './test-definitions/perf-diagnostics-unsized-images.js';
import perfFonts from './test-definitions/perf-fonts.js';
import perfFrameMetrics from './test-definitions/perf-frame-metrics.js';
import perfPreload from './test-definitions/perf-preload.js';
import perfTraceElements from './test-definitions/perf-trace-elements.js';
import redirectsClientPaintServer from './test-definitions/redirects-client-paint-server.js';
import redirectsHistoryPushState from './test-definitions/redirects-history-push-state.js';
import redirectsHttp from './test-definitions/redirects-http.js';
import redirectsMultipleServer from './test-definitions/redirects-multiple-server.js';
import redirectsScripts from './test-definitions/redirects-scripts.js';
import redirectsSelf from './test-definitions/redirects-self.js';
import redirectsSingleClient from './test-definitions/redirects-single-client.js';
import redirectsSingleServer from './test-definitions/redirects-single-server.js';
import screenshot from './test-definitions/screenshot.js';
import seoFailing from './test-definitions/seo-failing.js';
import seoPassing from './test-definitions/seo-passing.js';
import seoStatus403 from './test-definitions/seo-status-403.js';
import serviceWorkerReloaded from './test-definitions/service-worker-reloaded.js';
import shiftAttribution from './test-definitions/shift-attribution.js';
import sourceMaps from './test-definitions/source-maps.js';
import timing from './test-definitions/timing.js';

/** @type {ReadonlyArray<Smokehouse.TestDfn>} */
const smokeTests = [
  a11y,
  byteEfficiency,
  byteGzip,
  crash,
  cspAllowAll,
  cspBlockAll,
  dbw,
  errorsExpiredSsl,
  errorsIframeExpiredSsl,
  errorsInfiniteLoop,
  fontSize,
  formsAutoComplete,
  fpsMax,
  fpsMaxPassive,
  fpsOverflowX,
  fpsScaled,
  issuesMixedContent,
  hstsFullyPresent,
  hstsMissingDirectives,
  lanternFetch,
  lanternIdleCallbackLong,
  lanternIdleCallbackShort,
  lanternOnline,
  lanternSetTimeout,
  lanternXhr,
  legacyJavascript,
  metricsDebugger,
  metricsDelayedFcp,
  metricsDelayedLcp,
  metricsTrickyTti,
  metricsTrickyTtiLateFcp,
  oopifRequests,
  oopifScripts,
  originIsolationCoopHeaderMissing,
  originIsolationCoopPresent,
  perfDebug,
  perfDiagnosticsAnimations,
  perfDiagnosticsThirdParty,
  perfDiagnosticsUnsizedImages,
  perfFonts,
  perfFrameMetrics,
  perfPreload,
  perfTraceElements,
  redirectsClientPaintServer,
  redirectsHistoryPushState,
  redirectsHttp,
  redirectsMultipleServer,
  redirectsScripts,
  redirectsSelf,
  redirectsSingleClient,
  redirectsSingleServer,
  screenshot,
  seoFailing,
  seoPassing,
  seoStatus403,
  serviceWorkerReloaded,
  shiftAttribution,
  sourceMaps,
  timing,
];

export default smokeTests;
