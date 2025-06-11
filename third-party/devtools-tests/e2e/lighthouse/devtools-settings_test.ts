// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import * as path from 'path';

import {expectError} from '../../conductor/events.js';
import {
  getBrowserAndPages,
  waitFor,
  waitForAria,
  waitForElementWithTextContent,
} from '../../shared/helper.js';

import {openDeviceToolbar, reloadDockableFrontEnd, selectDevice} from '../helpers/emulation-helpers.js';
import {
  clickStartButton,
  getTargetViewport,
  navigateToLighthouseTab,
  selectCategories,
  waitForResult,
} from '../helpers/lighthouse-helpers.js';

// This test will fail (by default) in headful mode, as the target page never gets painted.
// To resolve this when debugging, just make sure the target page is visible during the lighthouse run.

const IPAD_MINI_LANDSCAPE_VIEWPORT_DIMENSIONS = {
  innerHeight: 768,
  innerWidth: 1024,
  outerHeight: 768,
  outerWidth: 1024,
  devicePixelRatio: 2,
};

describe('DevTools', function() {
  // The tests in this suite are particularly slow
  if (this.timeout() !== 0) {
    this.timeout(60_000);
  }

  beforeEach(async () => {
    // https://github.com/GoogleChrome/lighthouse/issues/14572
    expectError(/Request CacheStorage\.requestCacheNames failed/);

    // https://bugs.chromium.org/p/chromium/issues/detail?id=1357791
    expectError(/Protocol Error: the message with wrong session id/);
    expectError(/Protocol Error: the message with wrong session id/);
    expectError(/Protocol Error: the message with wrong session id/);
    expectError(/Protocol Error: the message with wrong session id/);
    expectError(/Protocol Error: the message with wrong session id/);
  });

  describe('request blocking', () => {
    // Start blocking *.css
    // Ideally this would be done with UI manipulation, but it'd be less reliable AND
    // the designated tests in network-request-blocking-panel_test.ts are skipped by default due to flakiness.
    beforeEach(async () => {
      const {frontend} = getBrowserAndPages();
      await frontend.evaluate(`(async () => {
        const SDK = await import('./core/sdk/sdk.js');
        const networkManager = SDK.NetworkManager.MultitargetNetworkManager.instance();
        networkManager.setBlockingEnabled(true);
        networkManager.setBlockedPatterns([{enabled: true, url: '*.css'}]);
      })()`);
    });

    // Reset request blocking state
    afterEach(async () => {
      const {frontend} = getBrowserAndPages();
      await frontend.evaluate(`(async () => {
        const SDK = await import('./core/sdk/sdk.js');
        const networkManager = SDK.NetworkManager.MultitargetNetworkManager.instance();
        networkManager.setBlockingEnabled(false);
        networkManager.setBlockedPatterns([]);
      })()`);
    });

    it('is respected during a lighthouse run', async () => {
      await navigateToLighthouseTab('lighthouse/hello.html');

      await selectCategories(['performance']);

      await clickStartButton();

      const {lhr} = await waitForResult();

      const requests = lhr.audits['network-requests'].details.items;

      const trimmedRequests = requests.map((item: Record<string, unknown>) => {
        return {
          url: typeof item.url === 'string' && path.basename(item.url),
          statusCode: item.statusCode,
        };
      });

      // An extra basic.css request with status code -1 appears, but only in e2e tests
      // This test is made more lenient since this only happens in the e2e environment
      // b/359984292
      assert.deepStrictEqual(trimmedRequests[0], {url: 'hello.html', statusCode: 200});
      assert.deepStrictEqual(trimmedRequests[1], {url: 'basic.css', statusCode: -1});
    });
  });

  describe('device emulation', () => {
    beforeEach(async function() {
      await reloadDockableFrontEnd();
      await waitFor('.tabbed-pane-left-toolbar');
      await openDeviceToolbar();
    });

    it('is restored after a lighthouse run', async () => {
      // Use iPad Mini in landscape mode and custom zoom.
      await selectDevice('iPad Mini');
      const rotateButton = await waitForAria('Rotate');
      await rotateButton.click();
      const zoomButton = await waitForAria('Zoom');
      await zoomButton.click();
      const zoom75 = await waitForElementWithTextContent('75%');
      await zoom75.click();

      assert.deepStrictEqual(await getTargetViewport(), IPAD_MINI_LANDSCAPE_VIEWPORT_DIMENSIONS);

      await navigateToLighthouseTab('lighthouse/hello.html');
      await selectCategories(['performance']);
      await clickStartButton();

      const {artifacts} = await waitForResult();
      assert.deepStrictEqual(artifacts.ViewportDimensions, {
        innerHeight: 823,
        innerWidth: 412,
        outerHeight: 823,
        outerWidth: 412,
        devicePixelRatio: 1.75,
      });

      const zoomText = await zoomButton.evaluate(zoomButtonEl => zoomButtonEl.textContent);
      assert.strictEqual(zoomText, '75%');
      assert.deepStrictEqual(await getTargetViewport(), IPAD_MINI_LANDSCAPE_VIEWPORT_DIMENSIONS);
    });
  });
});
