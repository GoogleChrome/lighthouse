// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

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
  // TODO (liviurau): Update clearSiteData helper to work in docked mode
  setup({dockingMode: 'undocked'});

  it('shows a button to generate a new report', async ({devToolsPage, inspectedPage}) => {
    await navigateToLighthouseTab('empty.html', devToolsPage, inspectedPage);

    const disabled = await isGenerateReportButtonDisabled(devToolsPage);
    const helpText = await getHelpText(devToolsPage);
    assert.isFalse(disabled, 'The Generate Report button should not be disabled');
    assert.strictEqual(helpText, '');
  });

  it('disables the start button when no categories are selected', async ({devToolsPage, inspectedPage}) => {
    await navigateToLighthouseTab('empty.html', devToolsPage, inspectedPage);

    await selectCategories([], devToolsPage);

    const disabled = await isGenerateReportButtonDisabled(devToolsPage);
    const helpText = await getHelpText(devToolsPage);
    assert.isTrue(disabled, 'The Generate Report button should be disabled');
    assert.strictEqual(helpText, 'At least one category must be selected.');
  });

  it('enables the start button if only one category is selected', async ({devToolsPage, inspectedPage}) => {
    await navigateToLighthouseTab('empty.html', devToolsPage, inspectedPage);

    await selectCategories(['performance'], devToolsPage);

    const disabled = await isGenerateReportButtonDisabled(devToolsPage);
    const helpText = await getHelpText(devToolsPage);
    assert.isFalse(disabled, 'The Generate Report button should be enabled');
    assert.strictEqual(helpText, '');
  });

  it('disables the start button for internal pages in navigation mode', async ({devToolsPage, inspectedPage}) => {
    await navigateToLighthouseTab(undefined, devToolsPage, inspectedPage);
    await inspectedPage.goTo('about:blank');

    const disabled = await isGenerateReportButtonDisabled(devToolsPage);
    const helpText = await getHelpText(devToolsPage);
    assert.isTrue(disabled, 'The Generate Report button should be disabled');
    assert.strictEqual(helpText, 'Can only audit pages on HTTP or HTTPS. Navigate to a different page.');
  });

  it('disables the start button for internal pages in non-navigation mode', async ({devToolsPage, inspectedPage}) => {
    await navigateToLighthouseTab(undefined, devToolsPage, inspectedPage);
    await inspectedPage.goTo('about:blank');
    await selectMode('timespan', devToolsPage);

    const disabled = await isGenerateReportButtonDisabled(devToolsPage);
    const helpText = await getHelpText(devToolsPage);
    assert.isFalse(disabled, 'The Generate Report button should be enabled');
    assert.strictEqual(helpText, '');
  });

  it('shows generate report button even when navigating to an unreachable page',
     async ({devToolsPage, inspectedPage}) => {
       await navigateToLighthouseTab('empty.html', devToolsPage, inspectedPage);

       await inspectedPage.goToResource('network/unreachable.rawresponse');
       const disabled = await isGenerateReportButtonDisabled(devToolsPage);
       assert.isTrue(disabled, 'The Generate Report button should be disabled');
     });

  it('displays warning if important data may affect performance', async ({devToolsPage, inspectedPage}) => {
    // e2e tests in application/ create indexeddb items and don't clean up after themselves
    await clearSiteData(devToolsPage, inspectedPage);

    await navigateToLighthouseTab('empty.html', devToolsPage, inspectedPage);

    let warningElem = await devToolsPage.waitFor('.lighthouse-warning-text.hidden');
    const warningText1 = await warningElem.evaluate(node => node.textContent?.trim());
    assert.strictEqual(warningText1, '');

    await navigateToLighthouseTab('lighthouse/lighthouse-storage.html', devToolsPage, inspectedPage);
    // Wait for storage state to lazily update
    await waitForStorageUsage(quota => quota > 0, devToolsPage);

    warningElem = await devToolsPage.waitFor('.lighthouse-warning-text:not(.hidden)');
    const expected =
        'There may be stored data affecting loading performance in this location: IndexedDB. Audit this page in an incognito window to prevent those resources from affecting your scores.';
    const warningText2 = await warningElem.evaluate(node => node.textContent?.trim());
    assert.strictEqual(warningText2, expected);
  });
});
