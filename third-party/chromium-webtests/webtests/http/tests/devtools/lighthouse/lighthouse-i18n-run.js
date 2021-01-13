// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

(async function() {
  TestRunner.addResult('Tests that Lighthouse report is translated.\n');
  await TestRunner.navigatePromise('resources/lighthouse-basic.html');

  await TestRunner.loadModule('lighthouse_test_runner');
  await TestRunner.showPanel('lighthouse');

  const containerElement = LighthouseTestRunner.getContainerElement();
  const checkboxes = containerElement.querySelectorAll('.checkbox');
  for (const checkbox of checkboxes) {
    if (checkbox.textElement.textContent === 'Performance' || checkbox.textElement.textContent === 'Clear storage') {
      continue;
    }

    if (checkbox.checkboxElement.checked) {
      checkbox.checkboxElement.click();
    }
  }

  TestRunner.override(LighthouseTestRunner._panel()._protocolService, 'getLocales', overrideLookupLocale, true);

  const locales = ['invalid-locale', 'en-XL'];
  function overrideLookupLocale() {
    return locales;
  }

  LighthouseTestRunner.dumpStartAuditState();
  LighthouseTestRunner.getRunButton().click();

  const {lhr} = await LighthouseTestRunner.waitForResults();

  TestRunner.addResult(`resolved to locale ${lhr.configSettings.locale}\n`);

  TestRunner.addResult(`ads-performance group title: ${lhr.categoryGroups['lighthouse-plugin-publisher-ads-ads-performance']?.title}`)

  TestRunner.addResult(`\ni18n footerIssue: "${lhr.i18n.rendererFormattedStrings.footerIssue}"`);
  const footerIssueLink = LighthouseTestRunner.getResultsElement().querySelector('.lh-footer__version_issue');
  TestRunner.addResult(`\nFooter Issue Link Text: "${footerIssueLink.textContent}"`);

  TestRunner.completeTest();
})();
