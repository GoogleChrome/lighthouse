/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import log from 'lighthouse-logger';

import {ExecutionContext} from './driver/execution-context.js';
import {TargetManager} from './driver/target-manager.js';
import {Fetcher} from './fetcher.js';
import {NetworkMonitor} from './driver/network-monitor.js';

/** @return {*} */
const throwNotConnectedFn = () => {
  throw new Error('Session not connected');
};

/** @type {LH.Gatherer.ProtocolSession} */
const throwingSession = {
  setTargetInfo: throwNotConnectedFn,
  hasNextProtocolTimeout: throwNotConnectedFn,
  getNextProtocolTimeout: throwNotConnectedFn,
  setNextProtocolTimeout: throwNotConnectedFn,
  on: throwNotConnectedFn,
  once: throwNotConnectedFn,
  off: throwNotConnectedFn,
  sendCommand: throwNotConnectedFn,
  sendCommandAndIgnore: throwNotConnectedFn,
  dispose: throwNotConnectedFn,
  onCrashPromise: throwNotConnectedFn,
};

/** @implements {LH.Gatherer.Driver} */
class Driver {
  /**
   * @param {LH.Puppeteer.Page} page
   */
  constructor(page) {
    this._page = page;
    /** @type {TargetManager|undefined} */
    this._targetManager = undefined;
    /** @type {NetworkMonitor|undefined} */
    this._networkMonitor = undefined;
    /** @type {ExecutionContext|undefined} */
    this._executionContext = undefined;
    /** @type {Fetcher|undefined} */
    this._fetcher = undefined;

    this.defaultSession = throwingSession;
  }

  /** @return {LH.Gatherer.Driver['executionContext']} */
  get executionContext() {
    if (!this._executionContext) return throwNotConnectedFn();
    return this._executionContext;
  }

  get fetcher() {
    if (!this._fetcher) return throwNotConnectedFn();
    return this._fetcher;
  }

  get targetManager() {
    if (!this._targetManager) return throwNotConnectedFn();
    return this._targetManager;
  }

  get networkMonitor() {
    if (!this._networkMonitor) return throwNotConnectedFn();
    return this._networkMonitor;
  }

  /** @return {Promise<string>} */
  async url() {
    return this._page.url();
  }

  /** @return {Promise<void>} */
  async connect() {
    if (this.defaultSession !== throwingSession) return;
    const status = {msg: 'Connecting to browser', id: 'lh:driver:connect'};
    log.time(status);
    const cdpSession = await this._page.target().createCDPSession();
    this._targetManager = new TargetManager(cdpSession);
    await this._targetManager.enable();
    this._networkMonitor = new NetworkMonitor(this._targetManager);
    await this._networkMonitor.enable();
    this.defaultSession = this._targetManager.rootSession();
    this._executionContext = new ExecutionContext(this.defaultSession);
    this._fetcher = new Fetcher(this.defaultSession);
    log.timeEnd(status);
  }

  /** @return {Promise<void>} */
  async disconnect() {
    if (this.defaultSession === throwingSession) return;
    await this._targetManager?.disable();
    await this._networkMonitor?.disable();
    await this.defaultSession.dispose();
  }
}

export {Driver};
