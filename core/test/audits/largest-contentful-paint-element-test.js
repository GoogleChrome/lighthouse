/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import LargestContentfulPaintElementAudit from '../../audits/largest-contentful-paint-element.js';
import {defaultSettings} from '../../config/constants.js';
import {createTestTrace} from '../create-test-trace.js';
import {networkRecordsToDevtoolsLog} from '../network-records-to-devtools-log.js';

const requestedUrl = 'http://example.com:3000';
const mainDocumentUrl = 'http://www.example.com:3000';

const scriptUrl = 'http://www.example.com/script.js';
const imageUrl = 'http://www.example.com/image.png';

function mockNetworkRecords() {
  return [{
    requestId: '2',
    priority: 'High',
    isLinkPreload: false,
    networkRequestTime: 0,
    networkEndTime: 500,
    responseHeadersEndTime: 500,
    responseHeadersTransferSize: 400,
    transferSize: 400,
    url: requestedUrl,
    frameId: 'ROOT_FRAME',
  },
  {
    requestId: '2:redirect',
    resourceType: 'Document',
    priority: 'High',
    isLinkPreload: false,
    networkRequestTime: 500,
    responseHeadersEndTime: 800,
    networkEndTime: 1000,
    timing: {sendEnd: 0, receiveHeadersEnd: 300},
    transferSize: 16_000,
    url: mainDocumentUrl,
    frameId: 'ROOT_FRAME',
  },
  {
    requestId: '3',
    resourceType: 'Script',
    priority: 'High',
    isLinkPreload: false,
    networkRequestTime: 1000,
    networkEndTime: 2000,
    transferSize: 32_000,
    url: scriptUrl,
    initiator: {type: 'parser', url: mainDocumentUrl},
    frameId: 'ROOT_FRAME',
  },
  {
    requestId: '4',
    resourceType: 'Image',
    priority: 'High',
    isLinkPreload: false,
    networkRequestTime: 2000,
    networkEndTime: 4500,
    transferSize: 640_000,
    url: imageUrl,
    initiator: {type: 'script', url: scriptUrl},
    frameId: 'ROOT_FRAME',
  }];
}

