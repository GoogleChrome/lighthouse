/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Lantern from '../lantern.js';

/**
 * @fileoverview
 *
 * This class encapsulates the type-related validation logic for moving timing information for nodes
 * through the different simulation phases. Methods here ensure that the invariants of simulation hold
 * as nodes are queued, partially simulated, and completed.
 */

/** @typedef {import('../BaseNode.js').Node} Node */
/** @typedef {import('../NetworkNode.js').NetworkNode} NetworkNode */
/** @typedef {import('../CpuNode.js').CPUNode} CpuNode */

/**
 * @typedef NodeTimingComplete
 * @property {number} startTime
 * @property {number} endTime
 * @property {number} queuedTime Helpful for debugging.
 * @property {number} estimatedTimeElapsed
 * @property {number} timeElapsed
 * @property {number} timeElapsedOvershoot
 * @property {number} bytesDownloaded
 */

/** @typedef {Pick<NodeTimingComplete, 'queuedTime'>} NodeTimingQueued */

/** @typedef {NodeTimingQueued & Pick<NodeTimingComplete, 'startTime'|'timeElapsed'>} CpuNodeTimingStarted */
/** @typedef {CpuNodeTimingStarted & Pick<NodeTimingComplete, 'timeElapsedOvershoot'|'bytesDownloaded'>} NetworkNodeTimingStarted */

/** @typedef {CpuNodeTimingStarted & Pick<NodeTimingComplete, 'estimatedTimeElapsed'>} CpuNodeTimingInProgress */
/** @typedef {NetworkNodeTimingStarted & Pick<NodeTimingComplete, 'estimatedTimeElapsed'>} NetworkNodeTimingInProgress */

/** @typedef {CpuNodeTimingInProgress & Pick<NodeTimingComplete, 'endTime'>} CpuNodeTimingComplete */
/** @typedef {NetworkNodeTimingInProgress & Pick<NodeTimingComplete, 'endTime'> & {connectionTiming: ConnectionTiming}} NetworkNodeTimingComplete */

/** @typedef {NodeTimingQueued | CpuNodeTimingStarted | NetworkNodeTimingStarted | CpuNodeTimingInProgress | NetworkNodeTimingInProgress | CpuNodeTimingComplete | NetworkNodeTimingComplete} NodeTimingData */

/**
 * @typedef ConnectionTiming A breakdown of network connection timings.
 * @property {number} [dnsResolutionTime]
 * @property {number} [connectionTime]
 * @property {number} [sslTime]
 * @property {number} timeToFirstByte
 */

class SimulatorTimingMap {
  constructor() {
    /** @type {Map<Node, NodeTimingData>} */
    this._nodeTimings = new Map();
  }

  /** @return {Array<Node>} */
  getNodes() {
    return Array.from(this._nodeTimings.keys());
  }

  /**
   * @param {Node} node
   * @param {{queuedTime: number}} values
   */
  setReadyToStart(node, values) {
    this._nodeTimings.set(node, values);
  }

  /**
   * @param {Node} node
   * @param {{startTime: number}} values
   */
  setInProgress(node, values) {
    const nodeTiming = {
      ...this.getQueued(node),
      startTime: values.startTime,
      timeElapsed: 0,
    };

    this._nodeTimings.set(
      node,
      node.type === Lantern.BaseNode.TYPES.NETWORK
        ? {...nodeTiming, timeElapsedOvershoot: 0, bytesDownloaded: 0}
        : nodeTiming
    );
  }

  /**
   * @param {Node} node
   * @param {{endTime: number, connectionTiming?: ConnectionTiming}} values
   */
  setCompleted(node, values) {
    const nodeTiming = {
      ...this.getInProgress(node),
      endTime: values.endTime,
      connectionTiming: values.connectionTiming,
    };

    this._nodeTimings.set(node, nodeTiming);
  }

  /**
   * @param {CpuNode} node
   * @param {{timeElapsed: number}} values
   */
  setCpu(node, values) {
    const nodeTiming = {
      ...this.getCpuStarted(node),
      timeElapsed: values.timeElapsed,
    };

    this._nodeTimings.set(node, nodeTiming);
  }

  /**
   * @param {CpuNode} node
   * @param {{estimatedTimeElapsed: number}} values
   */
  setCpuEstimated(node, values) {
    const nodeTiming = {
      ...this.getCpuStarted(node),
      estimatedTimeElapsed: values.estimatedTimeElapsed,
    };

    this._nodeTimings.set(node, nodeTiming);
  }

  /**
   * @param {NetworkNode} node
   * @param {{timeElapsed: number, timeElapsedOvershoot: number, bytesDownloaded: number}} values
   */
  setNetwork(node, values) {
    const nodeTiming = {
      ...this.getNetworkStarted(node),
      timeElapsed: values.timeElapsed,
      timeElapsedOvershoot: values.timeElapsedOvershoot,
      bytesDownloaded: values.bytesDownloaded,
    };

    this._nodeTimings.set(node, nodeTiming);
  }

  /**
   * @param {NetworkNode} node
   * @param {{estimatedTimeElapsed: number}} values
   */
  setNetworkEstimated(node, values) {
    const nodeTiming = {
      ...this.getNetworkStarted(node),
      estimatedTimeElapsed: values.estimatedTimeElapsed,
    };

    this._nodeTimings.set(node, nodeTiming);
  }

  /**
   * @param {Node} node
   * @return {NodeTimingQueued}
   */
  getQueued(node) {
    const timing = this._nodeTimings.get(node);
    if (!timing) throw new Error(`Node ${node.id} not yet queued`);
    return timing;
  }

  /**
   * @param {CpuNode} node
   * @return {CpuNodeTimingStarted}
   */
  getCpuStarted(node) {
    const timing = this._nodeTimings.get(node);
    if (!timing) throw new Error(`Node ${node.id} not yet queued`);
    if (!('startTime' in timing)) throw new Error(`Node ${node.id} not yet started`);
    if ('bytesDownloaded' in timing) throw new Error(`Node ${node.id} timing not valid`);
    return timing;
  }

  /**
   * @param {NetworkNode} node
   * @return {NetworkNodeTimingStarted}
   */
  getNetworkStarted(node) {
    const timing = this._nodeTimings.get(node);
    if (!timing) throw new Error(`Node ${node.id} not yet queued`);
    if (!('startTime' in timing)) throw new Error(`Node ${node.id} not yet started`);
    if (!('bytesDownloaded' in timing)) throw new Error(`Node ${node.id} timing not valid`);
    return timing;
  }

  /**
   * @param {Node} node
   * @return {CpuNodeTimingInProgress | NetworkNodeTimingInProgress}
   */
  getInProgress(node) {
    const timing = this._nodeTimings.get(node);
    if (!timing) throw new Error(`Node ${node.id} not yet queued`);
    if (!('startTime' in timing)) throw new Error(`Node ${node.id} not yet started`);
    if (!('estimatedTimeElapsed' in timing)) throw new Error(`Node ${node.id} not yet in progress`);
    return timing;
  }

  /**
   * @param {Node} node
   * @return {CpuNodeTimingComplete | NetworkNodeTimingComplete}
   */
  getCompleted(node) {
    const timing = this._nodeTimings.get(node);
    if (!timing) throw new Error(`Node ${node.id} not yet queued`);
    if (!('startTime' in timing)) throw new Error(`Node ${node.id} not yet started`);
    if (!('estimatedTimeElapsed' in timing)) throw new Error(`Node ${node.id} not yet in progress`);
    if (!('endTime' in timing)) throw new Error(`Node ${node.id} not yet completed`);
    return timing;
  }
}

export {SimulatorTimingMap};
