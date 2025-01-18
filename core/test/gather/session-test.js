/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {EventEmitter} from 'events';

import {CdpCDPSession} from 'puppeteer-core/lib/cjs/puppeteer/cdp/CDPSession.js';

import {ProtocolSession} from '../../gather/session.js';
import {
  flushAllTimersAndMicrotasks,
  makePromiseInspectable,
  createDecomposedPromise,
  fnAny,
  timers,
} from '../test-utils.js';

/**
 * @param {number} id
 * @return {LH.Crdp.Page.FrameNavigatedEvent}
 */
function mockFrameNavigated(id) {
  return {
    frame: {
      id: String(id),
      loaderId: String(id),
      url: `https://example.com/page${id}`,
      domainAndRegistry: 'example.com',
      securityOrigin: 'https://example.com',
      mimeType: 'text/html',
      secureContextType: 'Secure',
      crossOriginIsolatedContextType: 'NotIsolated',
      gatedAPIFeatures: [],
    },
    type: 'Navigation',
  };
}

describe('ProtocolSession', () => {
  before(() => timers.useFakeTimers());
  after(() => timers.dispose());

  const DEFAULT_TIMEOUT = 30_000;

  /** @type {LH.Puppeteer.CDPSession} */
  let puppeteerSession;
  /** @type {ProtocolSession} */
  let session;
  let rawSend = fnAny();

  beforeEach(() => {
    rawSend = fnAny().mockResolvedValue(Promise.resolve());

    // @ts-expect-error - Individual mock functions are applied as necessary.
    puppeteerSession = new CdpCDPSession({_rawSend: rawSend}, '', 'root');
    session = new ProtocolSession(puppeteerSession);
  });

  describe('responds to events from the underlying CDPSession', () => {
    const mockNavigated1 = mockFrameNavigated(1);
    const mockNavigated2 = mockFrameNavigated(2);

    it('once', async () => {
      const callback = fnAny();

      session.once('Page.frameNavigated', callback);
      puppeteerSession.emit('Page.frameNavigated', mockNavigated1);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(mockNavigated1);

      puppeteerSession.emit('Page.frameNavigated', mockNavigated2);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('on', async () => {
      const callback = fnAny();

      session.on('Page.frameNavigated', callback);
      puppeteerSession.emit('Page.frameNavigated', mockNavigated1);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(mockNavigated1);

      puppeteerSession.emit('Page.frameNavigated', mockNavigated2);
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenCalledWith(mockNavigated2);
    });

    it('off', async () => {
      const callback = fnAny();

      session.on('Page.frameNavigated', callback);
      puppeteerSession.emit('Page.frameNavigated', mockNavigated1);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(mockNavigated1);

      session.off('Page.frameNavigated', callback);
      puppeteerSession.emit('Page.frameNavigated', mockNavigated2);
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('.dispose', () => {
    it('should detach from the session', async () => {
      const detach = fnAny();
      detach.mockResolvedValue(undefined);
      class MockCdpSession extends EventEmitter {
        constructor() {
          super();

          this.detach = detach;
        }
      }

      // @ts-expect-error - we want to use a more limited test.
      puppeteerSession = new MockCdpSession();
      session = new ProtocolSession(puppeteerSession);

      expect(puppeteerSession.listenerCount('*')).toBe(1);

      await session.dispose();
      expect(detach).toHaveBeenCalled();
      expect(puppeteerSession.listenerCount('*')).toBe(0);
    });
  });

  describe('.sendCommand', () => {
    it('delegates to puppeteer', async () => {
      const send = puppeteerSession.send = fnAny().mockResolvedValue(123);

      const result = await session.sendCommand('Page.navigate', {url: 'foo'});
      expect(result).toEqual(123);
      expect(send).toHaveBeenCalledWith('Page.navigate', {url: 'foo'}, {timeout: 30050});
    });

    it('times out a request by default', async () => {
      const sendPromise = createDecomposedPromise();
      puppeteerSession.send = fnAny().mockReturnValue(sendPromise.promise);

      const resultPromise = makePromiseInspectable(session.sendCommand('Page.navigate', {url: ''}));

      await timers.advanceTimersByTime(DEFAULT_TIMEOUT + 1);
      await flushAllTimersAndMicrotasks();

      expect(resultPromise).toBeDone();
      await expect(resultPromise).rejects.toMatchObject({
        code: 'PROTOCOL_TIMEOUT',
        protocolMethod: 'Page.navigate',
      });
    });

    it('times out a request with explicit timeout', async () => {
      const sendPromise = createDecomposedPromise();
      puppeteerSession.send = fnAny().mockReturnValue(sendPromise.promise);

      session.setNextProtocolTimeout(60_000);
      const resultPromise = makePromiseInspectable(session.sendCommand('Page.navigate', {url: ''}));

      await timers.advanceTimersByTime(DEFAULT_TIMEOUT + 1);
      await flushAllTimersAndMicrotasks();

      expect(resultPromise).not.toBeDone();

      await timers.advanceTimersByTime(DEFAULT_TIMEOUT + 1);
      await flushAllTimersAndMicrotasks();

      expect(resultPromise).toBeDone();
      await expect(resultPromise).rejects.toMatchObject({
        code: 'PROTOCOL_TIMEOUT',
        protocolMethod: 'Page.navigate',
      });
    });

    it('respects a timeout of infinity', async () => {
      const sendPromise = createDecomposedPromise();
      puppeteerSession.send = fnAny().mockReturnValue(sendPromise.promise);

      session.setNextProtocolTimeout(Infinity);
      const resultPromise = makePromiseInspectable(session.sendCommand('Page.navigate', {url: ''}));

      await timers.advanceTimersByTime(100_000);
      await flushAllTimersAndMicrotasks();

      expect(resultPromise).not.toBeDone();

      sendPromise.resolve('result');
      await flushAllTimersAndMicrotasks();

      expect(resultPromise).toBeDone();
      expect(await resultPromise).toBe('result');
    });

    it('rejects on error from protocol', async () => {
      rawSend.mockRejectedValue(new Error('Url is not valid'));
      const resultPromise = session.sendCommand('Page.navigate', {url: ''});
      await expect(resultPromise).rejects.toThrow('Url is not valid');
    });
  });

  describe('.has/get/setNextProtocolTimeout', () => {
    it('should handle when none has been set', () => {
      expect(session.hasNextProtocolTimeout()).toBe(false);
      expect(session.getNextProtocolTimeout()).toBe(DEFAULT_TIMEOUT);
    });

    it('should handle when one has been set', () => {
      session.setNextProtocolTimeout(5_000);
      expect(session.hasNextProtocolTimeout()).toBe(true);
      expect(session.getNextProtocolTimeout()).toBe(5_000);
    });

    it('should handle when default has been explicitly set', () => {
      session.setNextProtocolTimeout(DEFAULT_TIMEOUT);
      expect(session.hasNextProtocolTimeout()).toBe(true);
      expect(session.getNextProtocolTimeout()).toBe(DEFAULT_TIMEOUT);
    });

    it('should handle result after a command', () => {
      session.setNextProtocolTimeout(10_000);
      expect(session.hasNextProtocolTimeout()).toBe(true);
      expect(session.getNextProtocolTimeout()).toBe(10_000);

      session.sendCommand('Page.navigate', {url: ''});

      expect(session.hasNextProtocolTimeout()).toBe(false);
      expect(session.getNextProtocolTimeout()).toBe(DEFAULT_TIMEOUT);
    });

    it('should handle infinite timeout', () => {
      session.setNextProtocolTimeout(Infinity);
      expect(session.hasNextProtocolTimeout()).toBe(true);
      expect(session.getNextProtocolTimeout()).toBe(2147483597);
    });

    it('should handle extremely large (but not infinite) timeout', () => {
      session.setNextProtocolTimeout(2 ** 40);
      expect(session.hasNextProtocolTimeout()).toBe(true);
      expect(session.getNextProtocolTimeout()).toBe(2147483597);
    });
  });
});
