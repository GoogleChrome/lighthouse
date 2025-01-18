/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {EventEmitter} from 'events';

import {CdpCDPSession} from 'puppeteer-core/lib/cjs/puppeteer/cdp/CDPSession.js';

import {TargetManager} from '../../../gather/driver/target-manager.js';
import {createMockCdpSession} from '../mock-driver.js';
import {createMockSendCommandFn} from '../../gather/mock-commands.js';
import {fnAny} from '../../test-utils.js';

/**
 * @param {{type?: string, targetId?: string}} [overrides]
 * @return {LH.Crdp.Target.TargetInfo}
 */
function createTargetInfo(overrides) {
  return {
    type: 'page',
    targetId: 'page',
    title: '',
    url: '',
    attached: true,
    canAccessOpener: false,
    ...overrides,
  };
}

describe('TargetManager', () => {
  let sessionMock = createMockCdpSession();
  let sendMock = sessionMock.send;
  let targetManager = new TargetManager(sessionMock.asCdpSession());
  let targetInfo = createTargetInfo();

  beforeEach(() => {
    sessionMock = createMockCdpSession();
    sendMock = sessionMock.send;
    sendMock
      .mockResponse('Page.enable')
      .mockResponse('Page.getFrameTree', {frameTree: {frame: {id: 'mainFrameId'}}})
      .mockResponse('Runtime.enable')
      .mockResponse('Page.disable')
      .mockResponse('Runtime.disable')
      .mockResponse('Runtime.runIfWaitingForDebugger');
    targetManager = new TargetManager(sessionMock.asCdpSession());
    targetInfo = createTargetInfo();
  });

  describe('.enable()', () => {
    it('should autoattach to root session', async () => {
      sendMock
        .mockResponse('Target.getTargetInfo', {targetInfo})
        .mockResponse('Network.enable')
        .mockResponse('Target.setAutoAttach');
      await targetManager.enable();

      expect(sendMock.findAllInvocations('Target.setAutoAttach')).toHaveLength(1);
      expect(sendMock.findAllInvocations('Runtime.runIfWaitingForDebugger')).toHaveLength(1);
      expect(targetManager._mainFrameId).toEqual('mainFrameId');
    });

    it('should autoattach to further unique sessions', async () => {
      sendMock
        .mockResponse('Target.getTargetInfo', {targetInfo}) // original, attach
        .mockResponse('Target.getTargetInfo', {targetInfo}) // duplicate, no attach
        .mockResponse('Target.getTargetInfo', {targetInfo: {...targetInfo, targetId: '1'}}) // unique, attach
        .mockResponse('Target.getTargetInfo', {targetInfo: {...targetInfo, targetId: '2'}}) // unique, attach

        .mockResponse('Network.enable')
        .mockResponse('Target.setAutoAttach')
        .mockResponse('Network.enable')
        .mockResponse('Target.setAutoAttach')
        .mockResponse('Network.enable')
        .mockResponse('Target.setAutoAttach')

        .mockResponse('Runtime.runIfWaitingForDebugger')
        .mockResponse('Runtime.runIfWaitingForDebugger')
        .mockResponse('Runtime.runIfWaitingForDebugger')
        .mockResponse('Runtime.runIfWaitingForDebugger');
      await targetManager.enable();

      expect(sessionMock.on).toHaveBeenCalled();
      const sessionListener = sessionMock.on.mock.calls.find(c => c[0] === 'sessionattached')[1];

      // Original, attach.
      expect(sendMock.findAllInvocations('Target.getTargetInfo')).toHaveLength(1);
      expect(sendMock.findAllInvocations('Target.setAutoAttach')).toHaveLength(1);

      // Duplicate, no attach.
      await sessionListener(sessionMock);
      expect(sendMock.findAllInvocations('Target.getTargetInfo')).toHaveLength(2);
      expect(sendMock.findAllInvocations('Target.setAutoAttach')).toHaveLength(1);

      // Unique, attach.
      await sessionListener(sessionMock);
      expect(sendMock.findAllInvocations('Target.getTargetInfo')).toHaveLength(3);
      expect(sendMock.findAllInvocations('Target.setAutoAttach')).toHaveLength(2);

      // Unique, attach.
      await sessionListener(sessionMock);
      expect(sendMock.findAllInvocations('Target.getTargetInfo')).toHaveLength(4);
      expect(sendMock.findAllInvocations('Target.setAutoAttach')).toHaveLength(3);

      // Four resumes because in finally clause, so runs regardless of uniqueness.
      expect(sendMock.findAllInvocations('Runtime.runIfWaitingForDebugger')).toHaveLength(4);
    });

    it('should ignore errors while attaching to worker targets', async () => {
      targetInfo.type = 'worker';
      sendMock
        .mockResponse('Target.getTargetInfo', {targetInfo})
        .mockResponse('Network.enable', () => {
          throw new Error('Cannot use Network.enable');
        })
        .mockResponse('Target.setAutoAttach');
      await targetManager.enable();

      const invocations = sendMock.findAllInvocations('Target.setAutoAttach');
      expect(invocations).toHaveLength(0);

      // Should still be resumed.
      expect(sendMock.findAllInvocations('Runtime.runIfWaitingForDebugger')).toHaveLength(1);
    });

    it('should ignore errors if Target.getTargetInfo is undefined', async () => {
      targetInfo.type = 'worker';
      sendMock
        .mockResponse('Target.getTargetInfo', () => {
          throw new Error(`'Target.getTargetInfo' wasn't found`);
        });
      await targetManager.enable();

      const invocations = sendMock.findAllInvocations('Target.setAutoAttach');
      expect(invocations).toHaveLength(0);

      // Should still be resumed.
      expect(sendMock.findAllInvocations('Runtime.runIfWaitingForDebugger')).toHaveLength(1);
    });

    it('should ignore targets that are not frames or web workers', async () => {
      targetInfo.type = 'service_worker';
      sendMock
        .mockResponse('Target.getTargetInfo', {targetInfo})
        .mockResponse('Target.setAutoAttach');
      await targetManager.enable();

      const invocations = sendMock.findAllInvocations('Target.setAutoAttach');
      expect(invocations).toHaveLength(0);

      // Should still be resumed.
      expect(sendMock.findAllInvocations('Runtime.runIfWaitingForDebugger')).toHaveLength(1);
    });

    it('should listen to target before resuming', async () => {
      let targetListeningAsserted = false;

      // Intercept listener for all protocol events and ensure target is still paused.
      sessionMock.on = /** @type {typeof sessionMock.on} */ (fnAny()
        .mockImplementation(/** @param {string} eventName */ (eventName) => {
          const getTargetInfoCount = sendMock.findAllInvocations('Target.getTargetInfo').length;
          const setAutoAttachCount = sendMock.findAllInvocations('Target.setAutoAttach').length;
          const resumeCount = sendMock.findAllInvocations('Runtime.runIfWaitingForDebugger').length;

          // There may be many listeners for all protocol events, so just ensure this one occurred.
          if (eventName === '*' &&
              getTargetInfoCount === 1 && setAutoAttachCount === 0 && resumeCount === 0) {
            targetListeningAsserted = true;
          }
        }));

      sendMock
        .mockResponse('Target.getTargetInfo', {targetInfo})
        .mockResponse('Network.enable')
        .mockResponse('Target.setAutoAttach');

      expect(sendMock.findAllInvocations('Target.getTargetInfo')).toHaveLength(0);
      expect(sendMock.findAllInvocations('Target.setAutoAttach')).toHaveLength(0);
      expect(sendMock.findAllInvocations('Runtime.runIfWaitingForDebugger')).toHaveLength(0);

      await targetManager.enable();

      expect(targetListeningAsserted).toBe(true);

      expect(sendMock.findAllInvocations('Target.getTargetInfo')).toHaveLength(1);
      expect(sendMock.findAllInvocations('Target.setAutoAttach')).toHaveLength(1);
      expect(sendMock.findAllInvocations('Runtime.runIfWaitingForDebugger')).toHaveLength(1);
    });

    it('should gracefully handle a target closing while attaching', async () => {
      const targetClosedError = new Error('Target closed');
      sendMock
        .mockResponse('Target.getTargetInfo', {targetInfo})
        .mockResponse('Network.enable')
        .mockResponse('Target.setAutoAttach', () => Promise.reject(targetClosedError));
      await targetManager.enable();
    });

    it('should throw other protocol errors while attaching', async () => {
      const fatalError = new Error('Fatal error');
      sendMock
        .mockResponse('Target.getTargetInfo', {targetInfo})
        .mockResponse('Network.enable')
        .mockResponse('Target.setAutoAttach', () => Promise.reject(fatalError));
      await expect(targetManager.enable()).rejects.toThrowError(
        'Protocol error (Target.setAutoAttach): Fatal error');

      // Should still attempt to resume target.
      expect(sendMock.findAllInvocations('Runtime.runIfWaitingForDebugger')).toHaveLength(1);
    });

    it('should resume the target when finished', async () => {
      targetInfo.type = 'service_worker';
      sendMock.mockResponse('Target.getTargetInfo', {targetInfo});
      await targetManager.enable();

      const invocations = sendMock.findAllInvocations('Runtime.runIfWaitingForDebugger');
      expect(invocations).toHaveLength(1);
    });

    it('should autoattach on main frame navigation', async () => {
      sendMock
        .mockResponse('Target.getTargetInfo', {targetInfo})
        .mockResponse('Network.enable')
        .mockResponse('Target.setAutoAttach')
        .mockResponse('Target.setAutoAttach');
      await targetManager.enable();

      const onFrameNavigation = sessionMock.on.getListeners('Page.frameNavigated')[0];
      onFrameNavigation({frame: {}}); // note the lack of a `parentId`

      const invocations = sendMock.findAllInvocations('Target.setAutoAttach');
      expect(invocations).toHaveLength(2);
    });

    it('should not autoattach on subframe navigation', async () => {
      sendMock
        .mockResponse('Target.getTargetInfo', {targetInfo})
        .mockResponse('Network.enable')
        .mockResponse('Target.setAutoAttach')
        .mockResponse('Target.setAutoAttach');
      await targetManager.enable();

      const onFrameNavigation = sessionMock.on.getListeners('Page.frameNavigated')[0];
      onFrameNavigation({frame: {parentId: 'root'}});

      const invocations = sendMock.findAllInvocations('Target.setAutoAttach');
      expect(invocations).toHaveLength(1);
    });

    it('should be idempotent', async () => {
      sendMock
        .mockResponse('Target.getTargetInfo', {targetInfo})
        .mockResponse('Network.enable')
        .mockResponse('Target.setAutoAttach');
      await targetManager.enable();
      await targetManager.enable();
      await targetManager.enable();

      const invocations = sendMock.findAllInvocations('Target.setAutoAttach');
      expect(invocations).toHaveLength(1);
    });
  });

  describe('.disable()', () => {
    it('should uninstall listeners', async () => {
      await targetManager.disable();

      expect(sessionMock.off).toHaveBeenCalled();
    });
  });

  describe('protocolevent emit', () => {
    /** @param {string} sessionId */
    function createCdpSession(sessionId) {
      class MockCdpConnection extends EventEmitter {
        constructor() {
          super();

          this._rawSend = fnAny();
        }
      }

      const mockCdpConnection = new MockCdpConnection();
      /** @type {import('puppeteer-core').CDPSession} */
      // @ts-expect-error - close enough to the real thing.
      const cdpSession = new CdpCDPSession(mockCdpConnection, '', sessionId);
      return cdpSession;
    }

    it('should listen for and re-emit protocol events across sessions', async () => {
      const rootSession = createCdpSession('root');

      const rootTargetInfo = createTargetInfo();
      // Still mock command responses at session level.
      rootSession.send = createMockSendCommandFn()
        .mockResponse('Page.enable')
        .mockResponse('Page.getFrameTree', {frameTree: {frame: {id: ''}}})
        .mockResponse('Runtime.enable')
        .mockResponse('Target.getTargetInfo', {targetInfo: rootTargetInfo})
        .mockResponse('Network.enable')
        .mockResponse('Target.setAutoAttach')
        .mockResponse('Runtime.runIfWaitingForDebugger');

      const targetManager = new TargetManager(rootSession);
      await targetManager.enable();

      // Attach an iframe session.
      const iframeSession = createCdpSession('iframe');
      const iframeTargetInfo = createTargetInfo({type: 'iframe', targetId: 'iframe'});
      // Still mock command responses at session level.
      iframeSession.send = createMockSendCommandFn()
        .mockResponse('Target.getTargetInfo', {targetInfo: iframeTargetInfo})
        .mockResponse('Network.enable')
        .mockResponse('Target.setAutoAttach')
        .mockResponse('Runtime.runIfWaitingForDebugger');

      rootSession.emit('sessionattached', iframeSession);

      // Wait for iframe session to be attached.
      await new Promise(resolve => setTimeout(resolve, 0));

      const rootListener = fnAny();
      const iframeListener = fnAny();
      const allListener = fnAny();
      rootSession.on('DOM.documentUpdated', rootListener);
      iframeSession.on('Animation.animationCreated', iframeListener);
      targetManager.on('protocolevent', allListener);

      // @ts-expect-error - types for _onMessage are wrong.
      rootSession._onMessage({method: 'DOM.documentUpdated'});
      // @ts-expect-error - types for _onMessage are wrong.
      rootSession._onMessage({method: 'Debugger.scriptParsed', params: {script: 'details'}});
      // @ts-expect-error - types for _onMessage are wrong.
      iframeSession._onMessage({method: 'Animation.animationCreated', params: {id: 'animated'}});

      expect(rootListener).toHaveBeenCalledTimes(1);
      expect(rootListener).toHaveBeenCalledWith(undefined);

      expect(iframeListener).toHaveBeenCalledTimes(1);
      expect(iframeListener).toHaveBeenCalledWith({id: 'animated'});

      expect(allListener).toHaveBeenCalledTimes(3);
      expect(allListener).toHaveBeenCalledWith({
        method: 'DOM.documentUpdated',
        params: undefined,
        sessionId: 'root',
        targetType: 'page',
      });
      expect(allListener).toHaveBeenCalledWith({
        method: 'Debugger.scriptParsed',
        params: {script: 'details'},
        sessionId: 'root',
        targetType: 'page',
      });
      expect(allListener).toHaveBeenCalledWith({
        method: 'Animation.animationCreated',
        params: {id: 'animated'},
        sessionId: 'iframe',
        targetType: 'iframe',
      });
    });

    it('should stop listening for protocol events', async () => {
      const rootSession = createCdpSession('root');
      // Still mock command responses at session level.
      rootSession.send = createMockSendCommandFn()
        .mockResponse('Page.enable')
        .mockResponse('Page.getFrameTree', {frameTree: {frame: {id: ''}}})
        .mockResponse('Runtime.enable')
        .mockResponse('Target.getTargetInfo', {targetInfo})
        .mockResponse('Network.enable')
        .mockResponse('Target.setAutoAttach')
        .mockResponse('Runtime.runIfWaitingForDebugger');

      const targetManager = new TargetManager(rootSession);
      await targetManager.enable();

      const allListener = fnAny();
      targetManager.on('protocolevent', allListener);

      // @ts-expect-error - types for _onMessage are wrong.
      rootSession._onMessage({method: 'DOM.documentUpdated'});
      expect(allListener).toHaveBeenCalled();
      targetManager.off('protocolevent', allListener);
      // @ts-expect-error - types for _onMessage are wrong.
      rootSession._onMessage({method: 'DOM.documentUpdated'});
      expect(allListener).toHaveBeenCalledTimes(1);
    });
  });
});
