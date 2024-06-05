/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import {NetworkRecorder} from '../../lib/network-recorder.js';
import {networkRecordsToDevtoolsLog} from '../network-records-to-devtools-log.js';
import {readJson} from '../test-utils.js';
import {NetworkRequest} from '../../lib/network-request.js';

const devtoolsLogItems = readJson('../fixtures/artifacts/perflog/defaultPass.devtoolslog.json', import.meta);
const prefetchedScriptDevtoolsLog = readJson('../fixtures/prefetched-script.devtoolslog.json', import.meta);
const redirectsDevtoolsLog = readJson('../fixtures/wikipedia-redirect.devtoolslog.json', import.meta);
const redirectsScriptDevtoolsLog = readJson('../fixtures/redirects-from-script.devtoolslog.json', import.meta);
const lrRequestDevtoolsLog = readJson('../fixtures/lr.devtoolslog.json', import.meta);

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
    const inputRecords = [{url: 'http://example.com', networkRequestTime: 1, networkEndTime: 2}];
    const devtoolsLogs = networkRecordsToDevtoolsLog(inputRecords);
    const responseReceived = devtoolsLogs.find(item => item.method === 'Network.responseReceived');
    responseReceived.params.response.timing = {requestTime: 0, receiveHeadersEnd: -1};
    const records = NetworkRecorder.recordsFromLogs(devtoolsLogs);
    expect(records).toMatchObject([{url: 'http://example.com', networkRequestTime: 1, networkEndTime: 2}]);
  });

  describe('Lightrider', () => {
    let records;
    before(() => {
      global.isLightrider = true;
      records = NetworkRecorder.recordsFromLogs(lrRequestDevtoolsLog);
    });

    it('should use X-TotalFetchedSize in Lightrider for transferSize', () => {
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

    it('should use respect X-Original-Content-Encoding', () => {
      const record = records.find(r => r.url === 'https://www.paulirish.com/javascripts/modernizr-2.0.js');
      expect(NetworkRequest.isContentEncoded(record)).toBe(true);
    });

    after(() => {
      global.isLightrider = false;
    });
  });

  it('should set sessionId and sessionTargetType of network records', () => {
    const devtoolsLogs = networkRecordsToDevtoolsLog([
      {url: 'http://example.com', sessionId: undefined, sessionTargetType: 'page'},
      {url: 'http://iframe.com', sessionId: 'session2', sessionTargetType: 'iframe'},
    ]);

    const records = NetworkRecorder.recordsFromLogs(devtoolsLogs);
    expect(records).toMatchObject([
      {url: 'http://example.com', sessionTargetType: 'page', sessionId: undefined},
      {url: 'http://iframe.com', sessionTargetType: 'iframe', sessionId: 'session2'},
    ]);
  });

  it('should set sessionId and sessionTargetType of from just request event', () => {
    const devtoolsLogs = networkRecordsToDevtoolsLog([
      {url: 'http://iframe.com', sessionId: 'session2', sessionTargetType: 'iframe'},
    ]);
    const requestWillBeSentLog =
      devtoolsLogs.filter(entry => entry.method === 'Network.requestWillBeSent');

    const records = NetworkRecorder.recordsFromLogs(requestWillBeSentLog);
    expect(records).toMatchObject([
      {url: 'http://iframe.com', sessionTargetType: 'iframe', sessionId: 'session2'},
    ]);
  });

  it('should handle prefetch requests', () => {
    const records = NetworkRecorder.recordsFromLogs(prefetchedScriptDevtoolsLog);
    expect(records).toHaveLength(5);

    const [mainDocument, loaderPrefetch, _ /* favicon */, loaderScript, implScript] = records;
    expect(mainDocument.initiatorRequest).toBe(undefined);
    expect(loaderPrefetch.networkRequestTime < loaderScript.networkRequestTime).toBe(true);
    expect(loaderPrefetch.resourceType).toBe('Other');
    expect(loaderPrefetch.initiatorRequest).toBe(mainDocument);
    expect(loaderScript.resourceType).toBe('Script');
    expect(loaderScript.initiatorRequest).toBe(mainDocument);
    expect(implScript.resourceType).toBe('Script');
    expect(implScript.initiatorRequest).toBe(loaderScript);
  });

  it('Not set initiators when timings are invalid', () => {
    // Note that the followings are contrived for testing purposes and are
    // unlikely to occur in practice. In particular, the initiator's timestamp
    // is after the initiated's timestamp.
    const devtoolsLog = networkRecordsToDevtoolsLog([
      { // initiator
        requestId: '1',
        frameId: '1',
        documentURL: 'https://www.example.com/home',
        url: 'https://www.example.com/initiator',
        rendererStartTime: 107988912.007,
        responseHeadersEndTime: 108088912.007,
        initiator: {type: 'other'},
        resourceType: 'Other',
        statusCode: 200,
      },
      { // initiated
        requestId: '2',
        frameId: '1',
        documentURL: 'https://www.example.com/home',
        url: 'https://www.example.com/initiated',
        rendererStartTime: 106988912.007,
        initiator: {
          type: 'script',
          url: 'https://www.example.com/initiator',
        },
        resourceType: 'Other',
      },
    ]);

    const records = NetworkRecorder.recordsFromLogs(devtoolsLog);
    expect(records).toHaveLength(2);

    const [initiator, initiated] = records;
    expect(initiator.initiatorRequest).toBe(undefined);
    expect(initiated.initiatorRequest).toBe(undefined);
  });

  it(`should allow 'Other' initiators when unambiguous`, () => {
    // Note that the followings are contrived for testing purposes and are
    // unlikely to occur in practice.
    const devtoolsLog = networkRecordsToDevtoolsLog([
      { // initiator
        requestId: '1',
        frameId: '1',
        documentURL: 'https://www.example.com/home',
        url: 'https://www.example.com/initiator',
        priority: 'VeryHigh',
        rendererStartTime: 107988912.007,
        initiator: {type: 'other'},
        resourceType: 'Other',
      },
      { // initiated
        requestId: '2',
        frameId: '1',
        documentURL: 'https://www.example.com/home',
        url: 'https://www.example.com/initiated',
        rendererStartTime: 108088912.007,
        initiator: {
          type: 'script',
          url: 'https://www.example.com/initiator',
        },
        resourceType: 'Other',
      },
    ]);

    const records = NetworkRecorder.recordsFromLogs(devtoolsLog);
    expect(records).toHaveLength(2);

    const [initiator, initiated] = records;
    expect(initiator.initiatorRequest).toBe(undefined);
    expect(initiated.initiatorRequest).toBe(initiator);
  });

  it('should give higher precedence to same-frame initiators', () => {
    // Note that the followings are contrived for testing purposes and are
    // unlikely to occur in practice.
    const devtoolsLog = networkRecordsToDevtoolsLog([
      { // initiator (frame 1)
        requestId: '1',
        frameId: '1',
        documentURL: 'https://www.example.com/home',
        url: 'https://www.example.com/initiator',
        priority: 'VeryHigh',
        rendererStartTime: 107988912.007,
        initiator: {type: 'other'},
        resourceType: 'Script',
      },
      { // initiator (frame 2)
        requestId: '2',
        frameId: '2',
        documentURL: 'https://www.example.com/home',
        url: 'https://www.example.com/initiator',
        rendererStartTime: 108088912.007,
        initiator: {type: 'other'},
        resourceType: 'Script',
      },
      { // initiated (frame 2)
        requestId: '3',
        frameId: '2',
        documentURL: 'https://www.example.com/home',
        url: 'https://www.example.com/initiated',
        rendererStartTime: 108188912.007,
        initiator: {
          type: 'script',
          url: 'https://www.example.com/initiator',
        },
        resourceType: 'Script',
      },
    ]);

    const records = NetworkRecorder.recordsFromLogs(devtoolsLog);
    expect(records).toHaveLength(3);

    const [initiator1, initiator2, initiated] = records;
    expect(initiator1.frameId).toBe('1');
    expect(initiator1.initiatorRequest).toBe(undefined);
    expect(initiator2.frameId).toBe('2');
    expect(initiator2.initiatorRequest).toBe(undefined);
    expect(initiated.initiatorRequest).toBe(initiator2);
  });

  it('should give higher precedence to document initiators', () => {
    const devtoolsLog = networkRecordsToDevtoolsLog([
      { // initiator (Document)
        requestId: '1',
        frameId: '1',
        documentURL: 'https://www.example.com/home',
        url: 'https://www.example.com/initiator',
        priority: 'VeryHigh',
        rendererStartTime: 107988912.007,
        initiator: {type: 'other'},
        resourceType: 'Document',
      },
      { // initiator (XHR)
        requestId: '2',
        frameId: '1',
        documentURL: 'https://www.example.com/home',
        url: 'https://www.example.com/initiator',
        priority: 'VeryHigh',
        rendererStartTime: 108088912.007,
        initiator: {type: 'other'},
        resourceType: 'XHR',
      },
      { // initiated
        requestId: '3',
        frameId: '1',
        documentURL: 'https://www.example.com/home',
        url: 'https://www.example.com/initiated',
        rendererStartTime: 108188912.007,
        initiator: {
          type: 'parser',
          url: 'https://www.example.com/initiator',
        },
        resourceType: 'Script',
      },
    ]);

    const records = NetworkRecorder.recordsFromLogs(devtoolsLog);
    expect(records).toHaveLength(3);

    const [initiator1, initiator2, initiated] = records;
    expect(initiator1.initiatorRequest).toBe(undefined);
    expect(initiator2.initiatorRequest).toBe(undefined);
    expect(initiated.initiatorRequest).toBe(initiator1);
  });

  it('should give higher precedence to same-frame initiators unless timing is invalid', () => {
    // Note that the followings are contrived for testing purposes and are
    // unlikely to occur in practice. In particular, the initiator's timestamp
    // is after the initiated's timestamp.
    const devtoolsLog = networkRecordsToDevtoolsLog([
      { // initiator (frame 1)
        requestId: '1',
        frameId: '1',
        documentURL: 'https://www.example.com/home',
        url: 'https://www.example.com/initiator',
        priority: 'VeryHigh',
        rendererStartTime: 107988912.007,
        initiator: {type: 'other'},
        resourceType: 'Script',
      },
      { // initiator (frame 2)
        requestId: '2',
        frameId: '2',
        documentURL: 'https://www.example.com/home',
        url: 'https://www.example.com/initiator',
        rendererStartTime: 108388912.007,
        responseHeadersEndTime: 108488912.007,
        initiator: {type: 'other'},
        resourceType: 'Script',
      },
      { // initiated (frame 2)
        requestId: '3',
        frameId: '2',
        documentURL: 'https://www.example.com/home',
        url: 'https://www.example.com/initiated',
        rendererStartTime: 108188912.007,
        initiator: {
          type: 'script',
          url: 'https://www.example.com/initiator',
        },
        resourceType: 'Script',
      },
    ]);

    const records = NetworkRecorder.recordsFromLogs(devtoolsLog);
    expect(records).toHaveLength(3);

    const [initiator1, initiator2, initiated] = records;
    expect(initiator1.frameId).toBe('1');
    expect(initiator1.initiatorRequest).toBe(undefined);
    expect(initiator2.frameId).toBe('2');
    expect(initiator2.initiatorRequest).toBe(undefined);
    expect(initiator2.networkRequestTime > initiated.networkRequestTime).toBe(true);
    expect(initiated.initiatorRequest).toBe(initiator1);
  });

  it('should look in async stack traces for initiators', () => {
    const devtoolsLogs = networkRecordsToDevtoolsLog([
      {
        url: 'https://example.com/',
        networkRequestTime: 10_000,
      }, {
        url: 'https://example.com/script.js',
        networkRequestTime: 20_000,
        initiator: {
          type: 'parser',
          url: 'https://example.com/',
        },
      },
      {
        url: 'https://example.com/img.png',
        networkRequestTime: 30_000,
        initiator: {
          type: 'script',
          stack: {
            // Only async callFrames entries.
            callFrames: [],
            parent: {
              description: 'Image',
              callFrames: [{
                functionName: 'apply',
                scriptId: '23',
                url: 'https://example.com/script.js',
                lineNumber: 165,
                columnNumber: 416,
              }, {
                functionName: 'Cu',
                scriptId: '78',
                url: 'https://example.com/',
                lineNumber: 0,
                columnNumber: 91074,
              }],
            },
          },
        },
      },
    ]);

    const records = NetworkRecorder.recordsFromLogs(devtoolsLogs);
    expect(records).toHaveLength(3);

    const [mainRequest, scriptRequest, imageRequest] = records;
    expect(mainRequest.initiatorRequest).toBe(undefined);
    expect(scriptRequest.initiatorRequest).toBe(mainRequest);
    expect(imageRequest.initiatorRequest).toBe(scriptRequest);
  });

  it('should follow a successful preload for the initiator path', () => {
    const devtoolsLogs = networkRecordsToDevtoolsLog([
      {
        url: 'https://example.com/',
        networkRequestTime: 10_000,
      }, {
        url: 'https://example.com/script.js',
        networkRequestTime: 20_000,
        isLinkPreload: true,
        initiator: {type: 'parser', url: 'https://example.com/'},
      }, {
        url: 'https://example.com/script.js',
        networkRequestTime: 30_000,
        fromDiskCache: true,
        initiator: {type: 'parser', url: 'https://example.com/'},
      },
      {
        url: 'https://example.com/img.png',
        networkRequestTime: 40_000,
        initiator: {type: 'script', url: 'https://example.com/script.js'},
      },
    ]);

    const records = NetworkRecorder.recordsFromLogs(devtoolsLogs);
    expect(records).toHaveLength(4);

    const [mainRequest, preloadRequest, scriptRequest, imageRequest] = records;
    expect(mainRequest.initiatorRequest).toBe(undefined);
    expect(preloadRequest.initiatorRequest).toBe(mainRequest);
    expect(scriptRequest.initiatorRequest).toBe(mainRequest);
    expect(imageRequest.initiatorRequest).toBe(preloadRequest);
  });

  it('should discard failed initiators', () => {
    const url = 'https://redirecty.test/';
    const frameId = 'MAIN_FRAME';
    const redirectInitiator = {
      type: 'script',
      stack: {
        callFrames: [{
          functionName: 'util.reload',
          url,
          scriptId: '1',
          lineNumber: 4,
          columnNumber: 1000,
        }],
      },
    };

    // A page uses JS to refresh itself, with a spurious failed request in between.
    const devtoolsLog = networkRecordsToDevtoolsLog([
      {
        url,
        frameId,
        requestId: 'ROOT_DOC',
        resourceType: 'Document',
        initiator: {type: 'other'},
        protocol: 'h2',
        statusCode: 200,
        failed: false,
        finished: true,
        rendererStartTime: 10,
        networkRequestTime: 15,
        responseHeadersEndTime: 200,
        networkEndTime: 300,
        transferSize: 11_000,
        resourceSize: 50_000,
      },
      {
        url,
        frameId,
        requestId: 'FAILED_DOC',
        resourceType: 'Document',
        initiator: redirectInitiator,
        protocol: '',
        statusCode: -1,
        failed: true,
        finished: true,
        localizedFailDescription: 'net::ERR_ABORTED',
        rendererStartTime: 500,
        networkRequestTime: 500,
        responseHeadersEndTime: 500,
        networkEndTime: 501,
        transferSize: 0,
        resourceSize: 0,
      },
      {
        url,
        frameId,
        requestId: 'REFRESH_DOC',
        resourceType: 'Document',
        initiator: redirectInitiator,
        protocol: 'h3',
        statusCode: 200,
        failed: false,
        finished: true,
        rendererStartTime: 503,
        networkRequestTime: 504,
        responseHeadersEndTime: 700,
        networkEndTime: 800,
        transferSize: 10_000,
        resourceSize: 51_000,
      },
    ]);

    const records = NetworkRecorder.recordsFromLogs(devtoolsLog);
    expect(records).toHaveLength(3);

    const [rootDoc, failedDoc, refreshDoc] = records;
    expect(rootDoc.initiatorRequest).toBe(undefined);
    expect(failedDoc.initiatorRequest).toBe(rootDoc);
    expect(refreshDoc.initiatorRequest).toBe(rootDoc);
  });

  it('should not set initiator when ambiguous', () => {
    const devtoolsLog = networkRecordsToDevtoolsLog([
      { // initiator A
        requestId: '1',
        frameId: '1',
        documentURL: 'https://www.example.com/home',
        url: 'https://www.example.com/initiator',
        priority: 'VeryHigh',
        rendererStartTime: 107988912.007,
        initiator: {type: 'other'},
        resourceType: 'Script',
      },
      { // initiator B
        requestId: '2',
        frameId: '1',
        documentURL: 'https://www.example.com/home',
        url: 'https://www.example.com/initiator',
        rendererStartTime: 108188912.007,
        initiator: {type: 'other'},
        resourceType: 'Script',
      },
      { // initiated
        requestId: '3',
        frameId: '2', // Intentionally frame 2.
        documentURL: 'https://www.example.com/home',
        url: 'https://www.example.com/initiated',
        rendererStartTime: 108388912.007,
        initiator: {
          type: 'script',
          url: 'https://www.example.com/initiator',
        },
        resourceType: 'Script',
      },
    ]);

    const records = NetworkRecorder.recordsFromLogs(devtoolsLog);
    expect(records).toHaveLength(3);

    const [initiator1, initiator2, initiated] = records;
    expect(initiator1.initiatorRequest).toBe(undefined);
    expect(initiator2.initiatorRequest).toBe(undefined);
    expect(initiated.initiatorRequest).toBe(undefined);
  });
});