describe('Performance: largest-contentful-paint-element audit', () => {
  it('correctly surfaces the LCP element', async () => {
    const networkRecords = mockNetworkRecords();
    const artifacts = {
      TraceElements: [{
        traceEventType: 'largest-contentful-paint',
        node: {
          devtoolsNodePath: '1,HTML,3,BODY,5,DIV,0,HEADER',
          selector: 'div.l-header > div.chorus-emc__content',
          nodeLabel: 'My Test Label',
          snippet: '<h1 class="test-class">',
        },
        type: 'text',
      }],
      settings: JSON.parse(JSON.stringify(defaultSettings)),
      traces: {
        defaultPass: createTestTrace({
          traceEnd: 6000,
          largestContentfulPaint: 8000,
          networkRecords,
        }),
      },
      devtoolsLogs: {
        defaultPass: networkRecordsToDevtoolsLog(networkRecords),
      },
      URL: {
        requestedUrl,
        mainDocumentUrl,
        finalDisplayedUrl: mainDocumentUrl,
      },
      GatherContext: {gatherMode: 'navigation'},
    };

    const context = {settings: artifacts.settings, computedCache: new Map()};
    const auditResult = await LargestContentfulPaintElementAudit.audit(artifacts, context);

    expect(auditResult.score).toEqual(0);
    expect(auditResult.notApplicable).toBeUndefined();
    expect(auditResult.displayValue).toBeDisplayString('5,340\xa0ms');
    expect(auditResult.metricSavings).toEqual({LCP: 2837}); // calculated LCP - 2500 (p10 mobile)
    expect(auditResult.details.items).toHaveLength(2);
    expect(auditResult.details.items[0].items).toHaveLength(1);
    expect(auditResult.details.items[0].items[0].node.path).toEqual('1,HTML,3,BODY,5,DIV,0,HEADER');
    expect(auditResult.details.items[0].items[0].node.nodeLabel).toEqual('My Test Label');
    expect(auditResult.details.items[0].items[0].node.snippet).toEqual('<h1 class="test-class">');

    // LCP phases
    expect(auditResult.details.items[1].items).toHaveLength(4);
    expect(auditResult.details.items[1].items[0].phase).toBeDisplayString('TTFB');
    expect(auditResult.details.items[1].items[0].timing).toBeCloseTo(800, 0.1);
    expect(auditResult.details.items[1].items[1].phase).toBeDisplayString('Load Delay');
    expect(auditResult.details.items[1].items[1].timing).toBeCloseTo(534.2, 0.1);
    expect(auditResult.details.items[1].items[2].phase).toBeDisplayString('Load Time');
    expect(auditResult.details.items[1].items[2].timing).toBeCloseTo(1667.8, 0.1);
    expect(auditResult.details.items[1].items[3].phase).toBeDisplayString('Render Delay');
    expect(auditResult.details.items[1].items[3].timing).toBeCloseTo(2334.9, 0.1);
  });

  it('doesn\'t throw an error when there is nothing to show', async () => {
    const artifacts = {
      TraceElements: [],
      settings: JSON.parse(JSON.stringify(defaultSettings)),
      traces: {
        defaultPass: createTestTrace({
          traceEnd: 6000,
          largestContentfulPaint: 4500,
        }),
      },
      devtoolsLogs: {
        defaultPass: networkRecordsToDevtoolsLog(mockNetworkRecords()),
      },
      URL: {
        requestedUrl,
        mainDocumentUrl,
        finalDisplayedUrl: mainDocumentUrl,
      },
      GatherContext: {gatherMode: 'navigation'},
    };

    const context = {settings: artifacts.settings, computedCache: new Map()};
    const auditResult = await LargestContentfulPaintElementAudit.audit(artifacts, context);

    expect(auditResult.score).toEqual(null);
    expect(auditResult.notApplicable).toEqual(true);
    expect(auditResult.displayValue).toBeUndefined();
    expect(auditResult.metricSavings).toEqual({LCP: 0});
    expect(auditResult.details).toBeUndefined();
  });

  it('doesn\'t throw an error when the phase table gets an error', async () => {
    const artifacts = {
      TraceElements: [{
        traceEventType: 'largest-contentful-paint',
        node: {
          devtoolsNodePath: '1,HTML,3,BODY,5,DIV,0,HEADER',
          selector: 'div.l-header > div.chorus-emc__content',
          nodeLabel: 'My Test Label',
          snippet: '<h1 class="test-class">',
        },
        type: 'text',
      }],
      settings: JSON.parse(JSON.stringify(defaultSettings)),
      traces: {
        defaultPass: createTestTrace({
          traceEnd: 6000,
          largestContentfulPaint: 8000,
        }),
      },
      devtoolsLogs: {
        defaultPass: [],
      },
      URL: {
        requestedUrl,
        mainDocumentUrl,
        finalDisplayedUrl: mainDocumentUrl,
      },
      GatherContext: {gatherMode: 'navigation'},
    };

    const context = {settings: artifacts.settings, computedCache: new Map()};
    const auditResult = await LargestContentfulPaintElementAudit.audit(artifacts, context);

    expect(auditResult.score).toEqual(1);
    expect(auditResult.notApplicable).toBeUndefined();
    expect(auditResult.displayValue).toBeUndefined();
    expect(auditResult.details.items).toHaveLength(1);
    expect(auditResult.details.items[0].items).toHaveLength(1);
    expect(auditResult.details.items[0].items[0].node.path).toEqual('1,HTML,3,BODY,5,DIV,0,HEADER');
    expect(auditResult.details.items[0].items[0].node.nodeLabel).toEqual('My Test Label');
    expect(auditResult.details.items[0].items[0].node.snippet).toEqual('<h1 class="test-class">');
  });
});
