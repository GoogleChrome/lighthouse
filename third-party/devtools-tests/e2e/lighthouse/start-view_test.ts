// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {goTo, goToResource, waitFor} from '../../shared/helper.js';
import {
  clearSiteData,
  getHelpText,
  isGenerateReportButtonDisabled,
  navigateToLighthouseTab,
  selectCategories,
  selectMode,
  waitForStorageUsage,
} from '../helpers/lighthouse-helpers.js';

describe('The Lighthouse start view', () => {
  it('shows a button to generate a new report', async () => {
    await navigateToLighthouseTab('empty.html');

    const disabled = await isGenerateReportButtonDisabled();
    const helpText = await getHelpText();
    assert.isFalse(disabled, 'The Generate Report button should not be disabled');
    assert.strictEqual(helpText, '');
  });

  it('disables the start button when no categories are selected', async () => {
    await navigateToLighthouseTab('empty.html');

    await selectCategories([]);

    const disabled = await isGenerateReportButtonDisabled();
    const helpText = await getHelpText();
    assert.isTrue(disabled, 'The Generate Report button should be disabled');
    assert.strictEqual(helpText, 'At least one category must be selected.');
  });

  it('enables the start button if only one category is selected', async () => {
    await navigateToLighthouseTab('empty.html');

    await selectCategories(['performance']);

    const disabled = await isGenerateReportButtonDisabled();
    const helpText = await getHelpText();
    assert.isFalse(disabled, 'The Generate Report button should be enabled');
    assert.strictEqual(helpText, '');
  });

  it('disables the start button for internal pages in navigation mode', async () => {
    await navigateToLighthouseTab();
    await goTo('about:blank');

    const disabled = await isGenerateReportButtonDisabled();
    const helpText = await getHelpText();
    assert.isTrue(disabled, 'The Generate Report button should be disabled');
    assert.strictEqual(helpText, 'Can only audit pages on HTTP or HTTPS. Navigate to a different page.');
  });

  it('disables the start button for internal pages in non-navigation mode', async () => {
    await navigateToLighthouseTab();
    await goTo('about:blank');
    await selectMode('timespan');

    const disabled = await isGenerateReportButtonDisabled();
    const helpText = await getHelpText();
    assert.isFalse(disabled, 'The Generate Report button should be enabled');
    assert.strictEqual(helpText, '');
  });

  // Broken on non-debug runs
  it.skip('[crbug.com/1057948] shows generate report button even when navigating to an unreachable page', async () => {
    await navigateToLighthouseTab('empty.html');

    await goToResource('network/unreachable.rawresponse');
    const disabled = await isGenerateReportButtonDisabled();
    assert.isTrue(disabled, 'The Generate Report button should be disabled');
  });

  // Broken in local builds and stressor jobs
  it.skip('[crbug.com/347114248] displays warning if important data may affect performance', async () => {
    // e2e tests in application/ create indexeddb items and don't clean up after themselves
    await clearSiteData();

    await navigateToLighthouseTab('empty.html');

    let warningElem = await waitFor('.lighthouse-warning-text.hidden');
    const warningText1 = await warningElem.evaluate(node => node.textContent?.trim());
    assert.strictEqual(warningText1, '');

    await navigateToLighthouseTab('lighthouse/lighthouse-storage.html');
    // Wait for storage state to lazily update
    await waitForStorageUsage(quota => quota > 0);

    warningElem = await waitFor('.lighthouse-warning-text:not(.hidden)');
    const expected =
        'There may be stored data affecting loading performance in this location: IndexedDB. Audit this page in an incognito window to prevent those resources from affecting your scores.';
    const warningText2 = await warningElem.evaluate(node => node.textContent?.trim());
    assert.strictEqual(warningText2, expected);
  });
});
