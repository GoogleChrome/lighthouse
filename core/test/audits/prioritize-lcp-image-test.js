/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import PrioritizeLcpImage from '../../audits/prioritize-lcp-image.js';
import {networkRecordsToDevtoolsLog} from '../network-records-to-devtools-log.js';
import {createTestTrace} from '../create-test-trace.js';

const requestedUrl = 'http://example.com:3000';
const mainDocumentUrl = 'http://www.example.com:3000';
const finalDisplayedUrl = 'http://www.example.com:3000/some-page.html';

const scriptUrl = 'http://www.example.com/script.js';
const imageUrl = 'http://www.example.com/image.png';

describe('Performance: prioritize-lcp-image audit', () => {
  const mockArtifacts = (networkRecords, URL) => {
    return {
      GatherContext: {gatherMode: 'navigation'},
      traces: {
        [PrioritizeLcpImage.DEFAULT_PASS]: createTestTrace({
          traceEnd: 6000,
          largestContentfulPaint: 4500,
          networkRecords,
        }),
      },
      devtoolsLogs: {
        [PrioritizeLcpImage.DEFAULT_PASS]: networkRecordsToDevtoolsLog(networkRecords),
      },
      URL,
      TraceElements: [
        {
          traceEventType: 'largest-contentful-paint',
          node: {
            devtoolsNodePath: '1,HTML,1,BODY,3,DIV,2,IMG',
          },
          type: 'image',
        },
      ],
    };
  };

  function mockContext() {
    return {
      settings: {},
      computedCache: new Map(),
    };
  }

  const mockNetworkRecords = () => {
    return {
      networkRecords: [{
        requestId: '2',
        priority: 'High',
        isLinkPreload: false,
        networkRequestTime: 0,
        networkEndTime: 500,
        timing: {receiveHeadersEnd: 500},
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
        networkEndTime: 1000,
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
        transferSize: 64_000,
        url: imageUrl,
        initiator: {type: 'script', url: scriptUrl},
        frameId: 'ROOT_FRAME',
      }],
      URL: {
        requestedUrl,
        mainDocumentUrl,
        finalDisplayedUrl,
      },
    };
  };

  it('is not applicable if TraceElements does not include LCP', async () => {
    const {networkRecords, URL} = mockNetworkRecords();
    const artifacts = mockArtifacts(networkRecords, URL);
    artifacts.TraceElements = [];
    const result = await PrioritizeLcpImage.audit(artifacts, mockContext());
    expect(result).toEqual({
      score: null,
      notApplicable: true,
      metricSavings: {LCP: 0},
    });
  });

  it('is not applicable if LCP was not an image', async () => {
    const {networkRecords, URL} = mockNetworkRecords();
    const artifacts = mockArtifacts(networkRecords, URL);
    artifacts.TraceElements[0].type = 'text';
    const result = await PrioritizeLcpImage.audit(artifacts, mockContext());
    expect(result).toEqual({
      score: null,
      notApplicable: true,
      metricSavings: {LCP: 0},
    });
  });

  it('shouldn\'t be applicable if lcp image element is not found', async () => {
    const {networkRecords, URL} = mockNetworkRecords();
    const artifacts = mockArtifacts(networkRecords, URL);

    // Make image paint event not apply to our node.
    const imagePaintEvent = artifacts.traces.defaultPass
        .traceEvents.find(e => e.name === 'LargestImagePaint::Candidate');
    imagePaintEvent.args.data.DOMNodeId = 1729;

    const results = await PrioritizeLcpImage.audit(artifacts, mockContext());
    expect(results.score).toEqual(1);
    expect(results.details.overallSavingsMs).toEqual(0);
    expect(results.details.items).toHaveLength(0);
    expect(results.metricSavings).toEqual({LCP: 0});
  });

  it('shouldn\'t be applicable if the lcp is already preloaded', async () => {
    const {networkRecords, URL} = mockNetworkRecords();
    networkRecords[3].isLinkPreload = true;
    const artifacts = mockArtifacts(networkRecords, URL);
    const results = await PrioritizeLcpImage.audit(artifacts, mockContext());
    expect(results.score).toEqual(1);
    expect(results.details.overallSavingsMs).toEqual(0);
    expect(results.details.items).toHaveLength(0);
    expect(results.metricSavings).toEqual({LCP: 0});

    // debugData should be included even if image shouldn't be preloaded.
    expect(results.details.debugData).toMatchObject({
      initiatorPath: [
        {url: imageUrl, initiatorType: 'script'},
        {url: scriptUrl, initiatorType: 'parser'},
        {url: mainDocumentUrl, initiatorType: 'redirect'},
      ],
      pathLength: 3,
    });
  });

  it('shouldn\'t be applicable if the lcp request is not from over the network', async () => {
    const {networkRecords, URL} = mockNetworkRecords();
    networkRecords[3].protocol = 'data';
    const artifacts = mockArtifacts(networkRecords, URL);
    const results = await PrioritizeLcpImage.audit(artifacts, mockContext());
    expect(results.score).toEqual(1);
    expect(results.details.overallSavingsMs).toEqual(0);
    expect(results.details.items).toHaveLength(0);
    expect(results.metricSavings).toEqual({LCP: 0});
  });

  it('should suggest preloading a lcp image if all criteria is met', async () => {
    const {networkRecords, URL} = mockNetworkRecords();
    const artifacts = mockArtifacts(networkRecords, URL);
    const results = await PrioritizeLcpImage.audit(artifacts, mockContext());
    expect(results.numericValue).toEqual(30);
    expect(results.details.overallSavingsMs).toEqual(30);
    expect(results.details.items[0].url).toEqual(imageUrl);
    expect(results.details.items[0].wastedMs).toEqual(30);
    expect(results.metricSavings).toEqual({LCP: 30});

    expect(results.details.debugData).toMatchObject({
      initiatorPath: [
        {url: imageUrl, initiatorType: 'script'},
        {url: scriptUrl, initiatorType: 'parser'},
        {url: mainDocumentUrl, initiatorType: 'redirect'},
      ],
      pathLength: 3,
    });
  });

  it('should suggest preloading when LCP is waiting on a dependency', async () => {
    const {networkRecords, URL} = mockNetworkRecords();
    networkRecords[2].transferSize = 100 * 1000 * 1000;
    const artifacts = mockArtifacts(networkRecords, URL);
    const results = await PrioritizeLcpImage.audit(artifacts, mockContext());
    expect(results.numericValue).toEqual(180);
    expect(results.details.overallSavingsMs).toEqual(180);
    expect(results.details.items[0].url).toEqual(imageUrl);
    expect(results.details.items[0].wastedMs).toEqual(180);
    expect(results.details.debugData).toMatchObject({
      initiatorPath: [
        {url: imageUrl, initiatorType: 'script'},
        {url: scriptUrl, initiatorType: 'parser'},
        {url: mainDocumentUrl, initiatorType: 'redirect'},
      ],
      pathLength: 3,
    });
    expect(results.metricSavings).toEqual({LCP: 180});
  });

  it('should use the initiator path of the first image instance loaded', async () => {
    const {networkRecords, URL} = mockNetworkRecords();
    networkRecords.push({
      requestId: '15',
      resourceType: 'Image',
      networkRequestTime: 1500,
      // Completed before other image request.
      networkEndTime: 4000,
      url: imageUrl,
      initiator: {type: 'parser', url: mainDocumentUrl},
      frameId: 'ROOT_FRAME',
    });
    const artifacts = mockArtifacts(networkRecords, URL);
    const results = await PrioritizeLcpImage.audit(artifacts, mockContext());
    expect(results).toMatchObject({
      numericValue: 0,
      details: {
        items: [],
        debugData: {
          initiatorPath: [
            {url: imageUrl, initiatorType: 'parser'},
            {url: mainDocumentUrl, initiatorType: 'redirect'},
          ],
          pathLength: 2,
        },
      },
      metricSavings: {LCP: 0},
    });
  });

  it('should not use the initiator path of a non-image load', async () => {
    const {networkRecords, URL} = mockNetworkRecords();
    networkRecords.push({
      requestId: '15',
      // Not an image load.
      resourceType: 'XHR',
      networkRequestTime: 1500,
      // Completed before other image request.
      networkEndTime: 4000,
      url: imageUrl,
      // Parser, not script initiator.
      initiator: {type: 'parser', url: mainDocumentUrl},
      frameId: 'ROOT_FRAME',
    });
    const artifacts = mockArtifacts(networkRecords, URL);
    const results = await PrioritizeLcpImage.audit(artifacts, mockContext());
    expect(results).toMatchObject({
      numericValue: 180,
      details: {
        items: [{url: imageUrl}],
        debugData: {
          initiatorPath: [
            {url: imageUrl, initiatorType: 'script'},
            {url: scriptUrl, initiatorType: 'parser'},
            {url: mainDocumentUrl, initiatorType: 'redirect'},
          ],
          pathLength: 3,
        },
      },
      metricSavings: {LCP: 180},
    });
  });

  it('should not use the initiator path of an image from a different frame', async () => {
    const {networkRecords, URL} = mockNetworkRecords();
    networkRecords.push({
      requestId: '15',
      resourceType: 'Image',
      networkRequestTime: 1500,
      // Completed before other image request.
      networkEndTime: 4000,
      url: imageUrl,
      initiator: {type: 'parser', url: mainDocumentUrl},
      // From different frame.
      frameId: 'CHILD_FRAME',
    });
    const artifacts = mockArtifacts(networkRecords, URL);
    const results = await PrioritizeLcpImage.audit(artifacts, mockContext());
    expect(results).toMatchObject({
      numericValue: 180,
      details: {
        items: [{url: imageUrl}],
        debugData: {
          initiatorPath: [
            {url: imageUrl, initiatorType: 'script'},
            {url: scriptUrl, initiatorType: 'parser'},
            {url: mainDocumentUrl, initiatorType: 'redirect'},
          ],
          pathLength: 3,
        },
      },
      metricSavings: {LCP: 180},
    });
  });

  it('should follow any redirected image requests', async () => {
    const redirectedImageUrl = 'http://www.example.com/redirect.jpg';
    const {networkRecords, URL} = mockNetworkRecords();

    // Redirect image request to newly added request.
    const redirectSource = networkRecords.at(-1);
    redirectSource.networkEndTime = 2500;
    redirectSource.responseHeadersTransferSize = 708;
    redirectSource.transferSize = 708;
    redirectSource.resourceType = undefined;
    networkRecords.push({
      requestId: '4:redirect',
      resourceType: 'Image',
      priority: 'High',
      networkRequestTime: 2500,
      networkEndTime: 4500,
      transferSize: 64_000,
      url: redirectedImageUrl,
      initiator: {type: 'script', url: scriptUrl},
      frameId: 'ROOT_FRAME',
    });
    const artifacts = mockArtifacts(networkRecords, URL);
    const results = await PrioritizeLcpImage.audit(artifacts, mockContext());
    expect(results).toMatchObject({
      numericValue: 210,
      details: {
        items: [{url: redirectedImageUrl}],
        debugData: {
          initiatorPath: [
            {url: redirectedImageUrl, initiatorType: 'redirect'},
            {url: imageUrl, initiatorType: 'script'},
            {url: scriptUrl, initiatorType: 'parser'},
            {url: mainDocumentUrl, initiatorType: 'redirect'},
          ],
          pathLength: 4,
        },
      },
      metricSavings: {LCP: 210},
    });
  });

  it('should fall back mainResource in initiator path when chain is broken', async () => {
    const {networkRecords, URL} = mockNetworkRecords();
    // For whatever reason, initiator information isn't available for this image.
    networkRecords[3].initiator = {type: 'other'};

    const artifacts = mockArtifacts(networkRecords, URL);
    const results = await PrioritizeLcpImage.audit(artifacts, mockContext());
    expect(results).toMatchObject({
      numericValue: 0,
      details: {
        items: [],
        debugData: {
          initiatorPath: [
            {url: imageUrl, initiatorType: 'fallbackToMain'},
            {url: mainDocumentUrl, initiatorType: 'redirect'},
          ],
          pathLength: 2,
        },
      },
      metricSavings: {LCP: 0},
    });
  });
});
