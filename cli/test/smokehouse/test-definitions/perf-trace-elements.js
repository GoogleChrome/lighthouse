/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/** @type {LH.Config} */
const config = {
  extends: 'lighthouse:default',
  settings: {
    throttlingMethod: 'devtools',
    onlyCategories: ['performance'],
    // BF cache will request the page again, initiating additional network requests.
    // Disable the audit so we only detect requests from the normal page load.
    skipAudits: ['bf-cache'],
  },
};

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 * Expected Lighthouse audit values for testing key elements from the trace.
 */
const expectations = {
  networkRequests: {
    // DevTools loads the page three times, so this request count will not be accurate.
    _excludeRunner: 'devtools',
    length: 3,
  },
  artifacts: {
    TraceElements: [
      {traceEventType: 'trace-engine'},
      {traceEventType: 'trace-engine'},
      {traceEventType: 'trace-engine'},
      {traceEventType: 'trace-engine'},
      {traceEventType: 'trace-engine'},
      {traceEventType: 'trace-engine'},
      {
        traceEventType: 'layout-shift',
        node: {
          nodeLabel: `Please don't move me`,
        },
      },
      {
        traceEventType: 'layout-shift',
        node: {
          nodeLabel: `Please don't move me`,
        },
      },
      {
        traceEventType: 'animation',
        node: {
          selector: 'body > div#animate-me',
          nodeLabel: 'This is changing font size',
          snippet: '<div id="animate-me">',
          boundingRect: {
            top: 8,
            bottom: 108,
            left: 8,
            right: 108,
            width: 100,
            height: 100,
          },
        },
        animations: [
          {
            name: 'anim',
            failureReasonsMask: 8224,
            unsupportedProperties: ['font-size'],
          },
        ],
      },
    ],
  },
  lhr: {
    requestedUrl: 'http://localhost:10200/perf/trace-elements.html',
    finalDisplayedUrl: 'http://localhost:10200/perf/trace-elements.html',
    audits: {
      'lcp-breakdown-insight': {
        score: 0,
        details: {
          items: [
            {
              items: [
                {
                  subpart: 'timeToFirstByte',
                  duration: '>0',
                },
                {
                  subpart: 'resourceLoadDelay',
                  duration: '>0',
                },
                {
                  subpart: 'resourceLoadDuration',
                  duration: '>0',
                },
                {
                  subpart: 'elementRenderDelay',
                  duration: '>0',
                },
              ],
            },
            {
              type: 'node',
              nodeLabel: 'section > img',
              path: '0,HTML,1,BODY,1,DIV,a,#document-fragment,0,SECTION,0,IMG',
            },
          ],
        },
      },
      'lcp-discovery-insight': {
        score: 0,
        details: {
          items: [
            {
              type: 'checklist',
              items: {
                priorityHinted: {value: false},
                requestDiscoverable: {value: false},
                // https://crrev.com/c/7001499
                eagerlyLoaded: {value: false, _minChromiumVersion: '143'},
              },
            },
            {
              type: 'node',
              nodeLabel: 'section > img',
              path: '0,HTML,1,BODY,1,DIV,a,#document-fragment,0,SECTION,0,IMG',
            },
          ],
        },
      },
      'cls-culprits-insight': {
        score: 1,
        // TODO(v13): should we add displayValue for this insight?
        // displayValue: '2 layout shifts found',
        details: {
          items: [
            {
              type: 'table',
              items: [
                {
                  node: {
                    type: 'text',
                    value: 'Total',
                  },
                  score: '0.05 +/- 0.005',
                },
                {
                  node: {
                    selector: 'body > h1',
                    nodeLabel: 'Please don\'t move me',
                    snippet: '<h1>',
                    boundingRect: {
                      top: 465,
                      bottom: 502,
                      left: 8,
                      right: 404,
                      width: 396,
                      height: 37,
                    },
                  },
                  score: '0.05 +/- 0.01',
                },
                {
                  node: {
                    nodeLabel: /Sorry|Please don't move me/,
                  },
                  score: '0.001 +/- 0.005',
                },
              ],
            },
          ],
        },
      },
      'long-tasks': {
        score: 1,
        details: {
          items: {
            0: {
              url: 'http://localhost:10200/perf/delayed-element.js',
              duration: '>500',
              startTime: '5000 +/- 5000', // make sure it's on the right time scale, but nothing more
            },
          },
        },
      },
    },
  },
};

export default {
  id: 'perf-trace-elements',
  expectations,
  config,
  runSerially: true,
};
