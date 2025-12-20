/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Driver = require('../gather/driver.js'); // eslint-disable-line no-unused-vars

class LHElement {
  /**
   * @param {{nodeId: number}} element
   * @param {Driver} driver
   */
  constructor(element, driver) {
    if (!element || !driver) {
      throw Error('Driver and element required to create Element');
    }
    this.driver = driver;
    this.element = element;
  }

  /**
   * @param {string} name Attribute name
   * @return {Promise<?string>} The attribute value or null if not found
   */
  getAttribute(name) {
    return this.driver
      .sendCommand('DOM.getAttributes', {
        nodeId: this.element.nodeId,
      })
      /**
       * @param resp The element attribute names & values are interleaved
       */
      .then(resp => {
        const attrIndex = resp.attributes.indexOf(name);
        if (attrIndex === -1) {
          return null;
        }

        return resp.attributes[attrIndex + 1];
      });
  }

  /**
   * @return {number}
   */
  getNodeId() {
    return this.element.nodeId;
  }

  /**
   * @param {string} propName Property name
   * @return {Promise<?string>} The property value
   */
  getProperty(propName) {
    return this.driver
      .sendCommand('DOM.resolveNode', {
        nodeId: this.element.nodeId,
      })
      .then(resp => {
        if (!resp.object.objectId) {
          return null;
        }
        return this.driver.getObjectProperty(resp.object.objectId, propName);
      })
      .catch(() => null);
  }
}

module.exports = LHElement;
