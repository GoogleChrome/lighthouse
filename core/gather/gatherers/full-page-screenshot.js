/**
 * @license Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* globals window getBoundingClientRect requestAnimationFrame */

import BaseGatherer from '../base-gatherer.js';
import * as emulation from '../../lib/emulation.js';
import {pageFunctions} from '../../lib/page-functions.js';
import {waitForNetworkIdle} from '../driver/wait-for-condition.js';

// JPEG quality setting
// Exploration and examples of reports using different quality settings: https://docs.google.com/document/d/1ZSffucIca9XDW2eEwfoevrk-OTl7WQFeMf0CgeJAA8M/edit#
// Note: this analysis was done for JPEG, but now we use WEBP.
const FULL_PAGE_SCREENSHOT_QUALITY = process.env.LH_FPS_TEST ? 100 : 30;
// webp currently cant do lossless encoding, so to help tests switch to png
// Remove when this is resolved: https://bugs.chromium.org/p/chromium/issues/detail?id=1469183
const FULL_PAGE_SCREENSHOT_FORMAT = process.env.LH_FPS_TEST ? 'png' : 'webp';

// https://developers.google.com/speed/webp/faq#what_is_the_maximum_size_a_webp_image_can_be
const MAX_WEBP_SIZE = 16383;

/**
 * @template {string} S
 * @param {S} str
 */
function kebabCaseToCamelCase(str) {
  return /** @type {LH.Util.KebabToCamelCase<S>} */ (
    str.replace(/(-\w)/g, m => m[1].toUpperCase())
  );
}

/* c8 ignore start */

function getObservedDeviceMetrics() {
  // Convert the Web API's kebab case (landscape-primary) to camel case (landscapePrimary).
  const screenOrientationType = kebabCaseToCamelCase(window.screen.orientation.type);
  return {
    width: window.outerWidth,
    height: window.outerHeight,
    screenOrientation: {
      type: screenOrientationType,
      angle: window.screen.orientation.angle,
    },
    deviceScaleFactor: window.devicePixelRatio,
  };
}

function waitForDoubleRaf() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
}

/* c8 ignore stop */

class FullPageScreenshot extends BaseGatherer {
  /** @type {LH.Gatherer.GathererMeta} */
  meta = {
    supportedModes: ['snapshot', 'timespan', 'navigation'],
  };

  /**
   * @param {LH.Gatherer.Context} context
   */
  waitForNetworkIdle(context) {
    const session = context.driver.defaultSession;
    const networkMonitor = context.driver.networkMonitor;
    return waitForNetworkIdle(session, networkMonitor, {
      pretendDCLAlreadyFired: true,
      networkQuietThresholdMs: 1000,
      busyEvent: 'network-critical-busy',
      idleEvent: 'network-critical-idle',
      isIdle: recorder => recorder.isCriticalIdle(),
    });
  }

  /**
   * @param {LH.Gatherer.Context} context
   * @param {{height: number, width: number, mobile: boolean}} deviceMetrics
   */
  async _resizeViewport(context, deviceMetrics) {
    const session = context.driver.defaultSession;
    const metrics = await session.sendCommand('Page.getLayoutMetrics');

    // Height should be as tall as the content.
    // Scale the emulated height to reach the content height.
    const fullHeight = Math.round(
      deviceMetrics.height *
      metrics.cssContentSize.height /
      metrics.cssLayoutViewport.clientHeight
    );
    const height = Math.min(fullHeight, MAX_WEBP_SIZE);

    const waitForNetworkIdleResult = this.waitForNetworkIdle(context);

    await session.sendCommand('Emulation.setDeviceMetricsOverride', {
      mobile: deviceMetrics.mobile,
      deviceScaleFactor: 1,
      height,
      width: 0, // Leave width unchanged
    });

    // Now that the viewport is taller, give the page some time to fetch new resources that
    // are now in view.
    await Promise.race([
      new Promise(resolve => setTimeout(resolve, 1000 * 5)),
      waitForNetworkIdleResult.promise,
    ]);
    waitForNetworkIdleResult.cancel();

    // Now that new resources are (probably) fetched, wait long enough for a layout.
    await context.driver.executionContext.evaluate(waitForDoubleRaf, {args: []});
  }

  /**
   * @param {LH.Gatherer.Context} context
   * @return {Promise<LH.Result.FullPageScreenshot['screenshot']>}
   */
  async _takeScreenshot(context) {
    const [metrics, result] = await Promise.all([
      context.driver.defaultSession.sendCommand('Page.getLayoutMetrics'),
      context.driver.defaultSession.sendCommand('Page.captureScreenshot', {
        format: FULL_PAGE_SCREENSHOT_FORMAT,
        quality: FULL_PAGE_SCREENSHOT_QUALITY,
      }),
    ]);
    const data = `data:image/${FULL_PAGE_SCREENSHOT_FORMAT};base64,` + result.data;

    return {
      data,
      width: metrics.cssVisualViewport.clientWidth,
      height: metrics.cssVisualViewport.clientHeight,
    };
  }

