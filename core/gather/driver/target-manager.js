/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview This class tracks multiple targets (the page itself and its OOPIFs) and allows consumers to
 * listen for protocol events before each target is resumed.
 */

import EventEmitter from 'events';

import log from 'lighthouse-logger';

import {ProtocolSession} from '../session.js';

/**
 * @typedef {{
 *   target: LH.Crdp.Target.TargetInfo,
 *   cdpSession: LH.Puppeteer.CDPSession,
 *   session: LH.Gatherer.ProtocolSession,
 *   protocolListener: (event: unknown) => void,
 * }} TargetWithSession
 */

// Add protocol event types to EventEmitter.
/** @typedef {{'protocolevent': [LH.Protocol.RawEventMessage]}} ProtocolEventMap */
/** @typedef {LH.Protocol.StrictEventEmitterClass<ProtocolEventMap>} ProtocolEventMessageEmitter */
const ProtocolEventEmitter = /** @type {ProtocolEventMessageEmitter} */ (EventEmitter);

/**
 * Tracks targets (the page itself, its iframes, their iframes, etc) as they
 * appear and allows listeners to the flattened protocol events from all targets.
 */
class TargetManager extends ProtocolEventEmitter {
  /** @param {LH.Puppeteer.CDPSession} cdpSession */
  constructor(cdpSession) {
    super();

    this._enabled = false;
    this._rootCdpSession = cdpSession;
    this._mainFrameId = '';

    /**
     * A map of target id to target/session information. Used to ensure unique
     * attached targets.
     * @type {Map<string, TargetWithSession>}
     */
    this._targetIdToTargets = new Map();
    /** @type {Map<string, LH.Crdp.Runtime.ExecutionContextDescription>} */
    this._executionContextIdToDescriptions = new Map();

    this._onSessionAttached = this._onSessionAttached.bind(this);
    this._onFrameNavigated = this._onFrameNavigated.bind(this);
    this._onExecutionContextCreated = this._onExecutionContextCreated.bind(this);
    this._onExecutionContextDestroyed = this._onExecutionContextDestroyed.bind(this);
    this._onExecutionContextsCleared = this._onExecutionContextsCleared.bind(this);
  }

  /**
   * @param {LH.Crdp.Page.FrameNavigatedEvent} frameNavigatedEvent
   */
  async _onFrameNavigated(frameNavigatedEvent) {
    // Child frames are handled in `_onSessionAttached`.
    if (frameNavigatedEvent.frame.parentId) return;
    if (!this._enabled) return;

    // It's not entirely clear when this is necessary, but when the page switches processes on
    // navigating from about:blank to the `requestedUrl`, resetting `setAutoAttach` has been
    // necessary in the past.
    try {
      await this._rootCdpSession.send('Target.setAutoAttach', {
        autoAttach: true,
        flatten: true,
        waitForDebuggerOnStart: true,
      });
    } catch (err) {
      // The page can be closed at the end of the run before this CDP function returns.
      // In these cases, just ignore the error since we won't need the page anyway.
      if (this._enabled) throw err;
    }
  }

  /**
   * @param {string} sessionId
   * @return {LH.Gatherer.ProtocolSession}
   */
  _findSession(sessionId) {
    for (const {session, cdpSession} of this._targetIdToTargets.values()) {
      if (cdpSession.id() === sessionId) return session;
    }

    throw new Error(`session ${sessionId} not found`);
  }

  /**
   * @param {string} targetType
   * @return {targetType is LH.Protocol.TargetType}
   */
  _isAcceptedTargetType(targetType) {
    return targetType === 'page' ||
      targetType === 'iframe' ||
      targetType === 'worker';
  }

  /**
   * Returns the root session.
   * @return {LH.Gatherer.ProtocolSession}
   */
  rootSession() {
    const rootSessionId = this._rootCdpSession.id();
    return this._findSession(rootSessionId);
  }

  mainFrameExecutionContexts() {
    return [...this._executionContextIdToDescriptions.values()].filter(executionContext => {
      return executionContext.auxData.frameId === this._mainFrameId;
    });
  }

