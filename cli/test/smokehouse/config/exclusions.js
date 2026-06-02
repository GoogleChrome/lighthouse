/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * List of smoke tests excluded per runner. eg: 'cli': ['a11y', 'dbw']
 * @type {Record<string, Array<string>>}
 */
const exclusions = {
  'bundle': [],
  'cli': [],
  'devtools': [
    // Disabled because normal Chrome usage makes DevTools not function on
    // these poorly constructed pages
    'errors-expired-ssl', 'errors-infinite-loop',
    // Disabled because Chrome will follow the redirect first, and Lighthouse will
    // only ever see/run the final URL.
    'redirects-client-paint-server', 'redirects-multiple-server',
    'redirects-single-server', 'redirects-single-client',
    'redirects-history-push-state', 'redirects-scripts',
    'redirects-http',
    // Disabled because these tests use settings that cannot be fully configured in
    // DevTools (e.g. throttling method "provided").
    'metrics-tricky-tti', 'metrics-tricky-tti-late-fcp', 'screenshot',
    // Disabled because of differences that need further investigation
    'byte-efficiency', 'byte-gzip', 'perf-preload',
    // Disabled because a renderer crash also breaks devtools frontend
    'crash',
    // Disabled because is timing out.
    'oopif-scripts',
  ],
  'devtools-mcp': [
    // Disabled because performance tracing related audits are not supported.
    'byte-efficiency',
    'byte-gzip',
    'dbw',
    'errors-expired-ssl',
    'errors-iframe-expired-ssl',
    'errors-infinite-loop',
    'forms-autocomplete',
    'fps-max-passive',
    'fps-max',
    'fps-overflow-x',
    'lantern-fetch',
    'lantern-idle-callback-long',
    'lantern-idle-callback-short',
    'lantern-online',
    'lantern-set-timeout',
    'lantern-xhr',
    'legacy-javascript',
    'metrics-debugger',
    'metrics-delayed-fcp',
    'metrics-delayed-lcp',
    'metrics-tricky-tti-late-fcp',
    'metrics-tricky-tti',
    'oopif-requests',
    'oopif-scripts',
    'perf-debug',
    'perf-diagnostics-animations',
    'perf-diagnostics-unsized-images',
    'perf-fonts',
    'perf-frame-metrics',
    'perf-preload',
    'perf-trace-elements',
    'redirects-client-paint-server',
    'redirects-history-push-state',
    'redirects-multiple-server',
    'redirects-scripts',
    'redirects-single-client',
    'redirects-single-server',
    'screenshot',
    'shift-attribution',
    'source-maps',
    'timing',
  ],
};

for (const array of Object.values(exclusions)) {
  // https://github.com/GoogleChrome/lighthouse/issues/14271
  array.push('lantern-idle-callback-short');
  // glitch is gone.
  array.push('issues-mixed-content');
  // works most of the time, but since it uses a live site it can be flaky
  array.push('trusted-types-directive-present');
}

export default exclusions;
