/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const ResponseCompression =
    require('../../../../gather/gatherers/dobetterweb/response-compression.js');
const assert = require('assert').strict;
const mockDriver = require('../../fake-driver.js');

let options;
let responseCompression;
const traceData = {
  networkRecords: [
    {
      url: 'http://google.com/index.js',
      _statusCode: 200,
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
    },
    {
      url: 'http://google.com/index.css',
      _statusCode: 200,
      mimeType: 'text/css',
      requestId: 1,
      resourceSize: 6,
      transferSize: 7,
      resourceType: 'Stylesheet',
      responseHeaders: [],
      content: 'abcabc',
      finished: true,
    },
    {
      url: 'http://google.com/index.json',
      _statusCode: 200,
      mimeType: 'application/json',
      requestId: 2,
      resourceSize: 7,
      transferSize: 8,
      resourceType: 'XHR',
      responseHeaders: [],
      content: '1234567',
      finished: true,
    },
    {
      url: 'http://google.com/index.json',
      _statusCode: 200,
      mimeType: 'application/json',
      requestId: 27,
      resourceSize: 7,
      transferSize: 8,
      resourceType: 'XHR',
      responseHeaders: [],
      content: '1234567',
      finished: true,
      sessionId: 'oopif', // ignore for being from oopif
    },
    {
      url: 'http://google.com/index.json',
      _statusCode: 304, // ignore for being a cache not modified response
      mimeType: 'application/json',
      requestId: 22,
      resourceSize: 7,
      transferSize: 7,
      resourceType: 'XHR',
      responseHeaders: [],
      content: '1234567',
      finished: true,
    },
    {
      url: 'http://google.com/other.json',
      _statusCode: 200,
      mimeType: 'application/json',
      requestId: 23,
      resourceSize: 7,
      transferSize: 8,
      resourceType: 'XHR',
      responseHeaders: [],
      content: '1234567',
      finished: false, // ignore for not finishing
    },
    {
      url: 'http://google.com/index.jpg',
      _statusCode: 200,
      mimeType: 'image/jpg',
      requestId: 3,
      resourceSize: 10,
      transferSize: 10,
      resourceType: 'Image',
      responseHeaders: [],
      content: 'aaaaaaaaaa',
      finished: true,
    },
    {
      url: 'http://google.com/helloworld.mp4',
      _statusCode: 200,
      mimeType: 'video/mp4',
      requestId: 4,
      resourceSize: 100,
      transferSize: 100,
      resourceType: 'Media',
      responseHeaders: [],
      content: 'bbbbbbbb',
      finished: true,
    },
  ],
};

describe('Optimized responses', () => {
  // Reset the Gatherer before each test.
  beforeEach(() => {
    responseCompression = new ResponseCompression();
    const driver = Object.assign({}, mockDriver, {
      getRequestContent(id) {
        return Promise.resolve(traceData.networkRecords[id].content);
      },
    });

    options = {
      url: 'http://google.com/',
      driver,
    };
  });

  it('returns only text and non encoded responses', () => {
    return responseCompression.afterPass(options, createNetworkRequests(traceData))
      .then(artifact => {
        assert.equal(artifact.length, 2);
        assert.ok(/index\.css$/.test(artifact[0].url));
        assert.ok(/index\.json$/.test(artifact[1].url));
      });
  });

  it('computes sizes', () => {
    return responseCompression.afterPass(options, createNetworkRequests(traceData))
      .then(artifact => {
        assert.equal(artifact.length, 2);
        assert.equal(artifact[0].resourceSize, 6);
        assert.equal(artifact[0].gzipSize, 26);
      });
  });

  it('recovers from driver errors', () => {
    options.driver.getRequestContent = () => Promise.reject(new Error('Failed'));
    return responseCompression.afterPass(options, createNetworkRequests(traceData))
      .then(artifact => {
        assert.equal(artifact.length, 2);
        assert.equal(artifact[0].resourceSize, 6);
        assert.equal(artifact[0].gzipSize, undefined);
      });
  });

  it('ignores responses from installed Chrome extensions', () => {
    const traceData = {
      networkRecords: [
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
        },
      ],
    };

    return responseCompression.afterPass(options, createNetworkRequests(traceData))
      .then(artifact => {
        assert.equal(artifact.length, 1);
        assert.equal(artifact[0].resourceSize, 123);
      });
  });

  // Change into SDK.networkRequest when examples are ready
  function createNetworkRequests(traceData) {
    traceData.networkRecords = traceData.networkRecords.map(record => {
      record.url = record.url;
      record.statusCode = record._statusCode;
      record.mimeType = record.mimeType;
      record.resourceSize = record.resourceSize;
      record.transferSize = record.transferSize;
      record.responseHeaders = record.responseHeaders;
      record.requestId = record.requestId;

      return record;
    });

    return traceData;
  }
});
