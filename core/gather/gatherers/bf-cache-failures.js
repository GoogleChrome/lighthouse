/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import BaseGatherer from '../base-gatherer.js';
import {waitForFrameNavigated, waitForLoadEvent} from '../driver/wait-for-condition.js';
import DevtoolsLog from './devtools-log.js';

const AFTER_RETURN_TIMEOUT = 100;
const TEMP_PAGE_PAUSE_TIMEOUT = 100;

class BFCacheFailures extends BaseGatherer {
  /** @type {LH.Gatherer.GathererMeta<'DevtoolsLog'>} */
  meta = {
    supportedModes: ['navigation', 'timespan'],
    dependencies: {DevtoolsLog: DevtoolsLog.symbol},
  };

  /**
   * @param {LH.Crdp.Page.BackForwardCacheNotRestoredExplanation[]} errorList
   * @return {LH.Artifacts.BFCacheFailure}
   */
  static processBFCacheEventList(errorList) {
    /** @type {LH.Artifacts.BFCacheNotRestoredReasonsTree} */
    const notRestoredReasonsTree = {
      Circumstantial: {},
      PageSupportNeeded: {},
      SupportPending: {},
    };

    for (const err of errorList) {
      const bfCacheErrorsMap = notRestoredReasonsTree[err.type];
      bfCacheErrorsMap[err.reason] = [];
    }

    return {notRestoredReasonsTree};
  }

  /**
   * @param {LH.Crdp.Page.BackForwardCacheNotRestoredExplanationTree} errorTree
   * @return {LH.Artifacts.BFCacheFailure}
   */
  static processBFCacheEventTree(errorTree) {
    /** @type {LH.Artifacts.BFCacheNotRestoredReasonsTree} */
    const notRestoredReasonsTree = {
      Circumstantial: {},
      PageSupportNeeded: {},
      SupportPending: {},
    };

    /**
     * @param {LH.Crdp.Page.BackForwardCacheNotRestoredExplanationTree} node
     */
    function traverse(node) {
      for (const error of node.explanations) {
        const bfCacheErrorsMap = notRestoredReasonsTree[error.type];
        const frameUrls = bfCacheErrorsMap[error.reason] || [];
        frameUrls.push(node.url);
        bfCacheErrorsMap[error.reason] = frameUrls;
      }

      for (const child of node.children) {
        traverse(child);
      }
    }

    traverse(errorTree);

    return {notRestoredReasonsTree};
  }

  /**
   * @param {LH.Crdp.Page.BackForwardCacheNotUsedEvent|undefined} event
   * @return {LH.Artifacts.BFCacheFailure}
   */
  static processBFCacheEvent(event) {
    if (event?.notRestoredExplanationsTree) {
      return BFCacheFailures.processBFCacheEventTree(event.notRestoredExplanationsTree);
    }
    return BFCacheFailures.processBFCacheEventList(event?.notRestoredExplanations || []);
  }

  /**
   * @param {LH.Gatherer.Context} context
   * @return {Promise<LH.Crdp.Page.BackForwardCacheNotUsedEvent|undefined>}
   */
  async activelyCollectBFCacheEvent(context) {
    const session = context.driver.defaultSession;

    /** @type {LH.Crdp.Page.BackForwardCacheNotUsedEvent|undefined} */
    let bfCacheEvent = undefined;

    /**
     * @param {LH.Crdp.Page.BackForwardCacheNotUsedEvent} event
     */
    function onBfCacheNotUsed(event) {
      bfCacheEvent = event;
    }

    session.on('Page.backForwardCacheNotUsed', onBfCacheNotUsed);

    const history = await session.sendCommand('Page.getNavigationHistory');
    const entry = history.entries[history.currentIndex];

    // In theory, we should be able to use about:blank here
    // but that sometimes produces BrowsingInstanceNotSwapped failures.
    // DevTools uses chrome://terms as it's temporary page so we should stick with that.
    // https://github.com/GoogleChrome/lighthouse/issues/14665
    await Promise.all([
      session.sendCommand('Page.navigate', {url: 'chrome://terms'}),
      // DevTools e2e tests can sometimes fail on the next command if we progress too fast.
      // The only reliable way to prevent this is to wait for an arbitrary period of time after load.
      waitForLoadEvent(session, TEMP_PAGE_PAUSE_TIMEOUT).promise,
    ]);

    const [, frameNavigatedEvent] = await Promise.all([
      session.sendCommand('Page.navigateToHistoryEntry', {entryId: entry.id}),
      waitForFrameNavigated(session).promise,
    ]);

    // The bfcache failure event is not necessarily emitted by this point.
    // If we are expecting a bfcache failure event but haven't seen one, we should wait for it.
    // This timeout also allows the environment to "settle" before gathering enters it's cleanup phase.
    await new Promise(resolve => setTimeout(resolve, AFTER_RETURN_TIMEOUT));

    // If we still can't get the failure reasons after the timeout we should fail loudly,
    // otherwise this gatherer will return no failures when there should be failures.
    if (frameNavigatedEvent.type !== 'BackForwardCacheRestore' && !bfCacheEvent) {
      throw new Error('bfcache failed but the failure reasons were not emitted in time');
    }

    session.off('Page.backForwardCacheNotUsed', onBfCacheNotUsed);

    return bfCacheEvent;
  }

  /**
   * @param {LH.Gatherer.Context<'DevtoolsLog'>} context
   * @return {LH.Crdp.Page.BackForwardCacheNotUsedEvent[]}
   */
  passivelyCollectBFCacheEvents(context) {
    const events = [];
    for (const event of context.dependencies.DevtoolsLog) {
      if (event.method === 'Page.backForwardCacheNotUsed') {
        events.push(event.params);
      }
    }
    return events;
  }

  /**
   * @param {LH.Gatherer.Context<'DevtoolsLog'>} context
   * @return {Promise<LH.Artifacts['BFCacheFailures']>}
   */
  async getArtifact(context) {
    const events = this.passivelyCollectBFCacheEvents(context);
    if (context.gatherMode === 'navigation' && !context.settings.usePassiveGathering) {
      const activelyCollectedEvent = await this.activelyCollectBFCacheEvent(context);
      if (activelyCollectedEvent) events.push(activelyCollectedEvent);
    }

    return events.map(BFCacheFailures.processBFCacheEvent);
  }
}

export default BFCacheFailures;

