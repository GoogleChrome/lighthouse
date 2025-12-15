// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {expectError} from '../../conductor/events.js';
import {
  clickStartButton,
  getAuditsBreakdown,
  getServiceWorkerCount,
  navigateToLighthouseTab,
  registerServiceWorker,
  selectMode,
  waitForResult,
} from '../../e2e/helpers/lighthouse-helpers.js';

// This test will fail (by default) in headful mode, as the target page never gets painted.
// To resolve this when debugging, just make sure the target page is visible during the lighthouse run.

describe('Snapshot', function() {
  // The tests in this suite are particularly slow
  if (this.timeout() !== 0) {
    this.timeout(60_000);
  }

  it('successfully returns a Lighthouse report for the page state', async ({devToolsPage, inspectedPage}) => {
    // https://github.com/GoogleChrome/lighthouse/issues/14572
    expectError(/Request CacheStorage\.requestCacheNames failed/);

    // https://bugs.chromium.org/p/chromium/issues/detail?id=1357791
    expectError(/Protocol Error: the message with wrong session id/);
    expectError(/Protocol Error: the message with wrong session id/);
    expectError(/Protocol Error: the message with wrong session id/);
    expectError(/Protocol Error: the message with wrong session id/);
    expectError(/Protocol Error: the message with wrong session id/);

    await navigateToLighthouseTab('lighthouse/hello.html', devToolsPage, inspectedPage);
    await registerServiceWorker(inspectedPage);

    await inspectedPage.evaluate(() => {
      const makeTextFieldBtn = document.querySelector('button');
      if (!makeTextFieldBtn) {
        throw new Error('Button not found');
      }
      makeTextFieldBtn.click();
      makeTextFieldBtn.click();
      makeTextFieldBtn.click();
    });

    let numNavigations = 0;
    inspectedPage.page.on('framenavigated', () => ++numNavigations);

    await selectMode('snapshot', devToolsPage);
    await clickStartButton(devToolsPage);

    const {lhr, artifacts, reportEl} = await waitForResult(devToolsPage, inspectedPage);

    assert.strictEqual(numNavigations, 0);

    assert.strictEqual(lhr.gatherMode, 'snapshot');

    assert.deepEqual(artifacts.ViewportDimensions, {
      innerHeight: 823,
      innerWidth: 412,
      outerHeight: 823,
      outerWidth: 412,
      devicePixelRatio: 1.75,
    });

    const {auditResults, erroredAudits, failedAudits} = getAuditsBreakdown(lhr);
    assert.lengthOf(auditResults, 84);
    assert.deepEqual(erroredAudits, []);
    assert.deepEqual(failedAudits.map(audit => audit.id), [
      'document-title',
      'html-has-lang',
      'label',
      'landmark-one-main',
      'target-size',
      'meta-description',
    ]);

    // These a11y violations are not present on initial page load.
    assert.lengthOf(lhr.audits['label'].details.items, 3);

    // No trace was collected in snapshot mode.
    const viewTrace = await devToolsPage.$textContent('View Trace', reportEl);
    assert.isNull(viewTrace);
    const viewOriginalTrace = await devToolsPage.$textContent('View Original Trace', reportEl);
    assert.isNull(viewOriginalTrace);

    // Ensure service worker is not cleared in snapshot mode.
    assert.strictEqual(await getServiceWorkerCount(inspectedPage), 1);
  });
});