  /**
   * @param {LH.Puppeteer.CDPSession} cdpSession
   */
  async _onSessionAttached(cdpSession) {
    const newSession = new ProtocolSession(cdpSession);

    let targetType;

    try {
      const {targetInfo} = await newSession.sendCommand('Target.getTargetInfo');
      targetType = targetInfo.type;

      // TODO: should detach from target in this case?
      // See pptr: https://github.com/puppeteer/puppeteer/blob/733cbecf487c71483bee8350e37030edb24bc021/src/common/Page.ts#L495-L526
      if (!this._isAcceptedTargetType(targetType)) return;

      // No need to continue if target has already been seen.
      const targetId = targetInfo.targetId;
      if (this._targetIdToTargets.has(targetId)) return;

      newSession.setTargetInfo(targetInfo);
      const targetName = targetInfo.url || targetInfo.targetId;
      log.verbose('target-manager', `target ${targetName} attached`);

      const trueProtocolListener = this._getProtocolEventListener(targetType, newSession.id());
      /** @type {(event: unknown) => void} */
      // @ts-expect-error - pptr currently typed only for single arg emits.
      const protocolListener = trueProtocolListener;
      cdpSession.on('*', protocolListener);
      cdpSession.on('sessionattached', this._onSessionAttached);

      const targetWithSession = {
        target: targetInfo,
        cdpSession,
        session: newSession,
        protocolListener,
      };
      this._targetIdToTargets.set(targetId, targetWithSession);

      // We want to receive information about network requests from iframes, so enable the Network domain.
      await newSession.sendCommand('Network.enable');
      // We also want to receive information about subtargets of subtargets, so make sure we autoattach recursively.
      await newSession.sendCommand('Target.setAutoAttach', {
        autoAttach: true,
        flatten: true,
        waitForDebuggerOnStart: true,
      });
    } catch (err) {
      // Sometimes targets can be closed before we even have a chance to listen to their network activity.
      if (/Target closed/.test(err.message)) return;

      // Worker targets can be a bit fickle and we only enable them for diagnostic purposes.
      // We shouldn't throw a fatal error if there were issues attaching to them.
      if (targetType === 'worker') {
        log.warn('target-manager', `Issue attaching to worker target: ${err}`);
        return;
      }

      throw err;
    } finally {
      // Resume the target if it was paused, but if it's unnecessary, we don't care about the error.
      await newSession.sendCommandAndIgnore('Runtime.runIfWaitingForDebugger');
    }
  }

  /**
   * @param {LH.Crdp.Runtime.ExecutionContextCreatedEvent} event
   */
  _onExecutionContextCreated(event) {
    if (event.context.name.match(/^__puppeteer_utility_world__/)) return;
    if (event.context.name === 'lighthouse_isolated_context') return;

    this._executionContextIdToDescriptions.set(event.context.uniqueId, event.context);
  }

  /**
   * @param {LH.Crdp.Runtime.ExecutionContextDestroyedEvent} event
   */
  _onExecutionContextDestroyed(event) {
    this._executionContextIdToDescriptions.delete(event.executionContextUniqueId);
  }

  _onExecutionContextsCleared() {
    this._executionContextIdToDescriptions.clear();
  }

  /**
   * Returns a listener for all protocol events from session, and augments the
   * event with the sessionId.
   * @param {LH.Protocol.TargetType} targetType
   * @param {string} sessionId
   */
  _getProtocolEventListener(targetType, sessionId) {
    /**
     * @template {keyof LH.Protocol.RawEventMessageRecord} EventName
     * @param {EventName} method
     * @param {LH.Protocol.RawEventMessageRecord[EventName]['params']} params
     */
    const onProtocolEvent = (method, params) => {
      // Cast because tsc 4.7 still can't quite track the dependent parameters.
      const payload = /** @type {LH.Protocol.RawEventMessage} */ (
        {method, params, targetType, sessionId});
      this.emit('protocolevent', payload);
    };

    return onProtocolEvent;
  }

  /**
   * @return {Promise<void>}
   */
  async enable() {
    if (this._enabled) return;

    this._enabled = true;
    this._targetIdToTargets = new Map();
    this._executionContextIdToDescriptions = new Map();

    this._rootCdpSession.on('Page.frameNavigated', this._onFrameNavigated);
    this._rootCdpSession.on('Runtime.executionContextCreated', this._onExecutionContextCreated);
    this._rootCdpSession.on('Runtime.executionContextDestroyed', this._onExecutionContextDestroyed);
    this._rootCdpSession.on('Runtime.executionContextsCleared', this._onExecutionContextsCleared);

    await this._rootCdpSession.send('Page.enable');
    await this._rootCdpSession.send('Runtime.enable');

    this._mainFrameId = (await this._rootCdpSession.send('Page.getFrameTree')).frameTree.frame.id;

    // Start with the already attached root session.
    await this._onSessionAttached(this._rootCdpSession);
  }

  /**
   * @return {Promise<void>}
   */
  async disable() {
    this._rootCdpSession.off('Page.frameNavigated', this._onFrameNavigated);
    this._rootCdpSession.off('Runtime.executionContextCreated', this._onExecutionContextCreated);
    this._rootCdpSession.off('Runtime.executionContextDestroyed',
      this._onExecutionContextDestroyed);
    this._rootCdpSession.off('Runtime.executionContextsCleared', this._onExecutionContextsCleared);

    for (const {cdpSession, protocolListener} of this._targetIdToTargets.values()) {
      cdpSession.off('*', protocolListener);
      cdpSession.off('sessionattached', this._onSessionAttached);
    }

    // Ignore failures on these in case the tab has crashed.
    await this._rootCdpSession.send('Page.disable').catch(_ => {});
    await this._rootCdpSession.send('Runtime.disable').catch(_ => {});

    this._enabled = false;
    this._targetIdToTargets = new Map();
    this._executionContextIdToDescriptions = new Map();
    this._mainFrameId = '';
  }
}

export {TargetManager};
