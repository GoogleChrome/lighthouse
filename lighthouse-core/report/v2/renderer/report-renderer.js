/**
 * Copyright 2017 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

/**
 * @fileoverview The entry point for rendering the Lighthouse report based on the JSON output.
 *    This file is injected into the report HTML along with the JSON report.
 *
 * Dummy text for ensuring report robustness: </script> pre$`post %%LIGHTHOUSE_JSON%%
 */

/* globals self, formatDateTime, formatNumber, calculateRating */

class ReportRenderer {
  /**
   * @param {!DOM} dom
   * @param {!CategoryRenderer} categoryRenderer
   * @param {!ReportUIFeatures=} uiFeatures
   */
  constructor(dom, categoryRenderer, uiFeatures = null) {
    /** @private {!DOM} */
    this._dom = dom;
    /** @private {!CategoryRenderer} */
    this._categoryRenderer = categoryRenderer;
    /** @private {!Document|!Element} */
    this._templateContext = this._dom.document();
    /** @private {ReportUIFeatures} */
    this._uiFeatures = uiFeatures;
  }

  /**
   * @param {!ReportRenderer.ReportJSON} report
   * @param {!Element} container Parent element to render the report into.
   * @return {!Element}
   */
  renderReport(report, container) {
    container.textContent = ''; // Remove previous report.

    let element;
    try {
      element = container.appendChild(this._renderReport(report));

      // Hook in JS features and page-level event listeners after the report
      // is in the document.
      if (this._uiFeatures) {
        this._uiFeatures.addUIFeatures(report);
      }
    } catch (e) {
      element = container.appendChild(this._renderException(e));
    }

    return element;
  }

  /**
   * Define a custom element for <templates> to be extracted from. For example:
   *     this.setTemplateContext(new DOMParser().parseFromString(htmlStr, 'text/html'))
   * @param {!Document|!Element} context
   */
  setTemplateContext(context) {
    this._templateContext = context;
    this._categoryRenderer.setTemplateContext(context);
  }

  /**
   * @param {!Error} e
   * @return {!Element}
   */
  _renderException(e) {
    const element = this._dom.createElement('div', 'lh-exception');
    element.textContent = String(e.stack);
    return element;
  }

  /**
   * @param {!ReportRenderer.ReportJSON} report
   * @return {!DocumentFragment}
   */
  _renderReportHeader(report) {
    const header = this._dom.cloneTemplate('#tmpl-lh-heading', this._templateContext);
    header.querySelector('.lh-config__timestamp').textContent =
        formatDateTime(report.generatedTime);
    const url = header.querySelector('.lh-metadata__url');
    url.href = report.url;
    url.textContent = report.url;

    const env = header.querySelector('.lh-env__items');
    report.runtimeConfig.environment.forEach(runtime => {
      const item = this._dom.cloneTemplate('#tmpl-lh-env__items', env);
      item.querySelector('.lh-env__name').textContent = runtime.name;
      item.querySelector('.lh-env__description').textContent = runtime.description;
      item.querySelector('.lh-env__enabled').textContent =
          runtime.enabled ? 'Enabled' : 'Disabled';
      env.appendChild(item);
    });

    return header;
  }

  /**
   * @param {!ReportRenderer.ReportJSON} report
   * @return {!DocumentFragment}
   */
  _renderReportFooter(report) {
    const footer = this._dom.cloneTemplate('#tmpl-lh-footer', this._templateContext);
    footer.querySelector('.lh-footer__version').textContent = report.lighthouseVersion;
    footer.querySelector('.lh-footer__timestamp').textContent =
        formatDateTime(report.generatedTime);
    return footer;
  }

  /**
   * @param {!ReportRenderer.ReportJSON} report
   * @return {!DocumentFragment}
   */
  _renderReportNav(report) {
    const leftNav = this._dom.cloneTemplate('#tmpl-lh-leftnav', this._templateContext);

    leftNav.querySelector('.leftnav__header__version').textContent =
        `Version: ${report.lighthouseVersion}`;

    const nav = leftNav.querySelector('.lh-leftnav');
    for (const category of report.reportCategories) {
      const item = this._dom.cloneTemplate('#tmpl-lh-leftnav__items', leftNav);
      item.querySelector('.leftnav-item__category').textContent = category.name;
      const score = item.querySelector('.leftnav-item__score');
      score.classList.add(`lh-score__value--${calculateRating(category.score)}`);
      score.textContent = Math.round(formatNumber(category.score));
      nav.appendChild(item);
    }
    return leftNav;
  }

  /**
   * @param {!ReportJSON} report
   * @return {!Element}
   */
  _renderReport(report) {
    const container = this._dom.createElement('div', 'lh-container');

    container.appendChild(this._renderReportHeader(report)); // sticker header goes at the top.
    container.appendChild(this._renderReportNav(report));

    const reportSection = container.appendChild(this._dom.createElement('div', 'lh-report'));
    const categories = reportSection.appendChild(this._dom.createElement('div', 'lh-categories'));
    for (const category of report.reportCategories) {
      categories.appendChild(this._categoryRenderer.render(category));
    }

    reportSection.appendChild(this._renderReportFooter(report));

    return container;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ReportRenderer;
} else {
  self.ReportRenderer = ReportRenderer;
}

/**
 * @typedef {{
 *     id: string,
 *     weight: number,
 *     score: number,
 *     result: {
 *       description: string,
 *       displayValue: string,
 *       helpText: string,
 *       score: (number|boolean),
 *       scoringMode: string,
 *       optimalValue: number,
 *       details: (!DetailsRenderer.DetailsJSON|undefined)
 *     }
 * }}
 */
ReportRenderer.AuditJSON; // eslint-disable-line no-unused-expressions

/**
 * @typedef {{
 *     name: string,
 *     weight: number,
 *     score: number,
 *     description: string,
 *     audits: !Array<!ReportRenderer.AuditJSON>
 * }}
 */
ReportRenderer.CategoryJSON; // eslint-disable-line no-unused-expressions

/**
 * @typedef {{
 *     lighthouseVersion: string,
 *     generatedTime: string,
 *     initialUrl: string,
 *     url: string,
 *     reportCategories: !Array<!ReportRenderer.CategoryJSON>
 * }}
 */
ReportRenderer.ReportJSON; // eslint-disable-line no-unused-expressions
