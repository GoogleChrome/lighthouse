/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/** @type {LH.Config} */
const config = {
  extends: 'lighthouse:default',
  settings: {
    debugNavigation: true,
    onlyAudits: ['metrics'],
  },
};

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 * Expected results of having a 30s `debugNavigation` break in page load.
 */
const expectations = {
  lhr: {
    requestedUrl: 'http://localhost:10200/perf/debug.html',
    finalDisplayedUrl: 'http://localhost:10200/perf/debug.html',
    audits: {metrics: {details: {items: {0: {observedTraceEnd: '>30000'}}}}},
  },
};

export default {
  id: 'perf-debug',
  expectations,
  config,
};
