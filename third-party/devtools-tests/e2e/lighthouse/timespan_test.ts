// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {expectError} from '../../conductor/events.js';
import {$textContent, getBrowserAndPages} from '../../shared/helper.js';

import {
  clickStartButton,
  endTimespan,
  getAuditsBreakdown,
  getServiceWorkerCount,
  navigateToLighthouseTab,
  registerServiceWorker,
  selectDevice,
  selectMode,
  setThrottlingMethod,
  waitForResult,
  waitForTimespanStarted,
} from '../helpers/lighthouse-helpers.js';

// This test will fail (by default) in headful mode, as the target page never gets painted.
// To resolve this when debugging, just make sure the target page is visible during the lighthouse run.

describe('Timespan', function() {
  // The tests in this suite are particularly slow
  if (this.timeout() !== 0) {
    this.timeout(60_000);
  }

  beforeEach(() => {
    // https://github.com/GoogleChrome/lighthouse/issues/14572
    expectError(/Request CacheStorage\.requestCacheNames failed/);

    // https://bugs.chromium.org/p/chromium/issues/detail?id=1357791
    expectError(/Protocol Error: the message with wrong session id/);
    expectError(/Protocol Error: the message with wrong session id/);
    expectError(/Protocol Error: the message with wrong session id/);
    expectError(/Protocol Error: the message with wrong session id/);
    expectError(/Protocol Error: the message with wrong session id/);
  });

  it('successfully returns a Lighthouse report for user interactions', async () => {
    await navigateToLighthouseTab('lighthouse/hello.html');
    await registerServiceWorker();

    // https://bugs.chromium.org/p/chromium/issues/detail?id=1364257
    await selectDevice('desktop');

    await selectMode('timespan');
    await setThrottlingMethod('simulate');

    let numNavigations = 0;
    const {target, frontend} = getBrowserAndPages();
    target.on('framenavigated', () => ++numNavigations);

    await clickStartButton();
    await waitForTimespanStarted();

    await target.bringToFront();

    await target.click('button');
    await target.click('button');
    await target.click('button');

    // Wait for content to be painted so that the INP event gets emitted.
    // If we don't do this, `frontend.bringToFront()` can disable paints on the target page before INP is emitted.
    await target.evaluate(() => {
      return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    });

    await frontend.bringToFront();

    await endTimespan();

    const {lhr, artifacts, reportEl} = await waitForResult();

    assert.strictEqual(numNavigations, 0);

    assert.strictEqual(lhr.gatherMode, 'timespan');

    // Even though the dropdown is set to "simulate", throttling method should be overriden to "devtools".
    assert.strictEqual(lhr.configSettings.throttlingMethod, 'devtools');

    const {innerWidth, innerHeight, devicePixelRatio} = artifacts.ViewportDimensions;
    // TODO: Figure out why outerHeight can be different depending on OS
    assert.strictEqual(innerHeight, 720);
    assert.strictEqual(innerWidth, 1280);
    assert.strictEqual(devicePixelRatio, 1);

    const {auditResults, erroredAudits, failedAudits} = getAuditsBreakdown(lhr);
    assert.strictEqual(auditResults.length, 44);
    assert.deepStrictEqual(erroredAudits, []);
    assert.deepStrictEqual(failedAudits.map(audit => audit.id), []);

    // Ensure the timespan captured the user interaction.
    const interactionAudit = lhr.audits['interaction-to-next-paint'];
    assert.ok(interactionAudit.score);
    assert.ok(interactionAudit.numericValue);
    assert.strictEqual(interactionAudit.scoreDisplayMode, 'numeric');

    // Trace was collected in timespan mode.
    // Timespan mode can only do DevTools throttling so the text will be "View Trace".
    const viewTraceButton = await $textContent('View Trace', reportEl);
    if (!viewTraceButton) {
      throw new Error('Could not find view trace button');
    }

    // Ensure service worker is not cleared in timespan mode.
    assert.strictEqual(await getServiceWorkerCount(), 1);
  });
});