  /**
   * Gatherers can collect details about DOM nodes, including their position on the page.
   * Layout shifts occuring after a gatherer runs can cause these positions to be incorrect,
   * resulting in a poor experience for element screenshots.
   * `getNodeDetails` maintains a collection of DOM objects in the page, which we can iterate
   * to re-collect the bounding client rectangle.
   * @see pageFunctions.getNodeDetails
   * @param {LH.Gatherer.Context} context
   * @return {Promise<LH.Result.FullPageScreenshot['nodes']>}
   */
  async _resolveNodes(context) {
    function resolveNodes() {
      /** @type {LH.Result.FullPageScreenshot['nodes']} */
      const nodes = {};
      if (!window.__lighthouseNodesDontTouchOrAllVarianceGoesAway) return nodes;

      const lhIdToElements = window.__lighthouseNodesDontTouchOrAllVarianceGoesAway;
      for (const [node, id] of lhIdToElements.entries()) {
        // @ts-expect-error - getBoundingClientRect put into scope via stringification
        const rect = getBoundingClientRect(node);
        nodes[id] = {id: node.id, ...rect};
      }

      return nodes;
    }

    /**
     * @param {{useIsolation: boolean}} _
     */
    function resolveNodesInPage({useIsolation}) {
      return context.driver.executionContext.evaluate(resolveNodes, {
        args: [],
        useIsolation,
        deps: [pageFunctions.getBoundingClientRect],
      });
    }

    // Collect nodes with the page context (`useIsolation: false`) and with our own, reused
    // context (`useIsolation: true`). Gatherers use both modes when collecting node details,
    // so we must do the same here too.
    const pageContextResult = await resolveNodesInPage({useIsolation: false});
    const isolatedContextResult = await resolveNodesInPage({useIsolation: true});
    return {...pageContextResult, ...isolatedContextResult};
  }

  /**
   * @param {LH.Gatherer.Context} context
   * @return {Promise<LH.Artifacts['FullPageScreenshot']>}
   */
  async getArtifact(context) {
    const session = context.driver.defaultSession;
    const executionContext = context.driver.executionContext;
    const settings = context.settings;
    const lighthouseControlsEmulation = !settings.screenEmulation.disabled;

    // Make a copy so we don't modify the config settings.
    /** @type {{width: number, height: number, deviceScaleFactor: number, mobile: boolean}} */
    const deviceMetrics = {...settings.screenEmulation};

    try {
      if (!settings.usePassiveGathering) {
        // In case some other program is controlling emulation, remember what the device looks like now and reset after gatherer is done.
        // If we're gathering with mobile screenEmulation on (overlay scrollbars, etc), continue to use that for this screenshot.
        if (!lighthouseControlsEmulation) {
          const observedDeviceMetrics = await executionContext.evaluate(getObservedDeviceMetrics, {
            args: [],
            useIsolation: true,
            deps: [kebabCaseToCamelCase],
          });
          deviceMetrics.height = observedDeviceMetrics.height;
          deviceMetrics.width = observedDeviceMetrics.width;
          deviceMetrics.deviceScaleFactor = observedDeviceMetrics.deviceScaleFactor;
          // If screen emulation is disabled, use formFactor to determine if we are on mobile.
          deviceMetrics.mobile = settings.formFactor === 'mobile';
        }

        await this._resizeViewport(context, deviceMetrics);
      }

      // Issue both commands at once, to reduce the chance that the page changes between capturing
      // a screenshot and resolving the nodes. https://github.com/GoogleChrome/lighthouse/pull/14763
      const [screenshot, nodes] =
        await Promise.all([this._takeScreenshot(context), this._resolveNodes(context)]);
      return {
        screenshot,
        nodes,
      };
    } finally {
      if (!settings.usePassiveGathering) {
        // Revert resized page.
        if (lighthouseControlsEmulation) {
          await emulation.emulate(session, settings);
        } else {
          // Best effort to reset emulation to what it was.
          // https://github.com/GoogleChrome/lighthouse/pull/10716#discussion_r428970681
          // TODO: seems like this would be brittle. Should at least work for devtools, but what
          // about scripted puppeteer usages? Better to introduce a "setEmulation" callback
          // in the LH runner api, which for ex. puppeteer consumers would setup puppeteer emulation,
          // and then just call that to reset?
          // https://github.com/GoogleChrome/lighthouse/issues/11122
          await session.sendCommand('Emulation.setDeviceMetricsOverride', {
            mobile: deviceMetrics.mobile,
            deviceScaleFactor: deviceMetrics.deviceScaleFactor,
            height: deviceMetrics.height,
            width: 0, // Leave width unchanged
          });
        }
      }
    }
  }
}

export default FullPageScreenshot;
