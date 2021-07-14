/**
 * @license
 * Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

/* globals self DOM PerformanceCategoryRenderer Util I18n DetailsRenderer ElementScreenshotRenderer ReportUIFeatures */

/**
 * Returns all the elements that PSI needs to render the report
 * We expose this helper method to minimize the 'public' API surface of the renderer
 * and allow us to refactor without two-sided patches.
 *
 *   const {scoreGaugeEl, perfCategoryEl, finalScreenshotDataUri} = prepareLabData(
 *      LHResultJsonString,
 *      document
 *   );
 *
 * @param {LH.Result | string} LHResult The stringified version of {LH.Result}
 * @param {Document} document The host page's window.document
 * @return {{scoreGaugeEl: Element, perfCategoryEl: Element, finalScreenshotDataUri: string|null, scoreScaleEl: Element, installFeatures: Function}}
 */
function prepareLabData(LHResult, document) {
  const lhResult = (typeof LHResult === 'string') ?
    /** @type {LH.Result} */ (JSON.parse(LHResult)) : LHResult;

  const dom = new DOM(document);

  // Assume fresh styles needed on every call, so mark all template styles as unused.
  dom.resetTemplates();

  const reportLHR = Util.prepareReportResult(lhResult);
  const i18n = new I18n(reportLHR.configSettings.locale, {
    // Set missing renderer strings to default (english) values.
    ...Util.UIStrings,
    ...reportLHR.i18n.rendererFormattedStrings,
  });
  Util.i18n = i18n;

  const perfCategory = reportLHR.categories.performance;
  if (!perfCategory) throw new Error(`No performance category. Can't make lab data section`);
  if (!reportLHR.categoryGroups) throw new Error(`No category groups found.`);

  // Use custom title and description.
  reportLHR.categoryGroups.metrics.title = Util.i18n.strings.labDataTitle;
  reportLHR.categoryGroups.metrics.description =
      Util.i18n.strings.lsPerformanceCategoryDescription;

  const fullPageScreenshot =
    reportLHR.audits['full-page-screenshot'] && reportLHR.audits['full-page-screenshot'].details &&
    reportLHR.audits['full-page-screenshot'].details.type === 'full-page-screenshot' ?
    reportLHR.audits['full-page-screenshot'].details : undefined;

  const detailsRenderer = new DetailsRenderer(dom, {fullPageScreenshot});
  const perfRenderer = new PerformanceCategoryRenderer(dom, detailsRenderer);
  // PSI environment string will ensure the categoryHeader and permalink elements are excluded
  const perfCategoryEl = perfRenderer.render(perfCategory, reportLHR.categoryGroups, 'PSI');

  const scoreGaugeEl = dom.find('.lh-score__gauge', perfCategoryEl);
  scoreGaugeEl.remove();
  const scoreGaugeWrapperEl = dom.find('.lh-gauge__wrapper', scoreGaugeEl);
  scoreGaugeWrapperEl.classList.add('lh-gauge__wrapper--huge');
  // Remove navigation link on gauge
  scoreGaugeWrapperEl.removeAttribute('href');

  const finalScreenshotDataUri = _getFinalScreenshot(perfCategory);

  const scoreScaleEl = dom.getComponent('scorescale');

  const reportUIFeatures = new ReportUIFeatures(dom);
  reportUIFeatures.json = lhResult;

  /** @param {HTMLElement} reportEl */
  const installFeatures = (reportEl) => {
    if (fullPageScreenshot) {
      ElementScreenshotRenderer.installFullPageScreenshot(
        reportEl, fullPageScreenshot.screenshot);

      // Append the overlay element to a specific part of the DOM so that
      // the sticky tab group element renders correctly. If put in the reportEl
      // like normal, then the sticky header would bleed through the overlay
      // element.
      const screenshotsContainer = document.querySelector('.element-screenshots-container');
      if (!screenshotsContainer) {
        throw new Error('missing .element-screenshots-container');
      }

      const screenshotEl = document.createElement('div');
      screenshotsContainer.append(screenshotEl);
      ElementScreenshotRenderer.installOverlayFeature({
        dom,
        reportEl,
        overlayContainerEl: screenshotEl,
        templateContext: document,
        fullPageScreenshot,
      });
      // Not part of the reportEl, so have to install the feature here too.
      ElementScreenshotRenderer.installFullPageScreenshot(
        screenshotEl, fullPageScreenshot.screenshot);
    }

    const showTreemapApp =
      lhResult.audits['script-treemap-data'] && lhResult.audits['script-treemap-data'].details;
    if (showTreemapApp) {
      reportUIFeatures.addButton({
        container: reportEl.querySelector('.lh-audit-group--metrics'),
        text: Util.i18n.strings.viewTreemapLabel,
        icon: 'treemap',
        onClick: () => ReportUIFeatures.openTreemap(lhResult),
      });
    }
  };

  return {scoreGaugeEl, perfCategoryEl, finalScreenshotDataUri, scoreScaleEl, installFeatures};
}

/**
 * @param {LH.ReportResult.Category} perfCategory
 * @return {null|string}
 */
function _getFinalScreenshot(perfCategory) {
  const auditRef = perfCategory.auditRefs.find(audit => audit.id === 'final-screenshot');
  if (!auditRef || !auditRef.result || auditRef.result.scoreDisplayMode === 'error') return null;
  const details = auditRef.result.details;
  if (!details || details.type !== 'screenshot') return null;
  return details.data;
}

// Defined by lib/file-namer.js, but that file does not exist in PSI. PSI doesn't use it, but
// needs some basic definition so closure compiler accepts report-ui-features.js
// @ts-expect-error - unused by typescript, used by closure compiler
// eslint-disable-next-line no-unused-vars
function getFilenamePrefix(lhr) {
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = prepareLabData;
} else {
  self.prepareLabData = prepareLabData;
}
