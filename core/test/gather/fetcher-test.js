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

describe('.fetchResource', () => {
  it('does not fall back to the Fetch API by default', async () => {
    const protocolError = new Error('Protocol error (Network.loadNetworkResource): CSP violation');
    fetcher._fetchResourceOverProtocol = fnAny().mockRejectedValue(protocolError);
    fetcher._fetchWithFetchApi = fnAny();

    await expect(fetcher.fetchResource('https://example.com/robots.txt', {timeout: 500}))
      .rejects.toBe(protocolError);
    expect(fetcher._fetchWithFetchApi).not.toHaveBeenCalled();
  });

  it('falls back to the Fetch API for an opted-in CSP violation', async () => {
    const response = {content: 'User-agent: *\\nAllow: /', status: 200, headers: null};
    fetcher._fetchResourceOverProtocol = fnAny().mockRejectedValue(
      new Error('Protocol error (Network.loadNetworkResource): CSP violation'));
    fetcher._fetchWithFetchApi = fnAny().mockResolvedValue(response);

    await expect(fetcher.fetchResource('https://example.com/robots.txt', {
      timeout: 500,
      allowFetchFallbackOnCspViolation: true,
    })).resolves.toEqual(response);
    expect(fetcher._fetchWithFetchApi).toHaveBeenCalledWith('https://example.com/robots.txt');
  });

  it('does not fall back for non-CSP protocol errors', async () => {
    const protocolError = new Error('Protocol error (Network.loadNetworkResource): Target closed');
    fetcher._fetchResourceOverProtocol = fnAny().mockRejectedValue(protocolError);
    fetcher._fetchWithFetchApi = fnAny();

    await expect(fetcher.fetchResource('https://example.com/robots.txt', {
      allowFetchFallbackOnCspViolation: true,
    })).rejects.toBe(protocolError);
    expect(fetcher._fetchWithFetchApi).not.toHaveBeenCalled();
  });
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
    await expect(dataPromise).rejects.toThrow(/Waiting for the end of the IO stream/);
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
    expect(data).toEqual({content: streamContents, status: 200, headers: null});
  });

  it('fetches a file with headers', async () => {
    mockSession.sendCommand
      .mockResponse('Page.getFrameTree', {frameTree: {frame: {id: 'FRAME'}}})
      .mockResponse('Network.loadNetworkResource', {
        resource: {
          success: true,
          httpStatusCode: 200,
          stream: '1',
          headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        },
      });

    const data = await fetcher._fetchResourceOverProtocol('https://example.com', {timeout: 500});
    expect(data).toEqual({
      content: streamContents,
      status: 200,
      headers: {'content-type': 'application/json', 'access-control-allow-origin': '*'},
    });
  });

  it('returns null when resource could not be fetched', async () => {
    mockSession.sendCommand
      .mockResponse('Page.getFrameTree', {frameTree: {frame: {id: 'FRAME'}}})
      .mockResponse('Network.loadNetworkResource', {
        resource: {success: false, httpStatusCode: 404},
      });

    const data = await fetcher._fetchResourceOverProtocol('https://example.com', {timeout: 500});
    expect(data).toEqual({content: null, status: 404, headers: null});
  });

  it('throws on timeout', async () => {
    mockSession.sendCommand
      .mockResponse('Page.getFrameTree', {frameTree: {frame: {id: 'FRAME'}}})
      .mockResponse('Network.loadNetworkResource', {
        resource: {success: false, httpStatusCode: 404},
      }, 100);

    const dataPromise = fetcher._fetchResourceOverProtocol('https://example.com', {timeout: 50});
    await expect(dataPromise).rejects.toThrow(/Timed out fetching resource/);
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

describe('._normalizeHeaders', () => {
  it('returns null when passed null or undefined', () => {
    expect(fetcher._normalizeHeaders(null)).toBeNull();
    expect(fetcher._normalizeHeaders(undefined)).toBeNull();
  });

  it('normalizes plain object headers with lowercase keys and string values', () => {
    const raw = {
      'Content-Type': 'application/json',
      'Content-Length': 1234,
      'X-Custom-Header': 'CustomValue',
    };
    expect(fetcher._normalizeHeaders(raw)).toEqual({
      'content-type': 'application/json',
      'content-length': '1234',
      'x-custom-header': 'CustomValue',
    });
  });

  it('normalizes Headers instance with lowercase keys', () => {
    const headers = new Headers();
    headers.append('Content-Type', 'text/html');
    headers.append('X-Rate-Limit', '100');
    expect(fetcher._normalizeHeaders(headers)).toEqual({
      'content-type': 'text/html',
      'x-rate-limit': '100',
    });
  });
});

