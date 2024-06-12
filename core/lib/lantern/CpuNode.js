/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Lantern from './lantern.js';

/**
 * @template [T=any]
 * @extends {Lantern.BaseNode<T>}
 */
class CPUNode extends Lantern.BaseNode {
  /**
   * @param {Lantern.TraceEvent} parentEvent
   * @param {Lantern.TraceEvent[]=} childEvents
   * @param {number=} correctedEndTs
   */
  constructor(parentEvent, childEvents = [], correctedEndTs) {
    const nodeId = `${parentEvent.tid}.${parentEvent.ts}`;
    super(nodeId);

    this._event = parentEvent;
    this._childEvents = childEvents;
    this._correctedEndTs = correctedEndTs;
  }

  get type() {
    return Lantern.BaseNode.TYPES.CPU;
  }

  /**
   * @return {number}
   */
  get startTime() {
    return this._event.ts;
  }

  /**
   * @return {number}
   */
  get endTime() {
    if (this._correctedEndTs) return this._correctedEndTs;
    return this._event.ts + this._event.dur;
  }

  /**
   * @return {number}
   */
  get duration() {
    return this.endTime - this.startTime;
  }

  /**
   * @return {Lantern.TraceEvent}
   */
  get event() {
    return this._event;
  }

  /**
   * @return {Lantern.TraceEvent[]}
   */
  get childEvents() {
    return this._childEvents;
  }

  /**
   * Returns true if this node contains a Layout task.
   * @return {boolean}
   */
  didPerformLayout() {
    return this._childEvents.some(evt => evt.name === 'Layout');
  }

  /**
   * Returns the script URLs that had their EvaluateScript events occur in this task.
   */
  getEvaluateScriptURLs() {
    /** @type {Set<string>} */
    const urls = new Set();
    for (const event of this._childEvents) {
      if (event.name !== 'EvaluateScript') continue;
      if (!event.args.data || !event.args.data.url) continue;
      urls.add(event.args.data.url);
    }

    return urls;
  }

  /**
   * @return {CPUNode}
   */
  cloneWithoutRelationships() {
    return new CPUNode(this._event, this._childEvents, this._correctedEndTs);
  }
}

export {CPUNode};
