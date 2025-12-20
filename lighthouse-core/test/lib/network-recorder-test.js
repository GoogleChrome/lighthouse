/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const NetworkRecorder = require('../../lib/network-recorder.js');
const networkRecordsToDevtoolsLog = require('../network-records-to-devtools-log.js');
const assert = require('assert').strict;
const devtoolsLogItems = require('../fixtures/artifacts/perflog/defaultPass.devtoolslog.json');
const prefetchedScriptDevtoolsLog = require('../fixtures/prefetched-script.devtoolslog.json');
const redirectsDevtoolsLog = require('../fixtures/wikipedia-redirect.devtoolslog.json');
const redirectsScriptDevtoolsLog = require('../fixtures/redirects-from-script.devtoolslog.json');
const lrRequestDevtoolsLog = require('../fixtures/lr.devtoolslog.json');

/* eslint-env jest */
describe('network recorder', function() {
  it('recordsFromLogs expands into records', function() {
    assert.equal(devtoolsLogItems.length, 555);
    const records = NetworkRecorder.recordsFromLogs(devtoolsLogItems);
    assert.equal(records.length, 76);
  });

  it('handles redirects properly', () => {
    const records = NetworkRecorder.recordsFromLogs(redirectsDevtoolsLog);
    assert.equal(records.length, 25);

    const [redirectA, redirectB, redirectC, mainDocument] = records.slice(0, 4);
    assert.equal(redirectA.initiatorRequest, undefined);
    assert.equal(redirectA.redirectSource, undefined);
    assert.equal(redirectA.redirectDestination, redirectB);
    assert.equal(redirectB.initiatorRequest, redirectA);
    assert.equal(redirectB.redirectSource, redirectA);
    assert.equal(redirectB.redirectDestination, redirectC);
    assert.equal(redirectC.initiatorRequest, redirectB);
    assert.equal(redirectC.redirectSource, redirectB);
    assert.equal(redirectC.redirectDestination, mainDocument);
    assert.equal(mainDocument.initiatorRequest, redirectC);
    assert.equal(mainDocument.redirectSource, redirectC);
    assert.equal(mainDocument.redirectDestination, undefined);

    const redirectURLs = mainDocument.redirects.map(request => request.url);
    assert.deepStrictEqual(redirectURLs, [redirectA.url, redirectB.url, redirectC.url]);

    assert.equal(redirectA.resourceType, undefined);
    assert.equal(redirectB.resourceType, undefined);
    assert.equal(redirectC.resourceType, undefined);
    assert.equal(mainDocument.resourceType, 'Document');
  });

  it('sets initiators to redirects when original initiator is script', () => {
    // The test page features script-initiated redirects:
    /*
        <!DOCTYPE html>
        <script>
        setTimeout(_ => {
          // add an iframe to the page via script
          // the iframe will open :10200/redirects-script.html
          // which redirects to :10503/redirects-script.html
          // which redirects to airhorner.com
          const elem = document.createElement('iframe');
          elem.src = 'http://localhost:10200/redirects-script.html?redirect=http%3A%2F%2Flocalhost%3A10503%2Fredirects-script.html%3Fredirect%3Dhttps%253A%252F%252Fairhorner.com%252F';
          document.body.append(elem);
        }, 400);
        </script>
    */

    const records = NetworkRecorder.recordsFromLogs(redirectsScriptDevtoolsLog);
    assert.equal(records.length, 4);

    const [mainDocument, iframeRedirectA, iframeRedirectB, iframeDocument] = records;
    assert.equal(mainDocument.initiatorRequest, undefined);
    assert.equal(mainDocument.redirectSource, undefined);
    assert.equal(mainDocument.redirectDestination, undefined);
    assert.equal(iframeRedirectA.initiatorRequest, mainDocument);
    assert.equal(iframeRedirectA.redirectSource, undefined);
    assert.equal(iframeRedirectA.redirectDestination, iframeRedirectB);
    assert.equal(iframeRedirectB.initiatorRequest, iframeRedirectA);
    assert.equal(iframeRedirectB.redirectSource, iframeRedirectA);
    assert.equal(iframeRedirectB.redirectDestination, iframeDocument);
    assert.equal(iframeDocument.initiatorRequest, iframeRedirectB);
    assert.equal(iframeDocument.redirectSource, iframeRedirectB);
    assert.equal(iframeDocument.redirectDestination, undefined);

    const redirectURLs = iframeDocument.redirects.map(request => request.url);
    assert.deepStrictEqual(redirectURLs, [iframeRedirectA.url, iframeRedirectB.url]);

    assert.equal(mainDocument.resourceType, 'Document');
    assert.equal(iframeRedirectA.resourceType, undefined);
    assert.equal(iframeRedirectB.resourceType, undefined);
    assert.equal(iframeDocument.resourceType, 'Document');
  });


  it('recordsFromLogs ignores records with an invalid URL', function() {
    const logs = [
      { // valid request
        'method': 'Network.requestWillBeSent',
        'params': {
          'requestId': '1',
          'frameId': '1',
          'loaderId': '1',
          'documentURL': 'https://www.example.com',
          'request': {
            // This URL is valid
            'url': 'https://www.example.com',
            'method': 'GET',
            'headers': {
              'Upgrade-Insecure-Requests': '1',
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) ' +
                ' AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2774.2 Safari/537.36',
            },
            'mixedContentType': 'none',
            'initialPriority': 'VeryHigh',
          },
          'timestamp': 107988.912007,
          'wallTime': 1466620735.21187,
          'initiator': {
            'type': 'other',
          },
          'type': 'Document',
        },
      },
      { // invalid request
        'method': 'Network.requestWillBeSent',
        'params': {
          'requestId': '2',
          'loaderId': '2',
          'documentURL': 'https://www.example.com',
          'request': {
            // This URL is invalid
            'url': 'https:',
            'method': 'GET',
            'headers': {
              'Origin': 'https://www.example.com',
            },
            'mixedContentType': 'blockable',
            'initialPriority': 'VeryLow',
            'referrerPolicy': 'no-referrer-when-downgrade',
          },
          'timestamp': 831346.969485,
          'wallTime': 1538411434.25547,
          'initiator': {
            'type': 'other',
          },
          'type': 'Font',
          'frameId': '1',
          'hasUserGesture': false,
        },
      },
    ];
    assert.equal(logs.length, 2);
    const records = NetworkRecorder.recordsFromLogs(logs);
    assert.equal(records.length, 1);
  });

  it('should ignore invalid `timing` data', () => {
    const inputRecords = [{url: 'http://example.com', startTime: 1, endTime: 2}];
    const devtoolsLogs = networkRecordsToDevtoolsLog(inputRecords);
    const responseReceived = devtoolsLogs.find(item => item.method === 'Network.responseReceived');
    responseReceived.params.response.timing = {requestTime: 0, receiveHeadersEnd: -1};
    const records = NetworkRecorder.recordsFromLogs(devtoolsLogs);
    expect(records).toMatchObject([{url: 'http://example.com', startTime: 1, endTime: 2}]);
  });

  it('should use X-TotalFetchedSize in Lightrider for transferSize', () => {
    global.isLightrider = true;
    const records = NetworkRecorder.recordsFromLogs(lrRequestDevtoolsLog);
    global.isLightrider = false;

    expect(records.find(r => r.url === 'https://www.paulirish.com/'))
    .toMatchObject({
      resourceSize: 75221,
      transferSize: 22889,
    });
    expect(records.find(r => r.url === 'https://www.paulirish.com/javascripts/modernizr-2.0.js'))
    .toMatchObject({
      resourceSize: 9736,
      transferSize: 4730,
    });
  });

  it('should set the source of network records', () => {
    const devtoolsLogs = networkRecordsToDevtoolsLog([
      {url: 'http://example.com'},
      {url: 'http://iframe.com'},
      {url: 'http://other-iframe.com'},
    ]);

    const requestId1 = devtoolsLogs.find(
      log => log.params.request && log.params.request.url === 'http://iframe.com'
    ).params.requestId;
    const requestId2 = devtoolsLogs.find(
      log => log.params.request && log.params.request.url === 'http://other-iframe.com'
    ).params.requestId;

    for (const log of devtoolsLogs) {
      if (log.params.requestId === requestId1) log.sessionId = '1';

      if (log.params.requestId === requestId2 && log.method === 'Network.loadingFinished') {
        log.sessionId = '2';
      }
    }

    const records = NetworkRecorder.recordsFromLogs(devtoolsLogs);
    expect(records).toMatchObject([
      {url: 'http://example.com', sessionId: undefined},
      {url: 'http://iframe.com', sessionId: '1'},
      {url: 'http://other-iframe.com', sessionId: '2'},
    ]);
  });

  describe('#findNetworkQuietPeriods', () => {
    function record(data) {
      const url = data.url || 'https://example.com';
      const scheme = url.split(':')[0];
      return Object.assign({
        url,
        finished: !!data.endTime,
        parsedURL: {scheme},
      }, data);
    }

    it('should find the 0-quiet periods', () => {
      const records = [
        record({startTime: 0, endTime: 1}),
        record({startTime: 2, endTime: 3}),
        record({startTime: 4, endTime: 5}),
      ];

      const periods = NetworkRecorder.findNetworkQuietPeriods(records, 0);
      assert.deepStrictEqual(periods, [
        {start: 1000, end: 2000},
        {start: 3000, end: 4000},
        {start: 5000, end: Infinity},
      ]);
    });

    it('should find the 2-quiet periods', () => {
      const records = [
        record({startTime: 0, endTime: 1.5}),
        record({startTime: 0, endTime: 2}),
        record({startTime: 0, endTime: 2.5}),
        record({startTime: 2, endTime: 3}),
        record({startTime: 4, endTime: 5}),
      ];

      const periods = NetworkRecorder.findNetworkQuietPeriods(records, 2);
      assert.deepStrictEqual(periods, [
        {start: 1500, end: Infinity},
      ]);
    });

    it('should handle unfinished requests', () => {
      const records = [
        record({startTime: 0, endTime: 1.5}),
        record({startTime: 0, endTime: 2}),
        record({startTime: 0, endTime: 2.5}),
        record({startTime: 2, endTime: 3}),
        record({startTime: 2}),
        record({startTime: 2}),
        record({startTime: 4, endTime: 5}),
        record({startTime: 5.5}),
      ];

      const periods = NetworkRecorder.findNetworkQuietPeriods(records, 2);
      assert.deepStrictEqual(periods, [
        {start: 1500, end: 2000},
        {start: 3000, end: 4000},
        {start: 5000, end: 5500},
      ]);
    });

    it('should ignore data URIs', () => {
      const records = [
        record({startTime: 0, endTime: 1}),
        record({startTime: 0, endTime: 2, url: 'data:image/png;base64,'}),
      ];

      const periods = NetworkRecorder.findNetworkQuietPeriods(records, 0);
      assert.deepStrictEqual(periods, [
        {start: 1000, end: Infinity},
      ]);
    });

    it('should handle iframe requests', () => {
      const iframeRequest = {
        finished: false,
        url: 'https://iframe.com',
        documentURL: 'https://iframe.com',
        responseReceivedTime: 1.2,
      };

      const records = [
        record({startTime: 0, endTime: 1}),
        record({startTime: 0, endTime: 1.2, ...iframeRequest}),
      ];

      const periods = NetworkRecorder.findNetworkQuietPeriods(records, 0);
      assert.deepStrictEqual(periods, []);
    });

    it('should handle QUIC requests', () => {
      const quicRequest = {
        finished: false,
        responseHeaders: [{name: 'ALT-SVC', value: 'hq=":49288";quic="1,1abadaba,51303334,0"'}],
        timing: {receiveHeadersEnd: 1.28},
      };

      const records = [
        record({startTime: 0, endTime: 1}),
        record({startTime: 0, endTime: 2, ...quicRequest}),
      ];

      const periods = NetworkRecorder.findNetworkQuietPeriods(records, 0);
      assert.deepStrictEqual(periods, []);
    });
  });

  it('should handle prefetch requests', () => {
    const records = NetworkRecorder.recordsFromLogs(prefetchedScriptDevtoolsLog);
    expect(records.length).toBe(5);

    const [mainDocument, loaderPrefetch, _ /* favicon */, loaderScript, implScript] = records;
    expect(mainDocument.initiatorRequest).toBe(undefined);
    expect(loaderPrefetch.startTime < loaderScript.startTime).toBe(true);
    expect(loaderPrefetch.resourceType).toBe('Other');
    expect(loaderPrefetch.initiatorRequest).toBe(mainDocument);
    expect(loaderScript.resourceType).toBe('Script');
    expect(loaderScript.initiatorRequest).toBe(mainDocument);
    expect(implScript.resourceType).toBe('Script');
    expect(implScript.initiatorRequest).toBe(loaderScript);
  });

  it('Not set initiators when timings are invalid', () => {
    // Note that the followings are contrived for testing purposes and are
    // unlikely to occur in practice.
    const logs = [
      { // initiator
        'method': 'Network.requestWillBeSent',
        'params': {
          'requestId': '1',
          'frameId': '1',
          'loaderId': '1',
          'documentURL': 'https://www.example.com/home',
          'request': {
            'url': 'https://www.example.com/initiator',
            'method': 'GET',
            'mixedContentType': 'none',
            'initialPriority': 'VeryHigh',
          },
          'timestamp': 107988.912007,
          'wallTime': 1466620735.21187,
          'initiator': {
            'type': 'other',
          },
          'type': 'Other',
        },
      },
      { // initiator response
        'method': 'Network.responseReceived',
        'params': {
          'requestId': '1',
          'frameId': '1',
          'loaderId': '1',
          'documentURL': 'https://www.example.com/home',
          'response': {
            'url': 'https://www.example.com/initiator',
            'status': '200',
            'headers': {},
          },
          'timestamp': 108088.912007,
          'wallTime': 1466620835.21187,
        },
      },
      { // initiated
        'method': 'Network.requestWillBeSent',
        'params': {
          'requestId': '2',
          'frameId': '1',
          'loaderId': '1',
          'documentURL': 'https://www.example.com/home',
          'request': {
            'url': 'https://www.example.com/initiated',
            'method': 'GET',
            'mixedContentType': 'none',
            'initialPriority': 'VeryHigh',
          },
          'timestamp': 106988.912007,
          'wallTime': 1466620635.21187,
          'initiator': {
            'type': 'script',
            'url': 'https://www.example.com/initiator',
          },
          'type': 'Other',
        },
      },
    ];
    const records = NetworkRecorder.recordsFromLogs(logs);
    expect(records.length).toBe(2);

    const [initiator, initiated] = records;
    expect(initiator.initiatorRequest).toBe(undefined);
    expect(initiated.initiatorRequest).toBe(undefined);
  });

  it(`should allow 'Other' initiators when unambiguous`, () => {
    // Note that the followings are contrived for testing purposes and are
    // unlikely to occur in practice. In particular, the initiator's timestamp
    // is after the initiated's timestamp.
    const logs = [
      { // initiator
        'method': 'Network.requestWillBeSent',
        'params': {
          'requestId': '1',
          'frameId': '1',
          'loaderId': '1',
          'documentURL': 'https://www.example.com/home',
          'request': {
            'url': 'https://www.example.com/initiator',
            'method': 'GET',
            'mixedContentType': 'none',
            'initialPriority': 'VeryHigh',
          },
          'timestamp': 107988.912007,
          'wallTime': 1466620735.21187,
          'initiator': {
            'type': 'other',
          },
          'type': 'Other',
        },
      },
      { // initiated
        'method': 'Network.requestWillBeSent',
        'params': {
          'requestId': '2',
          'frameId': '1',
          'loaderId': '1',
          'documentURL': 'https://www.example.com/home',
          'request': {
            'url': 'https://www.example.com/initiated',
            'method': 'GET',
            'mixedContentType': 'none',
            'initialPriority': 'VeryHigh',
          },
          'timestamp': 108088.912007,
          'wallTime': 1466620835.21187,
          'initiator': {
            'type': 'script',
            'url': 'https://www.example.com/initiator',
          },
          'type': 'Other',
        },
      },
    ];
    const records = NetworkRecorder.recordsFromLogs(logs);
    expect(records.length).toBe(2);

    const [initiator, initiated] = records;
    expect(initiator.initiatorRequest).toBe(undefined);
    expect(initiated.initiatorRequest).toBe(initiator);
  });

  it('should give higher precedence to same-frame initiators', () => {
    // Note that the followings are contrived for testing purposes and are
    // unlikely to occur in practice. In particular, the initiator's timestamp
    // is after the initiated's timestamp.
    const logs = [
      { // initiator (frame 1)
        'method': 'Network.requestWillBeSent',
        'params': {
          'requestId': '1',
          'frameId': '1',
          'loaderId': '1',
          'documentURL': 'https://www.example.com/home',
          'request': {
            'url': 'https://www.example.com/initiator',
            'method': 'GET',
            'mixedContentType': 'none',
            'initialPriority': 'VeryHigh',
          },
          'timestamp': 107988.912007,
          'wallTime': 1466620735.21187,
          'initiator': {
            'type': 'other',
          },
          'type': 'Script',
        },
      },
      { // initiator (frame 2)
        'method': 'Network.requestWillBeSent',
        'params': {
          'requestId': '2',
          'frameId': '2',
          'loaderId': '1',
          'documentURL': 'https://www.example.com/home',
          'request': {
            'url': 'https://www.example.com/initiator',
            'method': 'GET',
            'mixedContentType': 'none',
            'initialPriority': 'VeryHigh',
          },
          'timestamp': 108088.912007,
          'wallTime': 1466620835.21187,
          'initiator': {
            'type': 'other',
          },
          'type': 'Script',
        },
      },
      { // initiated (frame 2)
        'method': 'Network.requestWillBeSent',
        'params': {
          'requestId': '3',
          'frameId': '2',
          'loaderId': '1',
          'documentURL': 'https://www.example.com/home',
          'request': {
            'url': 'https://www.example.com/initiated',
            'method': 'GET',
            'mixedContentType': 'none',
            'initialPriority': 'VeryHigh',
          },
          'timestamp': 108188.912007,
          'wallTime': 1466620935.21187,
          'initiator': {
            'type': 'script',
            'url': 'https://www.example.com/initiator',
          },
          'type': 'Script',
        },
      },
    ];
    const records = NetworkRecorder.recordsFromLogs(logs);
    expect(records.length).toBe(3);

    const [initiator1, initiator2, initiated] = records;
    expect(initiator1.frameId).toBe('1');
    expect(initiator1.initiatorRequest).toBe(undefined);
    expect(initiator2.frameId).toBe('2');
    expect(initiator2.initiatorRequest).toBe(undefined);
    expect(initiated.initiatorRequest).toBe(initiator2);
  });

  it('should give higher precedence to same-frame initiators unless timing is invalid', () => {
    // Note that the followings are contrived for testing purposes and are
    // unlikely to occur in practice. In particular, the initiator's timestamp
    // is after the initiated's timestamp.
    const logs = [
      { // initiator (frame 1)
        'method': 'Network.requestWillBeSent',
        'params': {
          'requestId': '1',
          'frameId': '1',
          'loaderId': '1',
          'documentURL': 'https://www.example.com/home',
          'request': {
            'url': 'https://www.example.com/initiator',
            'method': 'GET',
            'mixedContentType': 'none',
            'initialPriority': 'VeryHigh',
          },
          'timestamp': 107988.912007,
          'wallTime': 1466620735.21187,
          'initiator': {
            'type': 'other',
          },
          'type': 'Script',
        },
      },
      { // initiator (frame 2)
        'method': 'Network.requestWillBeSent',
        'params': {
          'requestId': '2',
          'frameId': '2',
          'loaderId': '1',
          'documentURL': 'https://www.example.com/home',
          'request': {
            'url': 'https://www.example.com/initiator',
            'method': 'GET',
            'mixedContentType': 'none',
            'initialPriority': 'VeryHigh',
          },
          'timestamp': 108388.912007,
          'wallTime': 1466621035.21187,
          'initiator': {
            'type': 'other',
          },
          'type': 'Script',
        },
      },
      {
        'method': 'Network.responseReceived',
        'params': {
          'requestId': '2',
          'frameId': '2',
          'loaderId': '1',
          'documentURL': 'https://www.example.com/home',
          'response': {
            'url': 'https://www.example.com/initiator',
            'status': '200',
            'headers': {},
          },
          'timestamp': 108488.912007,
          'wallTime': 1466621135.21187,
        },
      },
      { // initiated (frame 2)
        'method': 'Network.requestWillBeSent',
        'params': {
          'requestId': '3',
          'frameId': '2',
          'loaderId': '1',
          'documentURL': 'https://www.example.com/home',
          'request': {
            'url': 'https://www.example.com/initiated',
            'method': 'GET',
            'mixedContentType': 'none',
            'initialPriority': 'VeryHigh',
          },
          'timestamp': 108188.912007,
          'wallTime': 1466620935.21187,
          'initiator': {
            'type': 'script',
            'url': 'https://www.example.com/initiator',
          },
          'type': 'Script',
        },
      },
    ];
    const records = NetworkRecorder.recordsFromLogs(logs);
    expect(records.length).toBe(3);

    const [initiator1, initiator2, initiated] = records;
    expect(initiator1.frameId).toBe('1');
    expect(initiator1.initiatorRequest).toBe(undefined);
    expect(initiator2.frameId).toBe('2');
    expect(initiator2.initiatorRequest).toBe(undefined);
    expect(initiator2.startTime > initiated.startTime).toBe(true);
    expect(initiated.initiatorRequest).toBe(initiator1);
  });
});
