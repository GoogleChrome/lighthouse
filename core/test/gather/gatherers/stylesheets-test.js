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
      .mockResponse('CSS.getStyleSheetText', {text: 'CSS text 2'})
      .mockResponse('CSS.disable')
      .mockResponse('DOM.disable');

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
      .mockResponse('CSS.getStyleSheetText', {text: 'CSS text 2'})
      .mockResponse('CSS.disable')
      .mockResponse('DOM.disable');

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
      .mockResponse('CSS.getStyleSheetText', {text: 'CSS text 2'})
      .mockResponse('CSS.disable')
      .mockResponse('DOM.disable');

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
      .mockResponse('CSS.startRuleUsageTracking')
      .mockResponse('CSS.getStyleSheetText', {text: 'CSS text 1'})
      .mockResponse('CSS.getStyleSheetText', {text: 'CSS text 1'})
      .mockResponse('CSS.stopRuleUsageTracking', {
        ruleUsage: [
          {styleSheetId: '1', used: true},
        ],
      })
      .mockResponse('CSS.disable')
      .mockResponse('DOM.disable');

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
});
