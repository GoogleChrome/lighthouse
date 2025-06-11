/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Fetcher} from '../../gather/fetcher.js';
import {fnAny} from '../test-utils.js';
import {createMockSession} from './mock-driver.js';

let mockSession = createMockSession();
/** @type {Fetcher} */
let fetcher;

beforeEach(() => {
  mockSession = createMockSession();
  fetcher = new Fetcher(mockSession.asSession());
});

describe('._readIOStream', () => {
  it('reads contents of stream', async () => {
    mockSession.sendCommand
      .mockResponse('IO.read', {data: 'Hello World!', eof: true, base64Encoded: false});

    const data = await fetcher._readIOStream('1');
    expect(data).toEqual('Hello World!');
  });

  it('combines multiple reads', async () => {
    mockSession.sendCommand
      .mockResponse('IO.read', {data: 'Hello ', eof: false, base64Encoded: false})
      .mockResponse('IO.read', {data: 'World', eof: false, base64Encoded: false})
      .mockResponse('IO.read', {data: '!', eof: true, base64Encoded: false});

    const data = await fetcher._readIOStream('1');
    expect(data).toEqual('Hello World!');
  });

  it('decodes if base64', async () => {
    const buffer = Buffer.from('Hello World!').toString('base64');
    mockSession.sendCommand
      .mockResponse('IO.read', {data: buffer, eof: true, base64Encoded: true});

    const data = await fetcher._readIOStream('1');
    expect(data).toEqual('Hello World!');
  });

  it('decodes multiple base64 reads', async () => {
    const buffer1 = Buffer.from('Hello ').toString('base64');
    const buffer2 = Buffer.from('World!').toString('base64');
    mockSession.sendCommand
      .mockResponse('IO.read', {data: buffer1, eof: false, base64Encoded: true})
      .mockResponse('IO.read', {data: buffer2, eof: true, base64Encoded: true});

    const data = await fetcher._readIOStream('1');
    expect(data).toEqual('Hello World!');
  });

  it('throws on timeout', async () => {
    mockSession.sendCommand
      .mockReturnValue(Promise.resolve({data: 'No stop', eof: false, base64Encoded: false}));

    const dataPromise = fetcher._readIOStream('1', {timeout: 50});
    await expect(dataPromise).rejects.toThrowError(/Waiting for the end of the IO stream/);
  });
});

describe('._fetchResourceOverProtocol', () => {
  /** @type {string} */
  let streamContents;

  beforeEach(() => {
    streamContents = 'STREAM CONTENTS';
    fetcher._readIOStream = fnAny().mockImplementation(() => {
      return Promise.resolve(streamContents);
    });
  });

  it('fetches a file', async () => {
    mockSession.sendCommand
      .mockResponse('Page.getFrameTree', {frameTree: {frame: {id: 'FRAME'}}})
      .mockResponse('Network.loadNetworkResource', {
        resource: {success: true, httpStatusCode: 200, stream: '1'},
      });

    const data = await fetcher._fetchResourceOverProtocol('https://example.com', {timeout: 500});
    expect(data).toEqual({content: streamContents, status: 200});
  });

  it('returns null when resource could not be fetched', async () => {
    mockSession.sendCommand
      .mockResponse('Page.getFrameTree', {frameTree: {frame: {id: 'FRAME'}}})
      .mockResponse('Network.loadNetworkResource', {
        resource: {success: false, httpStatusCode: 404},
      });

    const data = await fetcher._fetchResourceOverProtocol('https://example.com', {timeout: 500});
    expect(data).toEqual({content: null, status: 404});
  });

  it('throws on timeout', async () => {
    mockSession.sendCommand
      .mockResponse('Page.getFrameTree', {frameTree: {frame: {id: 'FRAME'}}})
      .mockResponse('Network.loadNetworkResource', {
        resource: {success: false, httpStatusCode: 404},
      }, 100);

    const dataPromise = fetcher._fetchResourceOverProtocol('https://example.com', {timeout: 50});
    await expect(dataPromise).rejects.toThrowError(/Timed out fetching resource/);
  });

  it('uses remaining time on _readIOStream', async () => {
    mockSession.sendCommand
      .mockResponse('Page.getFrameTree', {frameTree: {frame: {id: 'FRAME'}}})
      .mockResponse('Network.loadNetworkResource', {
        resource: {success: true, httpStatusCode: 200, stream: '1'},
      }, 500);

    let timeout;
    fetcher._readIOStream = fnAny().mockImplementation((_, options) => {
      timeout = options.timeout;
    });

    await fetcher._fetchResourceOverProtocol('https://example.com', {timeout: 1000});
    expect(timeout).toBeCloseTo(500, -2);
  });
});
