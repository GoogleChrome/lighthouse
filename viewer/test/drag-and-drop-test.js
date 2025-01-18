/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import jestMock from 'jest-mock';

import {DragAndDrop} from '../app/src/drag-and-drop.js';
import * as testHelpers from './test-helpers.js';

describe('DragAndDrop', () => {
  beforeEach(function() {
    // Reconstruct page on every test so event listeners are clean.
    testHelpers.setupJsDomGlobals();
  });

  afterEach(testHelpers.cleanupJsDomGlobals);

  it('document responds to drop event with file', async () => {
    let resolve;
    const promise = new Promise(r => resolve = r);
    const dragAndDrop = new DragAndDrop(resolve);
    dragAndDrop.readFile = async (file) => file;

    // create custom drop event with mock files in dataTransfer
    const event = new window.CustomEvent('drop');
    event.dataTransfer = {
      files: ['mock file'],
    };
    document.dispatchEvent(event);

    expect(await promise).toBe('mock file');
  });

  it('document ignores drop event without file', () => {
    const mockCallback = jestMock.fn();
    new DragAndDrop(mockCallback);

    document.dispatchEvent(new window.CustomEvent('drop'));
    expect(mockCallback).not.toBeCalled();
  });

  it('document responds to dragover event with file', () => {
    const mockCallback = jestMock.fn();
    new DragAndDrop(mockCallback);

    const event = new window.CustomEvent('dragover');
    event.dataTransfer = {
      files: ['mock file'],
    };
    document.dispatchEvent(event);
    expect(event.dataTransfer.dropEffect).toEqual('copy');
  });

  it('document ignores dragover event without file', () => {
    const mockCallback = jestMock.fn();
    new DragAndDrop(mockCallback);

    const event = new window.CustomEvent('dragover');
    document.dispatchEvent(event);
    expect(event.dataTransfer).toBeUndefined();
  });

  it('document responds to mouseleave event when not dragging', () => {
    new DragAndDrop(jestMock.fn);

    document.dispatchEvent(new window.CustomEvent('mouseleave'));
    expect(document.querySelector('.drop_zone').classList.contains('dropping')).toBeFalsy();
  });

  it('document responds to mouseleave and dragenter events', () => {
    new DragAndDrop(jestMock.fn);

    document.dispatchEvent(new window.CustomEvent('dragenter'));
    expect(document.querySelector('.drop_zone').classList.contains('dropping')).toBeTruthy();

    document.dispatchEvent(new window.CustomEvent('mouseleave'));
    expect(document.querySelector('.drop_zone').classList.contains('dropping')).toBeFalsy();
  });
});
