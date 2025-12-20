/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const testHelpers = require('./test-helpers.js');

// Called before other src import so code that relies on `document` and
// `window` have them defined.
testHelpers.setupJsDomGlobals();

const DragAndDrop = require('../app/src/drag-and-drop.js');

describe('DragAndDrop', () => {
  beforeEach(function() {
    // Reconstruct page on every test so event listeners are clean.
    testHelpers.setupJsDomGlobals();
  });

  afterEach(testHelpers.cleanupJsDomGlobals);

  it('document responds to drop event with file', () => {
    const mockCallback = jest.fn();
    new DragAndDrop(mockCallback);

    // create custom drop event with mock files in dataTransfer
    const event = new window.CustomEvent('drop');
    event.dataTransfer = {
      files: ['mock file'],
    };
    document.dispatchEvent(event);
    expect(mockCallback).toBeCalledWith('mock file');
  });

  it('document ignores drop event without file', () => {
    const mockCallback = jest.fn();
    new DragAndDrop(mockCallback);

    document.dispatchEvent(new window.CustomEvent('drop'));
    expect(mockCallback).not.toBeCalled();
  });

  it('document responds to dragover event with file', () => {
    const mockCallback = jest.fn();
    new DragAndDrop(mockCallback);

    const event = new window.CustomEvent('dragover');
    event.dataTransfer = {
      files: ['mock file'],
    };
    document.dispatchEvent(event);
    expect(event.dataTransfer.dropEffect).toEqual('copy');
  });

  it('document ignores dragover event without file', () => {
    const mockCallback = jest.fn();
    new DragAndDrop(mockCallback);

    const event = new window.CustomEvent('dragover');
    document.dispatchEvent(event);
    expect(event.dataTransfer).toBeUndefined();
  });

  it('document responds to mouseleave event when not dragging', () => {
    new DragAndDrop(jest.fn);

    document.dispatchEvent(new window.CustomEvent('mouseleave'));
    expect(document.querySelector('.drop_zone').classList.contains('dropping')).toBeFalsy();
  });

  it('document responds to mouseleave and dragenter events', () => {
    new DragAndDrop(jest.fn);

    document.dispatchEvent(new window.CustomEvent('dragenter'));
    expect(document.querySelector('.drop_zone').classList.contains('dropping')).toBeTruthy();

    document.dispatchEvent(new window.CustomEvent('mouseleave'));
    expect(document.querySelector('.drop_zone').classList.contains('dropping')).toBeFalsy();
  });
});
