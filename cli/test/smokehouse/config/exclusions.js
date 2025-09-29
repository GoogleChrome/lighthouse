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
};

for (const array of Object.values(exclusions)) {
  // https://github.com/GoogleChrome/lighthouse/issues/14271
  array.push('lantern-idle-callback-short');
  // https://github.com/GoogleChrome/lighthouse/issues/16597
  array.push('csp-block-all');
  // glitch is gone.
  array.push('issues-mixed-content');
  // works most of the time, but since it uses a live site it can be flaky
  array.push('trusted-types-directive-present');
}

export default exclusions;
