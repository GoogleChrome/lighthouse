/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const BaseNode = require('./base-node.js');

class CPUNode extends BaseNode {
  /**
   * @param {LH.TraceEvent} parentEvent
   * @param {LH.TraceEvent[]=} childEvents
   */
  constructor(parentEvent, childEvents = []) {
    const nodeId = `${parentEvent.tid}.${parentEvent.ts}`;
    super(nodeId);

    this._event = parentEvent;
    this._childEvents = childEvents;
  }

  get type() {
    return BaseNode.TYPES.CPU;
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
    return this._event.ts + this._event.dur;
  }

  /**
   * @return {LH.TraceEvent}
   */
  get event() {
    return this._event;
  }

  /**
   * @return {LH.TraceEvent[]}
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
    return new CPUNode(this._event, this._childEvents);
  }
}

module.exports = CPUNode;
