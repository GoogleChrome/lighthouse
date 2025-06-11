/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {createMockContext, mockDriverSubmodules} from '../../../gather/mock-driver.js';

const mocks = await mockDriverSubmodules();

// Some imports needs to be done dynamically, so that their dependencies will be mocked.
// https://github.com/GoogleChrome/lighthouse/blob/main/docs/hacking-tips.md#mocking-modules-with-testdouble
/** @typedef {import('../../../../gather/gatherers/dobetterweb/response-compression.js')} ResponseCompression */
const ResponseCompression =
  (await import('../../../../gather/gatherers/dobetterweb/response-compression.js')).default;

const networkRecords = [
  {
    url: 'http://google.com/index.js',
    statusCode: 200,
    mimeType: 'text/javascript',
    requestId: 0,
    resourceSize: 9,
    transferSize: 10,
    resourceType: 'Script',
    responseHeaders: [{
      name: 'Content-Encoding',
      value: 'gzip',
    }],
    content: 'aaabbbccc',
    finished: true,
    sessionTargetType: 'page',
  },
  {
    url: 'http://google.com/index.css',
    statusCode: 200,
    mimeType: 'text/css',
    requestId: 1,
    resourceSize: 6,
    transferSize: 7,
    resourceType: 'Stylesheet',
    responseHeaders: [],
    content: 'abcabc',
    finished: true,
    sessionTargetType: 'page',
  },
  {
    url: 'http://google.com/index.json',
    statusCode: 200,
    mimeType: 'application/json',
    requestId: 2,
    resourceSize: 7,
    transferSize: 8,
    resourceType: 'XHR',
    responseHeaders: [],
    content: '1234567',
    finished: true,
    sessionTargetType: 'page',
  },
  {
    url: 'http://google.com/index-oopif.json',
    statusCode: 200,
    mimeType: 'application/json',
    requestId: 27,
    resourceSize: 7,
    transferSize: 8,
    resourceType: 'XHR',
    responseHeaders: [],
    content: '1234567',
    finished: true,
    sessionTargetType: 'iframe', // ignore for being from oopif
  },
  {
    url: 'http://google.com/index.json',
    statusCode: 304, // ignore for being a cache not modified response
    mimeType: 'application/json',
    requestId: 22,
    resourceSize: 7,
    transferSize: 7,
    resourceType: 'XHR',
    responseHeaders: [],
    content: '1234567',
    finished: true,
    sessionTargetType: 'page',
  },
  {
    url: 'http://google.com/other.json',
    statusCode: 200,
    mimeType: 'application/json',
    requestId: 23,
    resourceSize: 7,
    transferSize: 8,
    resourceType: 'XHR',
    responseHeaders: [],
    content: '1234567',
    finished: false, // ignore for not finishing
    sessionTargetType: 'page',
  },
  {
    url: 'http://google.com/index.jpg',
    statusCode: 200,
    mimeType: 'image/jpg',
    requestId: 3,
    resourceSize: 10,
    transferSize: 10,
    resourceType: 'Image',
    responseHeaders: [],
    content: 'aaaaaaaaaa',
    finished: true,
    sessionTargetType: 'page',
  },
  {
    url: 'http://google.com/helloworld.mp4',
    statusCode: 200,
    mimeType: 'video/mp4',
    requestId: 4,
    resourceSize: 100,
    transferSize: 100,
    resourceType: 'Media',
    responseHeaders: [],
    content: 'bbbbbbbb',
    finished: true,
    sessionTargetType: 'page',
  },
  {
    url: 'http://google.com/index-worker.json',
    statusCode: 200,
    mimeType: 'application/json',
    requestId: 28,
    resourceSize: 7,
    transferSize: 8,
    resourceType: 'XHR',
    responseHeaders: [],
    content: '1234567',
    finished: true,
    sessionTargetType: 'worker', // ignore for being from a worker
  },
];

describe('Optimized responses', () => {
  let context;
  /** @type {ResponseCompression} */
  let gatherer;
  beforeEach(() => {
    gatherer = new ResponseCompression();
    context = createMockContext();
    mocks.reset();
    mocks.networkMock.fetchResponseBodyFromCache.mockImplementation((_, id) => {
      return Promise.resolve(networkRecords[id].content);
    });
  });

  it('returns only text and non encoded responses', async () => {
    const artifact = await gatherer.getCompressibleRecords(context, networkRecords);
    expect(artifact).toHaveLength(2);
    expect(artifact[0].url).toMatch(/index\.css$/);
    expect(artifact[1].url).toMatch(/index\.json$/);
  });

  it('computes sizes', async () => {
    const artifact = await gatherer.getCompressibleRecords(context, networkRecords);
    expect(artifact).toHaveLength(2);
    expect(artifact[0].resourceSize).toEqual(6);
    expect(artifact[0].gzipSize).toEqual(26);
  });

  it('recovers from cache ejection errors', async () => {
    mocks.networkMock.fetchResponseBodyFromCache.mockRejectedValue(
      new Error('No resource with given identifier found'));
    const artifact = await gatherer.getCompressibleRecords(context, networkRecords);
    expect(artifact).toHaveLength(2);
    expect(artifact[0].resourceSize).toEqual(6);
    expect(artifact[0].gzipSize).toBeUndefined();
  });

  it('does not suppress other errors', async () => {
    mocks.networkMock.fetchResponseBodyFromCache.mockRejectedValue(new Error('Failed'));
    await expect(gatherer.getCompressibleRecords(context, networkRecords))
      .rejects.toThrow();
  });

  it('ignores responses from installed Chrome extensions', async () => {
    const networkRecords = [
      {
        url: 'chrome-extension://index.css',
        mimeType: 'text/css',
        requestId: 1,
        resourceSize: 10,
        transferSize: 10,
        resourceType: 'Stylesheet',
        responseHeaders: [],
        content: 'aaaaaaaaaa',
        finished: true,
        sessionTargetType: 'page',
      },
      {
        url: 'http://google.com/chrome-extension.css',
        mimeType: 'text/css',
        requestId: 1,
        resourceSize: 123,
        transferSize: 123,
        resourceType: 'Stylesheet',
        responseHeaders: [],
        content: 'aaaaaaaaaa',
        finished: true,
        sessionTargetType: 'page',
      },
    ];

    const artifact = await gatherer.getCompressibleRecords(context, networkRecords);
    expect(artifact).toHaveLength(1);
    expect(artifact[0].resourceSize).toEqual(123);
  });
});
