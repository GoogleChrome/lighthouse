/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import Stylesheets from '../../../gather/gatherers/stylesheets.js';
import {createMockContext} from '../mock-driver.js';
import {flushAllTimersAndMicrotasks, timers} from '../../test-utils.js';

describe('Stylesheets gatherer', () => {
  before(() => timers.useFakeTimers());
  after(() => timers.dispose());

  it('gets stylesheets', async () => {
    const context = createMockContext();
    context.driver.defaultSession.on
      .mockEvent('CSS.styleSheetAdded', {header: {styleSheetId: '1'}})
      .mockEvent('CSS.styleSheetAdded', {header: {styleSheetId: '2'}});
    context.driver.defaultSession.sendCommand
      .mockResponse('DOM.enable')
      // @ts-expect-error - Force events to emit.
      .mockResponse('CSS.enable', flushAllTimersAndMicrotasks)
      .mockResponse('CSS.getStyleSheetText', {text: 'CSS text 1'})
      .mockResponse('CSS.getStyleSheetText', {text: 'CSS text 2'});

    const gatherer = new Stylesheets();
    await gatherer.startInstrumentation(context.asContext());

    // Force events to emit.
    await flushAllTimersAndMicrotasks(1);

    await gatherer.stopInstrumentation(context.asContext());
    const artifact = await gatherer.getArtifact(context.asContext());

    expect(artifact).toEqual([
      {
        header: {styleSheetId: '1'},
        content: 'CSS text 1',
      },
      {
        header: {styleSheetId: '2'},
        content: 'CSS text 2',
      },
    ]);
  });

  it('gets stylesheets in snapshot mode', async () => {
    const context = createMockContext();
    context.driver.defaultSession.on
      .mockEvent('CSS.styleSheetAdded', {header: {styleSheetId: '1'}})
      .mockEvent('CSS.styleSheetAdded', {header: {styleSheetId: '2'}});
    context.driver.defaultSession.sendCommand
      .mockResponse('DOM.enable')
      // @ts-expect-error - Force events to emit.
      .mockResponse('CSS.enable', flushAllTimersAndMicrotasks)
      .mockResponse('CSS.getStyleSheetText', {text: 'CSS text 1'})
      .mockResponse('CSS.getStyleSheetText', {text: 'CSS text 2'});

    context.gatherMode = 'snapshot';

    const gatherer = new Stylesheets();
    const artifact = await gatherer.getArtifact(context.asContext());

    expect(artifact).toEqual([
      {
        header: {styleSheetId: '1'},
        content: 'CSS text 1',
      },
      {
        header: {styleSheetId: '2'},
        content: 'CSS text 2',
      },
    ]);
  });

  it('ignores sheet if there was an error fetching content', async () => {
    const context = createMockContext();
    context.driver.defaultSession.on
      .mockEvent('CSS.styleSheetAdded', {header: {styleSheetId: '1'}})
      .mockEvent('CSS.styleSheetAdded', {header: {styleSheetId: '2'}});
    context.driver.defaultSession.sendCommand
      .mockResponse('DOM.enable')
      // @ts-expect-error - Force events to emit.
      .mockResponse('CSS.enable', flushAllTimersAndMicrotasks)
      .mockResponse('CSS.getStyleSheetText', () => {
        throw new Error('Sheet not found');
      })
      .mockResponse('CSS.getStyleSheetText', {text: 'CSS text 2'});

    const gatherer = new Stylesheets();
    await gatherer.startInstrumentation(context.asContext());

    // Force events to emit.
    await flushAllTimersAndMicrotasks(1);

    await gatherer.stopInstrumentation(context.asContext());
    const artifact = await gatherer.getArtifact(context.asContext());

    expect(artifact).toEqual([
      {
        header: {styleSheetId: '2'},
        content: 'CSS text 2',
      },
    ]);
  });

  it('dedupes stylesheets', async () => {
    const context = createMockContext();
    context.driver.defaultSession.on
      .mockEvent('CSS.styleSheetAdded', {header: {styleSheetId: '1'}})
      .mockEvent('CSS.styleSheetAdded', {header: {styleSheetId: '1'}});
    context.driver.defaultSession.sendCommand
      .mockResponse('DOM.enable')
      // @ts-expect-error - Force events to emit.
      .mockResponse('CSS.enable', flushAllTimersAndMicrotasks)
      .mockResponse('CSS.getStyleSheetText', {text: 'CSS text 1'})
      .mockResponse('CSS.getStyleSheetText', {text: 'CSS text 1'});

    const gatherer = new Stylesheets();
    await gatherer.startInstrumentation(context.asContext());

    // Force events to emit.
    await flushAllTimersAndMicrotasks(1);

    await gatherer.stopInstrumentation(context.asContext());
    const artifact = await gatherer.getArtifact(context.asContext());

    expect(artifact).toEqual([
      {
        header: {styleSheetId: '1'},
        content: 'CSS text 1',
      },
    ]);
  });

  it('resets CSS domain if already enabled before gathering', async () => {
    const context = createMockContext();
    context.driver.defaultSession.on
      .mockEvent('CSS.styleSheetAdded', {header: {styleSheetId: '1'}});
    context.driver.defaultSession.sendCommand
      .mockResponse('DOM.enable')
      .mockResponse('CSS.enable')
      .mockResponse('DOM.enable')
      .mockResponse('CSS.disable', () => {
        expect(context.driver.defaultSession.on).not.toHaveBeenCalled();
      })
      // @ts-expect-error - Force events to emit.
      .mockResponse('CSS.enable', flushAllTimersAndMicrotasks)
      .mockResponse('CSS.getStyleSheetText', {text: 'CSS text 1'});

    // Simulate an earlier gatherer leaving DOM and CSS enabled.
    await context.driver.defaultSession.sendCommand('DOM.enable');
    await context.driver.defaultSession.sendCommand('CSS.enable');

    const gatherer = new Stylesheets();
    const artifact = await gatherer.getArtifact(context.asContext());

    expect(context.driver.defaultSession.sendCommand.mock.calls.map(c => c[0])).toEqual([
      'DOM.enable',
      'CSS.enable',
      'DOM.enable',
      'CSS.disable',
      'CSS.enable',
      'CSS.getStyleSheetText',
    ]);
    expect(artifact).toEqual([
      {
        header: {styleSheetId: '1'},
        content: 'CSS text 1',
      },
    ]);
  });

  it('cleans up listener and internal state when evaluation fails', async () => {
    const context = createMockContext();
    context.driver.defaultSession.on
      .mockEvent('CSS.styleSheetAdded', {header: {styleSheetId: '1'}});
    context.driver.defaultSession.sendCommand
      .mockResponse('DOM.enable')
      // @ts-expect-error - Force events to emit.
      .mockResponse('CSS.enable', flushAllTimersAndMicrotasks)
      .mockResponse('CSS.getStyleSheetText', {text: 'CSS text 1'});
    context.driver._executionContext.evaluate.mockRejectedValueOnce(
      new Error('Execution context was destroyed')
    );

    const gatherer = new Stylesheets();
    await expect(gatherer.getArtifact(context.asContext())).rejects.toThrow(
      'Execution context was destroyed'
    );

    expect(context.driver.defaultSession.off).toHaveBeenCalledTimes(1);
    expect(context.driver.defaultSession.off).toHaveBeenCalledWith(
      'CSS.styleSheetAdded',
      gatherer._onStylesheetAdded
    );
    expect(gatherer._sheetPromises.size).toBe(0);
    expect(gatherer._session).toBeUndefined();
  });
});
