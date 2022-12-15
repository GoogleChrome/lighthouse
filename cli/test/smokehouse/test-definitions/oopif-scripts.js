/**
 * @license Copyright 2022 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/** @type {LH.Config.Json} */
const config = {
  extends: 'lighthouse:default',
  categories: {
    performance: {
      title: 'Performance',
      auditRefs: [
        {id: 'oopif-iframe-test-audit', weight: 0},
        {id: 'script-elements-test-audit', weight: 0},
      ],
    },
  },
  audits: [
    // Include an audit that *forces* the IFrameElements artifact to be used for our test.
    {path: 'oopif-iframe-test-audit'},
    {path: 'script-elements-test-audit'},
  ],
  settings: {
    // This test runs in CI and hits the outside network of a live site.
    // Be a little more forgiving on how long it takes all network requests of several nested iframes
    // to complete.
    maxWaitForLoad: 180000,
    // CI machines are pretty weak which lead to many more long tasks than normal.
    // Reduce our requirement for CPU quiet.
    cpuQuietThresholdMs: 500,
  },
};

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 * Expected Lighthouse audit values for sites with OOPIFS.
 */
const expectations = {
  lhr: {
    requestedUrl: 'http://localhost:10200/oopif-scripts.html',
    finalDisplayedUrl: 'http://localhost:10200/oopif-scripts.html',
    audits: {
      'network-requests': {
        details: {
          items: {
            // Multiple session attach handling fixed in M105
            // https://chromiumdash.appspot.com/commit/f42337f1d623ec913397610ccf01b5526e9e919d
            _minChromiumVersion: '105',
            _includes: [
              {url: 'http://localhost:10200/oopif-scripts.html'},
              {url: 'http://localhost:10200/oopif-simple-page.html'},
              {url: 'http://localhost:10503/oopif-simple-page.html'},
              // simple-script.js is included many times
              // 2 * (1 from <script>, 1 from fetch) = 4
              // Note, the network records from the workers are _not_ captured! If they
              // were, then we would see 8 simple-script.js
              {url: 'http://localhost:10200/simple-script.js', resourceType: 'Script'},
              {url: 'http://localhost:10503/simple-script.js', resourceType: 'Script'},
              {url: 'http://localhost:10200/simple-script.js', resourceType: 'Fetch'},
              {url: 'http://localhost:10503/simple-script.js', resourceType: 'Fetch'},
              {url: 'http://localhost:10200/simple-worker.js'},
              {url: 'http://localhost:10503/simple-worker.js'},
              // These requests are emitted in workers so Lighthouse doesn't capture them.
              // For some reason, legacy navigations in DevTools still pick them up.
              // https://github.com/GoogleChrome/lighthouse/issues/14211
              {_legacyOnly: true, _runner: 'devtools', url: 'http://localhost:10200/simple-worker.mjs'},
              {_legacyOnly: true, _runner: 'devtools', url: 'http://localhost:10503/simple-worker.mjs'},
              {_legacyOnly: true, _runner: 'devtools', url: 'http://localhost:10200/simple-script.js?esm', resourceType: 'Script'},
              {_legacyOnly: true, _runner: 'devtools', url: 'http://localhost:10503/simple-script.js?esm', resourceType: 'Script'},
              {_legacyOnly: true, _runner: 'devtools', url: 'http://localhost:10200/simple-script.js?importScripts', resourceType: 'Other'},
              {_legacyOnly: true, _runner: 'devtools', url: 'http://localhost:10503/simple-script.js?importScripts', resourceType: 'Other'},
            ],
            // Ensure the above is exhaustive (except for favicon, which won't be fetched in devtools/LR).
            _excludes: [
              {url: /^((?!favicon).)*$/s},
            ],
          },
        },
      },
    },
  },
  artifacts: {
    IFrameElements: [
      {
        id: 'iframe-1',
        src: 'http://localhost:10200/oopif-simple-page.html',
        clientRect: {
          width: '>0',
          height: '>0',
        },
        isPositionFixed: true,
      },
      {
        id: 'iframe-2',
        src: 'http://localhost:10503/oopif-simple-page.html',
        clientRect: {
          width: '>0',
          height: '>0',
        },
        isPositionFixed: true,
      },
    ],
    // Only `:10200/oopif-simple-page.html`'s inclusion of `simple-script.js` shows here.
    // All other scripts are filtered out because of our "OOPIF" filter (including anything
    // that is just in another process, like a worker).
    ScriptElements: [
      {
        src: 'http://localhost:10200/simple-script.js',
        source: 'network',
      },
    ],
    // Same here, except we get inline and eval scripts of the iframe.
    Scripts: {
      _includes: [
        {
          url: 'http://localhost:10200/simple-script.js',
          content: /🪁/,
        },
        // inline script
        {
          url: 'http://localhost:10200/oopif-simple-page.html',
          content: /new Worker/,
        },
        // fetch('simple-script.js').then(r => r.text()).then(eval);
        {
          name: '<compiled from string in http://localhost:10200/oopif-simple-page.html>',
          url: '',
          content: /🪁/,
          stackTrace: undefined,
        },
        {
          name: 'eval.js',
          url: '',
          content: /hello from _named_ eval world/,
          // It seems chromium will only track a single frame.
          stackTrace: {callFrames: [{functionName: '', lineNumber: 29}]},
        },
        {
          name: '<compiled from string in http://localhost:10200/oopif-simple-page.html>',
          url: '',
          content: /hello from eval world/,
          stackTrace: {callFrames: [{functionName: 'fnWrapper1', lineNumber: 17}]},
        },
        {
          name: '<compiled from string in http://localhost:10200/oopif-simple-page.html>',
          url: '',
          content: /hello from setTimeout world/,
          stackTrace: undefined,
        },
      ],
      _excludes: [{}],
    },
  },
};

export default {
  id: 'oopif-scripts',
  expectations,
  config,
};
