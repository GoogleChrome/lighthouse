/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const LHElement = require('../../lib/lh-element.js');
const assert = require('assert').strict;

class DriverStub {
  sendCommand(command) {
    switch (command) {
      case 'DOM.getAttributes':
        return Promise.resolve({attributes: ['rel', 'manifest']});

      case 'DOM.resolveNode':
        return Promise.resolve({object: {objectId: 'test'}});

      default:
        throw Error(`Stub not implemented: ${command}`);
    }
  }

  getObjectProperty() {
    return Promise.resolve('123');
  }
}

/* global describe, it, beforeEach */
describe('LHElement', () => {
  let stubbedDriver;
  let stubbedElement;

  beforeEach(() => {
    stubbedDriver = new DriverStub();
    stubbedElement = {nodeId: 642};
  });

  it('throws when no driver or element is passed', () => {
    assert.throws(() => {
      const _ = new LHElement();
    });
  });

  it('throws when no driver is passed', () => {
    assert.throws(() => {
      const _ = new LHElement(stubbedElement, undefined);
    });
  });

  it('throws when no element is passed', () => {
    assert.throws(() => {
      const _ = new LHElement(undefined, stubbedDriver);
    });
  });

  it('returns null from getAttribute when no attribute found', () => {
    const element = new LHElement(stubbedElement, stubbedDriver);
    return element.getAttribute('notanattribute').then(value => {
      assert.equal(value, null);
    });
  });

  it('returns attribute value from getAttribute', () => {
    const element = new LHElement(stubbedElement, stubbedDriver);
    return element.getAttribute('rel').then(value => {
      assert.equal(value, 'manifest');
    });
  });

  it('returns property value from getProperty', () => {
    const element = new LHElement(stubbedElement, stubbedDriver);
    return element.getProperty('test').then(value => {
      assert.equal(value, '123');
    });
  });
});
