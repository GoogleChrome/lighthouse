/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import LargestContentfulPaintLazyLoaded from '../../audits/lcp-lazy-loaded.js';
import {defaultSettings} from '../../config/constants.js';
import {createTestTrace, rootFrame} from '../create-test-trace.js';
import {networkRecordsToDevtoolsLog} from '../network-records-to-devtools-log.js';

const SAMPLE_NODE = {
  devtoolsNodePath: '1,HTML,1,BODY,3,DIV,2,IMG',
  selector: 'div.l-header > div.chorus-emc__content',
  nodeLabel: 'My Test Label',
  snippet: '<img class="test-class">',
};
const mainDocumentUrl = 'http://www.example.com';

function generateImage(loading, clientRectTop) {
  return {
    src: 'test',
    loading,
    clientRect: {
      top: clientRectTop,
      bottom: 400,
      left: 0,
      right: 0,
    },
    node: SAMPLE_NODE,
  };
}

describe('Performance: lcp-lazy-loaded audit', () => {
  it('correctly surfaces the lazy loaded LCP element', async () => {
    const artifacts = {
      TraceElements: [{
        traceEventType: 'largest-contentful-paint',
        node: SAMPLE_NODE,
        type: 'image',
      }],
      ImageElements: [
        generateImage('lazy', 0),
      ],
      ViewportDimensions: {
        innerHeight: 500,
        innerWidth: 300,
      },
      traces: {
        defaultPass: createTestTrace({
          largestContentfulPaint: 1000,
          topLevelTasks: [{ts: 10, duration: 1000}],
        }),
      },
      devtoolsLogs: {
        defaultPass: networkRecordsToDevtoolsLog([
          {
            url: mainDocumentUrl,
            priority: 'High',
            networkRequestTime: 100,
            networkEndTime: 200,
            timing: {sendEnd: 0},
            frameId: rootFrame,
          },
          {
            url: 'http://www.example.com/image.png',
            priority: 'Low',
            resourceType: 'Image',
            networkRequestTime: 800,
            networkEndTime: 900,
            timing: {sendEnd: 0},
            frameId: rootFrame,
          },
        ]),
      },
      URL: {
        requestedUrl: mainDocumentUrl,
        mainDocumentUrl,
        finalDisplayedUrl: mainDocumentUrl,
      },
      GatherContext: {gatherMode: 'navigation'},
    };

    const settings = JSON.parse(JSON.stringify(defaultSettings));
    settings.throttlingMethod = 'devtools';

    const context = {
      computedCache: new Map(),
      settings,
    };

    const auditResult = await LargestContentfulPaintLazyLoaded.audit(artifacts, context);
    expect(auditResult.score).toEqual(0);
    expect(auditResult.metricSavings).toEqual({LCP: 150});
    expect(auditResult.details.items).toHaveLength(1);
    expect(auditResult.details.items[0].node.path).toEqual('1,HTML,1,BODY,3,DIV,2,IMG');
    expect(auditResult.details.items[0].node.nodeLabel).toEqual('My Test Label');
    expect(auditResult.details.items[0].node.snippet).toEqual('<img class="test-class">');
  });

  it('eager LCP element scores 1', async () => {
    const artifacts = {
      TraceElements: [{
        traceEventType: 'largest-contentful-paint',
        node: SAMPLE_NODE,
        type: 'image',
      }],
      ImageElements: [
        generateImage('eager', 0),
      ],
      ViewportDimensions: {
        innerHeight: 500,
        innerWidth: 300,
      },
      traces: {
        defaultPass: createTestTrace({
          largestContentfulPaint: 1000,
          topLevelTasks: [{ts: 10, duration: 1000}],
        }),
      },
      devtoolsLogs: {
        defaultPass: networkRecordsToDevtoolsLog([
          {
            url: mainDocumentUrl,
            priority: 'High',
            networkRequestTime: 100,
            networkEndTime: 200,
            timing: {sendEnd: 0},
            frameId: rootFrame,
          },
          {
            url: 'http://www.example.com/image.png',
            priority: 'Low',
            resourceType: 'Image',
            networkRequestTime: 800,
            networkEndTime: 900,
            timing: {sendEnd: 0},
            frameId: rootFrame,
          },
        ]),
      },
      URL: {
        requestedUrl: mainDocumentUrl,
        mainDocumentUrl,
        finalDisplayedUrl: mainDocumentUrl,
      },
      GatherContext: {gatherMode: 'navigation'},
    };

    const settings = JSON.parse(JSON.stringify(defaultSettings));
    settings.throttlingMethod = 'devtools';

    const context = {
      computedCache: new Map(),
      settings,
    };

    const auditResult = await LargestContentfulPaintLazyLoaded.audit(artifacts, context);
    expect(auditResult.score).toEqual(1);
    expect(auditResult.metricSavings).toEqual({LCP: 0});
    expect(auditResult.details.items).toHaveLength(1);
  });

  it('not applicable when outside of viewport', async () => {
    const artifacts = {
      TraceElements: [{
        traceEventType: 'largest-contentful-paint',
        node: SAMPLE_NODE,
        type: 'image',
      }],
      ImageElements: [
        generateImage('lazy', 700),
      ],
      ViewportDimensions: {
        innerHeight: 500,
        innerWidth: 300,
      },
    };
    const auditResult = await LargestContentfulPaintLazyLoaded.audit(artifacts);
    expect(auditResult.metricSavings).toEqual({LCP: 0});
    expect(auditResult.notApplicable).toEqual(true);
  });

  it('doesn\'t throw an error when there is nothing to show', async () => {
    const artifacts = {
      TraceElements: [],
      ImageElements: [],
    };

    const auditResult = await LargestContentfulPaintLazyLoaded.audit(artifacts);
    expect(auditResult.score).toEqual(null);
    expect(auditResult.metricSavings).toEqual({LCP: 0});
    expect(auditResult.notApplicable).toEqual(true);
  });

  it('is not applicable when LCP was text', async () => {
    const artifacts = {
      TraceElements: [{
        traceEventType: 'largest-contentful-paint',
        node: SAMPLE_NODE,
        type: 'text',
      }],
      ImageElements: [
        generateImage('lazy', 700),
      ],
      ViewportDimensions: {
        innerHeight: 500,
        innerWidth: 300,
      },
    };
    const auditResult = await LargestContentfulPaintLazyLoaded.audit(artifacts);
    expect(auditResult).toEqual({
      score: null,
      notApplicable: true,
      metricSavings: {
        LCP: 0,
      },
    });
  });
});
