/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import BFCacheFailures from '../../../gather/gatherers/bf-cache-failures.js';
import {createMockContext} from '../mock-driver.js';
import {flushAllTimersAndMicrotasks, timers} from '../../test-utils.js';

/**
 * @returns {LH.Crdp.Page.BackForwardCacheNotUsedEvent}
 */
function createMockBfCacheEvent() {
  return {
    loaderId: 'LOADERID',
    frameId: 'FRAMEID',
    notRestoredExplanations: [
      {type: 'PageSupportNeeded', reason: 'AppBanner'},
      {type: 'Circumstantial', reason: 'BackForwardCacheDisabled'},
      {type: 'SupportPending', reason: 'CacheControlNoStore'},
    ],
    notRestoredExplanationsTree: {
      url: 'https://example.com',
      explanations: [
        {type: 'PageSupportNeeded', reason: 'AppBanner'},
        {type: 'Circumstantial', reason: 'BackForwardCacheDisabled'},
      ],
      children: [
        {
          url: 'https://frame.com',
          explanations: [
            {type: 'PageSupportNeeded', reason: 'AppBanner'},
            {type: 'SupportPending', reason: 'CacheControlNoStore'},
          ],
          children: [],
        },
      ],
    },
  };
}

describe('BFCacheFailures', () => {
  /** @type {LH.Gatherer.Context<'DevtoolsLog'>} */
  let context;
  let mockContext = createMockContext();
  /** @type {LH.Crdp.Page.BackForwardCacheNotUsedEvent|undefined} */
  let mockActiveBfCacheEvent;
  let eventEmitDelay = 0;
  /** @type {Partial<LH.Crdp.Page.FrameNavigatedEvent>} */
  let frameNavigatedEvent = {type: 'Navigation'};

  beforeEach(() => {
    mockContext = createMockContext();
    // @ts-expect-error contains DT log dependency
    context = mockContext.asContext();

    mockActiveBfCacheEvent = createMockBfCacheEvent();
    eventEmitDelay = 0;

    context.dependencies.DevtoolsLog = [];

    mockContext.driver.defaultSession.sendCommand
      .mockResponse('Page.getNavigationHistory', {
        currentIndex: 1,
        entries: [
          {id: 0},
          {id: 1},
        ],
      })
      .mockResponse('Page.navigate', undefined)
      .mockResponse('Page.navigateToHistoryEntry', () => {
        if (mockActiveBfCacheEvent) {
          const listener =
            mockContext.driver.defaultSession.on.findListener('Page.backForwardCacheNotUsed');
          setTimeout(() => {
            listener(mockActiveBfCacheEvent);
          }, eventEmitDelay);
        }
      });

    frameNavigatedEvent = {type: 'Navigation'};
    mockContext.driver.defaultSession.once
      .mockEvent('Page.loadEventFired', {})
      .mockEvent('Page.frameNavigated', frameNavigatedEvent);
  });

  it('actively triggers bf cache in navigation mode', async () => {
    const gatherer = new BFCacheFailures();
    const artifact = await gatherer.getArtifact(context);

    expect(mockContext.driver.defaultSession.sendCommand)
      .toHaveBeenCalledWith('Page.navigate', {url: 'chrome://terms'});
    expect(mockContext.driver.defaultSession.sendCommand)
      .toHaveBeenCalledWith('Page.navigateToHistoryEntry', {entryId: 1});

    expect(artifact).toHaveLength(1);
    expect(artifact[0].notRestoredReasonsTree).toEqual({
      PageSupportNeeded: {
        AppBanner: ['https://example.com', 'https://frame.com'],
      },
      Circumstantial: {
        BackForwardCacheDisabled: ['https://example.com'],
      },
      SupportPending: {
        CacheControlNoStore: ['https://frame.com'],
      },
    });
  });

  it('passively collects bf cache events in navigation mode when passive flag set', async () => {
    context.gatherMode = 'navigation';
    context.dependencies.DevtoolsLog = [];
    context.settings.usePassiveGathering = true;

    const gatherer = new BFCacheFailures();
    const artifact = await gatherer.getArtifact(context);

    expect(mockContext.driver.defaultSession.sendCommand)
      .not.toHaveBeenCalledWith('Page.navigate', {url: 'chrome://terms'});
    expect(mockContext.driver.defaultSession.sendCommand)
      .not.toHaveBeenCalledWith('Page.navigateToHistoryEntry', {entryId: 1});

    expect(artifact).toHaveLength(0);
  });

  it('passively collects bf cache event in timespan mode', async () => {
    context.gatherMode = 'timespan';
    context.dependencies.DevtoolsLog = [{
      method: 'Page.backForwardCacheNotUsed',
      params: createMockBfCacheEvent(),
      targetType: 'page',
    }];

    const gatherer = new BFCacheFailures();
    const artifact = await gatherer.getArtifact(context);

    expect(mockContext.driver.defaultSession.sendCommand)
      .not.toHaveBeenCalledWith('Page.navigate', {url: 'chrome://terms'});
    expect(mockContext.driver.defaultSession.sendCommand)
      .not.toHaveBeenCalledWith('Page.navigateToHistoryEntry', {entryId: 1});

    expect(artifact).toHaveLength(1);
    expect(artifact[0].notRestoredReasonsTree).toEqual({
      PageSupportNeeded: {
        AppBanner: ['https://example.com', 'https://frame.com'],
      },
      Circumstantial: {
        BackForwardCacheDisabled: ['https://example.com'],
      },
      SupportPending: {
        CacheControlNoStore: ['https://frame.com'],
      },
    });
  });

  it('constructs a tree with no frame urls if no frame tree is provided', async () => {
    delete mockActiveBfCacheEvent?.notRestoredExplanationsTree;

    const gatherer = new BFCacheFailures();
    const artifact = await gatherer.getArtifact(context);

    expect(mockContext.driver.defaultSession.sendCommand)
      .toHaveBeenCalledWith('Page.navigate', {url: 'chrome://terms'});
    expect(mockContext.driver.defaultSession.sendCommand)
      .toHaveBeenCalledWith('Page.navigateToHistoryEntry', {entryId: 1});

    expect(artifact).toHaveLength(1);
    expect(artifact[0].notRestoredReasonsTree).toEqual({
      PageSupportNeeded: {
        AppBanner: [],
      },
      Circumstantial: {
        BackForwardCacheDisabled: [],
      },
      SupportPending: {
        CacheControlNoStore: [],
      },
    });
  });

  it('returns an empty list if no events were found passively or actively', async () => {
    mockActiveBfCacheEvent = undefined;
    frameNavigatedEvent.type = 'BackForwardCacheRestore';

    const gatherer = new BFCacheFailures();
    const artifact = await gatherer.getArtifact(context);

    expect(mockContext.driver.defaultSession.sendCommand)
      .toHaveBeenCalledWith('Page.navigate', {url: 'chrome://terms'});
    expect(mockContext.driver.defaultSession.sendCommand)
      .toHaveBeenCalledWith('Page.navigateToHistoryEntry', {entryId: 1});

    expect(artifact).toHaveLength(0);
  });

  describe('handles event after frameNavigated', () => {
    beforeEach(() => timers.useFakeTimers());
    afterEach(() => timers.dispose());

    it('and resolves if emitted before the timeout', async () => {
      eventEmitDelay = 55;

      const gatherer = new BFCacheFailures();
      const artifactPromise = gatherer.getArtifact(context);

      await flushAllTimersAndMicrotasks(210);

      await expect(artifactPromise).resolves.toHaveLength(1);
    });

    it('and rejects if emitted after the timeout', async () => {
      eventEmitDelay = 105;

      const gatherer = new BFCacheFailures();
      const artifactPromise = gatherer.getArtifact(context);

      await flushAllTimersAndMicrotasks(210);

      await expect(artifactPromise).rejects.toThrow(
        'bfcache failed but the failure reasons were not emitted in time'
      );
    });
  });
});
