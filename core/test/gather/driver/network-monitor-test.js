/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {createMockCdpSession} from '../mock-driver.js';
import {NetworkMonitor} from '../../../gather/driver/network-monitor.js';
import {NetworkRequest} from '../../../lib/network-request.js';
import {networkRecordsToDevtoolsLog} from '../../network-records-to-devtools-log.js';
import {TargetManager} from '../../../gather/driver/target-manager.js';

const tscErr = new Error('Typecheck constraint failed');

describe('NetworkMonitor', () => {
  /** @type {ReturnType<createMockCdpSession>} */
  let rootCdpSessionMock;
  /**
   * Dispatch events on the root CDPSession.
   * @type {(event: {method: string, params: unknown}) => void}
   */
  let rootDispatch;
  /** @type {TargetManager} */
  let targetManager;
  /** @type {Array<LH.Protocol.RawEventMessage>} */
  let devtoolsLog;
  /** @type {NetworkMonitor} */
  let monitor;
  /** @type {string[]} */
  let statusLog = [];

  /**
   * Mock a Puppeteer CDPSession, including the commands needed to attach to the
   * target manager.
   * @param {{id: string, targetType: 'page'|'iframe'|'other'}} args
   */
  function mockAttachingSession({id, targetType}) {
    const cdpSessionMock = createMockCdpSession(id);
    cdpSessionMock.send
      .mockResponse('Page.enable')
      .mockResponse('Page.getFrameTree', {frameTree: {frame: {id: 'mainFrameId'}}})
      .mockResponse('Runtime.enable')
      .mockResponse('Target.getTargetInfo', {targetInfo: {type: targetType, targetId: id}})
      .mockResponse('Network.enable')
      .mockResponse('Target.setAutoAttach')
      .mockResponse('Runtime.runIfWaitingForDebugger');

    return cdpSessionMock;
  }

  /** @param {ReturnType<typeof createMockCdpSession>} cdpSession */
  function createSessionDispatch(cdpSession) {
    const on = cdpSession.on;

    /** @param {{method: string, params: unknown}} args */
    function dispatch({method, params}) {
      // Get live listeners in case they change.
      const eventListeners = on.mock.calls.filter(call => call[0] === method).map(call => call[1]);
      for (const listener of eventListeners) {
        listener(params);
      }

      const starListeners = on.mock.calls.filter(call => call[0] === '*').map(call => call[1]);
      for (const listener of starListeners) {
        listener(method, params);
      }
    }

    return dispatch;
  }

  /** Use requestIdPrefix to ensure unique requests if used more than once in a test. */
  function getDevtoolsLog(requestIdPrefix = '36185') {
    const log = networkRecordsToDevtoolsLog([
      {url: 'http://example.com', priority: 'VeryHigh', requestId: `${requestIdPrefix}.1`},
      {url: 'http://example.com/xhr', priority: 'High', requestId: `${requestIdPrefix}.2`},
      {url: 'http://example.com/css', priority: 'VeryHigh', requestId: `${requestIdPrefix}.3`},
      {url: 'http://example.com/offscreen', priority: 'Low', requestId: `${requestIdPrefix}.4`},
    ]);

    // Bring the starting events forward in the log.
    /** @type {LH.Protocol.RawEventMessage[]} */
    const startEvents = log.filter(m => m.method === 'Network.requestWillBeSent');
    const restEvents = log.filter(m => !startEvents.includes(m));
    return [...startEvents, ...restEvents];
  }

  beforeEach(async () => {
    rootCdpSessionMock = mockAttachingSession({id: 'root', targetType: 'page'});

    rootDispatch = createSessionDispatch(rootCdpSessionMock);
    targetManager = new TargetManager(rootCdpSessionMock.asCdpSession());
    await targetManager.enable();
    monitor = new NetworkMonitor(targetManager);

    statusLog = [];
    monitor.on('networkbusy', () => statusLog.push('networkbusy'));
    monitor.on('networkidle', () => statusLog.push('networkidle'));
    monitor.on('network-2-busy', () => statusLog.push('network-2-busy'));
    monitor.on('network-2-idle', () => statusLog.push('network-2-idle'));
    monitor.on('network-critical-busy', () => statusLog.push('network-critical-busy'));
    monitor.on('network-critical-idle', () => statusLog.push('network-critical-idle'));

    devtoolsLog = getDevtoolsLog();
  });

  describe('.enable() / .disable()', () => {
    it('should not record anything when disabled', async () => {
      for (const message of devtoolsLog) rootDispatch(message);
      expect(statusLog).toEqual([]);
    });

    it('should record once enabled', async () => {
      await monitor.enable();
      for (const message of devtoolsLog) rootDispatch(message);
      expect(statusLog.length).toBeGreaterThan(0);
    });

    it('should not record after enable/disable cycle', async () => {
      await monitor.enable();
      await monitor.disable();
      for (const message of devtoolsLog) rootDispatch(message);
      expect(statusLog).toEqual([]);
    });

    it('should listen on every unique target', async () => {
      await monitor.enable();

      for (const message of devtoolsLog) rootDispatch(message);
      const rootStatusLogLength = statusLog.length;
      expect(rootStatusLogLength).toBeGreaterThan(0);

      // Add an iframe through a pretend 'sessionattached' event.
      const iframe1Session = mockAttachingSession({id: 'iframe1', targetType: 'iframe'});
      await targetManager._onSessionAttached(iframe1Session.asCdpSession());

      // Dispatch the same count of network requests.
      const iframe1Dispatch = createSessionDispatch(iframe1Session);
      const iframe1DevtoolsLog = getDevtoolsLog('iframe1'); // Need unique requestIds.
      for (const message of iframe1DevtoolsLog) iframe1Dispatch(message);

      expect(statusLog.length).toBe(rootStatusLogLength * 2);

      // Add another iframe through a pretend 'sessionattached' event.
      const iframe2Session = mockAttachingSession({id: 'iframe2', targetType: 'iframe'});
      await targetManager._onSessionAttached(iframe2Session.asCdpSession());

      // Dispatch the same count of network requests.
      const iframe2Dispatch = createSessionDispatch(iframe2Session);
      const iframe2DevtoolsLog = getDevtoolsLog('iframe2'); // Need unique requestIds.
      for (const message of iframe2DevtoolsLog) iframe2Dispatch(message);

      expect(statusLog.length).toBe(rootStatusLogLength * 3);
    });

    it('should have idempotent enable', async () => {
      const initialListenerCount = targetManager.listenerCount('protocolevent');
      await monitor.enable();
      await monitor.enable();
      await monitor.enable();
      await monitor.enable();
      // Only one more listener added for `monitor.enable()`.
      expect(targetManager.listenerCount('protocolevent')).toBe(initialListenerCount + 1);
    });
  });

  describe('.getNavigationUrls()', () => {
    it('should handle the empty case', async () => {
      expect(await monitor.getNavigationUrls()).toEqual({});
    });

    it('should return the first and last navigation', async () => {
      rootCdpSessionMock.send
        .mockResponse('Target.setAutoAttach')
        .mockResponse('Target.setAutoAttach')
        .mockResponse('Target.setAutoAttach')
        .mockResponse('Page.getFrameTree', {frameTree: {frame: {id: '1'}}});
      await monitor.enable();

      const type = 'Navigation';
      const frame = /** @type {*} */ ({id: '1', url: 'https://page.example.com'});
      rootDispatch({method: 'Page.frameNavigated', params: {frame: {...frame, url: 'https://example.com'}, type}}); // eslint-disable-line max-len
      rootDispatch({method: 'Page.frameNavigated', params: {frame: {...frame, url: 'https://intermediate.example.com'}, type}}); // eslint-disable-line max-len
      rootDispatch({method: 'Page.frameNavigated', params: {frame, type}});

      expect(await monitor.getNavigationUrls()).toEqual({
        requestedUrl: 'https://example.com',
        mainDocumentUrl: 'https://page.example.com',
      });
    });

    it('should handle server redirects', async () => {
      rootCdpSessionMock.send
        .mockResponse('Target.setAutoAttach')
        .mockResponse('Target.setAutoAttach')
        .mockResponse('Page.getFrameTree', {frameTree: {frame: {id: '1'}}});
      await monitor.enable();

      // One server redirect followed by a client redirect
      const devtoolsLog = networkRecordsToDevtoolsLog([
        {requestId: '1', networkRequestTime: 100, url: 'https://example.com', priority: 'VeryHigh'},
        {requestId: '1:redirect', networkRequestTime: 200, url: 'https://intermediate.example.com', priority: 'VeryHigh'},
        {requestId: '2', networkRequestTime: 300, url: 'https://page.example.com', priority: 'VeryHigh'},
      ]);
      for (const event of devtoolsLog) {
        rootDispatch(event);
      }

      const type = 'Navigation';
      const frame = /** @type {*} */ ({id: '1', url: 'https://page.example.com'});
      rootDispatch({method: 'Page.frameNavigated', params: {frame: {...frame, url: 'https://intermediate.example.com'}, type}}); // eslint-disable-line max-len
      rootDispatch({method: 'Page.frameNavigated', params: {frame, type}});

      expect(await monitor.getNavigationUrls()).toEqual({
        requestedUrl: 'https://example.com',
        mainDocumentUrl: 'https://page.example.com',
      });
    });

    it('should ignore non-main-frame navigations', async () => {
      rootCdpSessionMock.send
        .mockResponse('Target.setAutoAttach')
        .mockResponse('Target.setAutoAttach');
      await monitor.enable();

      const type = 'Navigation';
      const frame = /** @type {*} */ ({id: '1', url: 'https://page.example.com'});
      rootDispatch({method: 'Page.frameNavigated', params: {frame, type}});
      const iframe = /** @type {*} */ ({id: '2', url: 'https://iframe.example.com', parentId: '1'});
      rootDispatch({method: 'Page.frameNavigated', params: {frame: iframe, type}});

      expect(await monitor.getNavigationUrls()).toEqual({
        requestedUrl: 'https://page.example.com',
        mainDocumentUrl: 'https://page.example.com',
      });
    });
  });

  describe('EventEmitter', () => {
    it('should reemit the requeststarted / requestfinished events', async () => {
      await monitor.enable();
      /** @type {Array<string>} */
      const startedLog = [];
      /** @type {Array<string>} */
      const loadedLog = [];
      monitor.on('requeststarted', /** @param {*} r */ r => startedLog.push(r));
      monitor.on('requestfinished', /** @param {*} r */ r => loadedLog.push(r));
      for (const message of devtoolsLog) rootDispatch(message);
      expect(startedLog).toHaveLength(4);
      expect(loadedLog).toHaveLength(4);
    });

    it('should emit the cycle of network status events', async () => {
      await monitor.enable();
      for (const message of devtoolsLog) rootDispatch(message);

      expect(statusLog).toEqual([
        // First request starts.
        'networkbusy',
        'network-2-idle',
        'network-critical-busy',
        // Second request starts.
        'networkbusy',
        'network-2-idle',
        'network-critical-busy',
        // Third request starts.
        'networkbusy',
        'network-2-busy',
        'network-critical-busy',
        // Fourth request starts.
        'networkbusy',
        'network-2-busy',
        'network-critical-busy',
        // First request finishes.
        'networkbusy',
        'network-2-busy',
        'network-critical-busy',
        // Second request finishes.
        'networkbusy',
        'network-2-idle',
        'network-critical-busy',
        // Third request finishes (leaving 1 Low-pri).
        'networkbusy',
        'network-2-idle',
        'network-critical-idle',
        // Fourth request finishes.
        'networkidle',
        'network-2-idle',
        'network-critical-idle',
      ]);
    });
  });

  describe('.isIdle() methods', () => {
    beforeEach(async () => {
      await monitor.enable();
    });

    it('should capture quiet state in getters', () => {
      expect(monitor.isIdle()).toBe(true);
      expect(monitor.is2Idle()).toBe(true);
      expect(monitor.isCriticalIdle()).toBe(true);
    });

    it('should capture single high-pri request state in getters', () => {
      const startMessage = devtoolsLog.find(event => event.method === 'Network.requestWillBeSent');
      if (!startMessage) throw new Error('startMessage not found');
      rootDispatch(startMessage);
      expect(monitor.isIdle()).toBe(false);
      expect(monitor.is2Idle()).toBe(true);
      expect(monitor.isCriticalIdle()).toBe(false);
    });

    it('should not consider cross frame requests critical', () => {
      for (const message of devtoolsLog) rootDispatch(message);
      expect(monitor.isIdle()).toBe(true);
      expect(monitor.is2Idle()).toBe(true);
      expect(monitor.isCriticalIdle()).toBe(true);

      const crossFrameLog = networkRecordsToDevtoolsLog([
        {requestId: '5', url: 'http://3p.example.com', priority: 'VeryHigh', frameId: 'OOPIF'},
      ]);
      const startMessage = crossFrameLog.find(e => e.method === 'Network.requestWillBeSent');
      if (!startMessage) throw new Error('startMessage not found');
      rootDispatch(startMessage);

      expect(monitor.isIdle()).toBe(false);
      expect(monitor.is2Idle()).toBe(true);
      expect(monitor.isCriticalIdle()).toBe(true);
    });

    it('should capture single low-pri request state in getters', () => {
      const startMessage = devtoolsLog.find(event => event.method === 'Network.requestWillBeSent');
      if (!startMessage || startMessage.method !== 'Network.requestWillBeSent') throw tscErr;
      startMessage.params.request.initialPriority = 'Low';
      rootDispatch(startMessage);
      expect(monitor.isIdle()).toBe(false);
      expect(monitor.is2Idle()).toBe(true);
      expect(monitor.isCriticalIdle()).toBe(true);
    });

    it('should capture multiple request state in getters', () => {
      const messages = devtoolsLog.filter(event => event.method === 'Network.requestWillBeSent');
      for (const message of messages) rootDispatch(message);
      expect(monitor.isIdle()).toBe(false);
      expect(monitor.is2Idle()).toBe(false);
      expect(monitor.isCriticalIdle()).toBe(false);
    });

    it('should capture multiple low-pri request state in getters', () => {
      const messages = devtoolsLog.filter(event => event.method === 'Network.requestWillBeSent');
      for (const message of messages) {
        if (message.method !== 'Network.requestWillBeSent') throw tscErr;
        message.params.request.initialPriority = 'Low';
        rootDispatch(message);
      }

      expect(monitor.isIdle()).toBe(false);
      expect(monitor.is2Idle()).toBe(false);
      expect(monitor.isCriticalIdle()).toBe(true);
    });

    it('should treat longlived stuff as noncritical', () => {
      const messages = networkRecordsToDevtoolsLog([
        // WebSockets usually dont have a priority on them. SSE usually is a 'High'
        {url: 'http://example.com/ws', priority: undefined, requestId: `314.1`, resourceType: 'WebSocket'},
        {url: 'http://example.com/sse', priority: 'High', requestId: `314.2`, resourceType: 'EventSource'},
      ], {skipVerification: true}).filter(event => event.method === 'Network.requestWillBeSent');

      for (const message of messages) {
        rootDispatch(message);
      }

      expect(monitor.isCriticalIdle()).toBe(true);
      expect(monitor.isIdle()).toBe(false);
      expect(monitor.is2Idle()).toBe(true);
    });
  });

  describe('#findNetworkQuietPeriods', () => {
    /**
     * @param {Partial<NetworkRequest>} data
     * @return {NetworkRequest}
     */
    function record(data) {
      const url = data.url || 'https://example.com';
      const scheme = url.split(':')[0];
      return Object.assign(
        new NetworkRequest(),
        {
          url,
          finished: !!data.networkEndTime,
          parsedURL: {scheme},
        },
        data
      );
    }

    it('should find the 0-quiet periods', () => {
      const records = [
        record({networkRequestTime: 0, networkEndTime: 1000}),
        record({networkRequestTime: 2000, networkEndTime: 3000}),
        record({networkRequestTime: 4000, networkEndTime: 5000}),
      ];

      const periods = NetworkMonitor.findNetworkQuietPeriods(records, 0);
      expect(periods).toEqual([
        {start: 1000, end: 2000},
        {start: 3000, end: 4000},
        {start: 5000, end: Infinity},
      ]);
      // Same thing but verifying these numbers round trip without a problem.
      expect(periods).toEqual([
        // The time between the first two, and so on…
        {start: records[0].networkEndTime, end: records[1].networkRequestTime},
        {start: records[1].networkEndTime, end: records[2].networkRequestTime},
        {start: records[2].networkEndTime, end: Infinity},
      ]);
    });

    it('should find the 2-quiet periods', () => {
      const records = [
        record({networkRequestTime: 0, networkEndTime: 1500}),
        record({networkRequestTime: 0, networkEndTime: 2000}),
        record({networkRequestTime: 0, networkEndTime: 2500}),
        record({networkRequestTime: 2000, networkEndTime: 3000}),
        record({networkRequestTime: 4000, networkEndTime: 5000}),
      ];

      const periods = NetworkMonitor.findNetworkQuietPeriods(records, 2);
      expect(periods).toEqual([{start: 1500, end: Infinity}]);
    });

    it('should handle unfinished requests', () => {
      const records = [
        record({networkRequestTime: 0, networkEndTime: 1500}),
        record({networkRequestTime: 0, networkEndTime: 2000}),
        record({networkRequestTime: 0, networkEndTime: 2500}),
        record({networkRequestTime: 2000, networkEndTime: 3000}),
        record({networkRequestTime: 2000}),
        record({networkRequestTime: 2000}),
        record({networkRequestTime: 4000, networkEndTime: 5000}),
        record({networkRequestTime: 5500}),
      ];

      const periods = NetworkMonitor.findNetworkQuietPeriods(records, 2);
      expect(periods).toEqual([
        {start: 1500, end: 2000},
        {start: 3000, end: 4000},
        {start: 5000, end: 5500},
      ]);
    });

    it('should ignore data URIs', () => {
      const records = [
        record({networkRequestTime: 0, networkEndTime: 1000}),
        record({networkRequestTime: 0, networkEndTime: 2000, url: 'data:image/png;base64,',
          protocol: 'data'}),
      ];

      const periods = NetworkMonitor.findNetworkQuietPeriods(records, 0);
      expect(periods).toEqual([{start: 1000, end: Infinity}]);
    });

    it('should handle iframe requests', () => {
      const iframeRequest = {
        finished: false,
        url: 'https://iframe.com',
        documentURL: 'https://iframe.com',
        responseHeadersEndTime: 1200,
      };

      const records = [
        record({networkRequestTime: 0, networkEndTime: 1000}),
        record({networkRequestTime: 0, networkEndTime: 1200, ...iframeRequest}),
      ];

      const periods = NetworkMonitor.findNetworkQuietPeriods(records, 0);
      expect(periods).toEqual([]);
    });

    it('should handle QUIC requests', () => {
      /** @type {Partial<NetworkRequest>} */
      const quicRequest = {
        finished: false,
        responseHeaders: [{name: 'ALT-SVC', value: 'hq=":49288";quic="1,1abadaba,51303334,0"'}],
        timing: /** @type {*} */ ({receiveHeadersEnd: 1280}),
      };

      const records = [
        record({networkRequestTime: 0, networkEndTime: 1000}),
        record({networkRequestTime: 0, networkEndTime: 2000, ...quicRequest}),
      ];

      const periods = NetworkMonitor.findNetworkQuietPeriods(records, 0);
      expect(periods).toEqual([]);
    });
  });
});
