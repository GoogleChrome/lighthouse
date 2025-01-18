/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {LCPImageRecord} from '../../computed/lcp-image-record.js';
import {createTestTrace} from '../create-test-trace.js';
import {networkRecordsToDevtoolsLog} from '../network-records-to-devtools-log.js';

const requestedUrl = 'http://example.com:3000';
const mainDocumentUrl = 'http://www.example.com:3000';

const scriptUrl = 'http://www.example.com/script.js';
const imageUrl = 'http://www.example.com/image.png';

function mockData(networkRecords) {
  return {
    trace: createTestTrace({
      traceEnd: 6000,
      largestContentfulPaint: 4500,
    }),
    devtoolsLog: networkRecordsToDevtoolsLog(networkRecords),
  };
}

function mockNetworkRecords() {
  return [{
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
  }];
}

describe('LCPImageRecord', () => {
  it('returns the correct LCP network record', async () => {
    const networkRecords = mockNetworkRecords();
    const data = mockData(networkRecords);

    const result = await LCPImageRecord.request(data, {computedCache: new Map()});

    expect(result.requestId).toEqual('4');
  });

  it('returns undefined if the LCP was not an image', async () => {
    const networkRecords = mockNetworkRecords();
    const data = mockData(networkRecords);
    const eventIndex =
      data.trace.traceEvents.findIndex(e => e.name === 'LargestImagePaint::Candidate');
    data.trace.traceEvents.splice(eventIndex, 1);

    const result = await LCPImageRecord.request(data, {computedCache: new Map()});
    expect(result).toBeUndefined();
  });

  it('returns undefined if the LCP record is missing', async () => {
    const networkRecords = mockNetworkRecords();
    const recordIndex = networkRecords.findIndex(r => r.resourceType === 'Image');
    networkRecords.splice(recordIndex, 1);

    const data = mockData(networkRecords);

    const result = await LCPImageRecord.request(data, {computedCache: new Map()});
    expect(result).toBeUndefined();
  });

  it('only considers records from the main frame', async () => {
    const networkRecords = mockNetworkRecords();
    const record = networkRecords.find(r => r.resourceType === 'Image');
    record.frameId = 'CHILD_FRAME';

    const data = mockData(networkRecords);

    const result = await LCPImageRecord.request(data, {computedCache: new Map()});
    expect(result).toBeUndefined();
  });

  it('takes first record by end time if multiple match the LCP url', async () => {
    const networkRecords = mockNetworkRecords();
    networkRecords.push({
      requestId: '5',
      resourceType: 'Image',
      priority: 'High',
      isLinkPreload: false,
      networkRequestTime: 1500,
      networkEndTime: 5500,
      transferSize: 64_000,
      url: imageUrl,
      initiator: {type: 'script', url: scriptUrl},
      frameId: 'ROOT_FRAME',
    });
    const data = mockData(networkRecords);

    const result = await LCPImageRecord.request(data, {computedCache: new Map()});
    expect(result.requestId).toEqual('4');
  });

  it('throws if there was no LCP', async () => {
    const networkRecords = mockNetworkRecords();
    const data = mockData(networkRecords);
    const eventIndex =
      data.trace.traceEvents.findIndex(e => e.name === 'largestContentfulPaint::Candidate');
    data.trace.traceEvents.splice(eventIndex, 1);

    const resultPromise = LCPImageRecord.request(data, {computedCache: new Map()});
    await expect(resultPromise).rejects.toThrow('NO_LCP');
  });
});
