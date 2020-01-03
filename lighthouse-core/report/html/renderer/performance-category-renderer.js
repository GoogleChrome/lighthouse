/**
 * @license
 * Copyright 2018 Google Inc. All Rights Reserved.
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

/* globals self, Util, CategoryRenderer */

/** @typedef {import('./dom.js')} DOM */

class PerformanceCategoryRenderer extends CategoryRenderer {
  /**
   * @param {LH.ReportResult.AuditRef} audit
   * @return {Element}
   */
  _renderMetric(audit) {
    const tmpl = this.dom.cloneTemplate('#tmpl-lh-metric', this.templateContext);
    const element = this.dom.find('.lh-metric', tmpl);
    element.id = audit.result.id;
    const rating = Util.calculateRating(audit.result.score, audit.result.scoreDisplayMode);
    element.classList.add(`lh-metric--${rating}`);

    const titleEl = this.dom.find('.lh-metric__title', tmpl);
    titleEl.textContent = audit.result.title;

    const valueEl = this.dom.find('.lh-metric__value', tmpl);
    valueEl.textContent = audit.result.displayValue || '';

    const descriptionEl = this.dom.find('.lh-metric__description', tmpl);
    descriptionEl.appendChild(this.dom.convertMarkdownLinkSnippets(audit.result.description));

    if (audit.result.scoreDisplayMode === 'error') {
      descriptionEl.textContent = '';
      valueEl.textContent = 'Error!';
      const tooltip = this.dom.createChildOf(descriptionEl, 'span');
      tooltip.textContent = audit.result.errorMessage || 'Report error: no metric information';
    }

    return element;
  }

  /**
   * @param {LH.ReportResult.AuditRef} audit
   * @param {number} scale
   * @return {Element}
   */
  _renderOpportunity(audit, scale) {
    const oppTmpl = this.dom.cloneTemplate('#tmpl-lh-opportunity', this.templateContext);
    const element = this.populateAuditValues(audit, oppTmpl);
    element.id = audit.result.id;

    if (!audit.result.details || audit.result.scoreDisplayMode === 'error') {
      return element;
    }
    const details = audit.result.details;
    if (details.type !== 'opportunity') {
      return element;
    }

    // Overwrite the displayValue with opportunity's wastedMs
    const displayEl = this.dom.find('.lh-audit__display-text', element);
    const sparklineWidthPct = `${details.overallSavingsMs / scale * 100}%`;
    this.dom.find('.lh-sparkline__bar', element).style.width = sparklineWidthPct;
    displayEl.textContent = Util.formatSeconds(details.overallSavingsMs, 0.01);

    // Set [title] tooltips
    if (audit.result.displayValue) {
      const displayValue = audit.result.displayValue;
      this.dom.find('.lh-load-opportunity__sparkline', element).title = displayValue;
      displayEl.title = displayValue;
    }

    return element;
  }

  /**
   * Get an audit's wastedMs to sort the opportunity by, and scale the sparkline width
   * Opportunities with an error won't have a details object, so MIN_VALUE is returned to keep any
   * erroring opportunities last in sort order.
   * @param {LH.ReportResult.AuditRef} audit
   * @return {number}
   */
  _getWastedMs(audit) {
    if (audit.result.details && audit.result.details.type === 'opportunity') {
      const details = audit.result.details;
      if (typeof details.overallSavingsMs !== 'number') {
        throw new Error('non-opportunity details passed to _getWastedMs');
      }
      return details.overallSavingsMs;
    } else {
      return Number.MIN_VALUE;
    }
  }

  /**
   * @param {LH.ReportResult.Category} category
   * @param {Object<string, LH.Result.ReportGroup>} groups
   * @param {'PSI'=} environment 'PSI' and undefined are the only valid values
   * @return {Element}
   * @override
   */
  render(category, groups, environment) {
    const element = this.dom.createElement('div', 'lh-category');
    if (environment === 'PSI') {
      const gaugeEl = this.dom.createElement('div', 'lh-score__gauge');
      gaugeEl.appendChild(this.renderScoreGauge(category, groups));
      element.appendChild(gaugeEl);
    } else {
      this.createPermalinkSpan(element, category.id);
      element.appendChild(this.renderCategoryHeader(category, groups));
    }

    // Metrics.
    const metricAuditsEl = this.renderAuditGroup(groups.metrics);

    // Metric descriptions toggle.
    const toggleTmpl = this.dom.cloneTemplate('#tmpl-lh-metrics-toggle', this.templateContext);
    const _toggleEl = this.dom.find('.lh-metrics-toggle', toggleTmpl);
    metricAuditsEl.append(..._toggleEl.childNodes);

    const metricAudits = category.auditRefs.filter(audit => audit.group === 'metrics');

    const keyMetrics = metricAudits.slice(0, 3);
    const otherMetrics = metricAudits.slice(3);

    const metricsBoxesEl = this.dom.createChildOf(metricAuditsEl, 'div', 'lh-columns');
    const metricsColumn1El = this.dom.createChildOf(metricsBoxesEl, 'div', 'lh-column');
    const metricsColumn2El = this.dom.createChildOf(metricsBoxesEl, 'div', 'lh-column');

    keyMetrics.forEach(item => {
      metricsColumn1El.appendChild(this._renderMetric(item));
    });
    otherMetrics.forEach(item => {
      metricsColumn2El.appendChild(this._renderMetric(item));
    });

    // 'Values are estimated and may vary' is used as the category description for PSI
    if (environment !== 'PSI') {
      const estValuesEl = this.dom.createChildOf(metricAuditsEl, 'div', 'lh-metrics__disclaimer');
      const disclaimerEl = this.dom.convertMarkdownLinkSnippets(Util.UIStrings.varianceDisclaimer);
      estValuesEl.appendChild(disclaimerEl);
    }

    metricAuditsEl.classList.add('lh-audit-group--metrics');
    element.appendChild(metricAuditsEl);

    // Filmstrip
    const timelineEl = this.dom.createChildOf(element, 'div', 'lh-filmstrip-container');
    const thumbnailAudit = category.auditRefs.find(audit => audit.id === 'screenshot-thumbnails');
    const thumbnailResult = thumbnailAudit && thumbnailAudit.result;
    if (thumbnailResult && thumbnailResult.details) {
      timelineEl.id = thumbnailResult.id;
      const filmstripEl = this.detailsRenderer.render(thumbnailResult.details);
      filmstripEl && timelineEl.appendChild(filmstripEl);
    }

    // Budgets
    const budgetAudit = category.auditRefs.find(audit => audit.id === 'performance-budget');
    if (budgetAudit && budgetAudit.result.details) {
      const table = this.detailsRenderer.render(budgetAudit.result.details);
      if (table) {
        table.id = budgetAudit.id;
        table.classList.add('lh-audit');
        const budgetsGroupEl = this.renderAuditGroup(groups.budgets);
        budgetsGroupEl.appendChild(table);
        budgetsGroupEl.classList.add('lh-audit-group--budgets');
        element.appendChild(budgetsGroupEl);
      }
    }

    // Opportunities
    const opportunityAudits = category.auditRefs
        .filter(audit => audit.group === 'load-opportunities' && !Util.showAsPassed(audit.result))
        .sort((auditA, auditB) => this._getWastedMs(auditB) - this._getWastedMs(auditA));

    if (opportunityAudits.length) {
      // Scale the sparklines relative to savings, minimum 2s to not overstate small savings
      const minimumScale = 2000;
      const wastedMsValues = opportunityAudits.map(audit => this._getWastedMs(audit));
      const maxWaste = Math.max(...wastedMsValues);
      const scale = Math.max(Math.ceil(maxWaste / 1000) * 1000, minimumScale);
      const groupEl = this.renderAuditGroup(groups['load-opportunities']);
      const tmpl = this.dom.cloneTemplate('#tmpl-lh-opportunity-header', this.templateContext);

      this.dom.find('.lh-load-opportunity__col--one', tmpl).textContent =
        Util.UIStrings.opportunityResourceColumnLabel;
      this.dom.find('.lh-load-opportunity__col--two', tmpl).textContent =
        Util.UIStrings.opportunitySavingsColumnLabel;

      const headerEl = this.dom.find('.lh-load-opportunity__header', tmpl);
      groupEl.appendChild(headerEl);
      opportunityAudits.forEach(item => groupEl.appendChild(this._renderOpportunity(item, scale)));
      groupEl.classList.add('lh-audit-group--load-opportunities');
      element.appendChild(groupEl);
    }

    // Diagnostics
    const diagnosticAudits = category.auditRefs
        .filter(audit => audit.group === 'diagnostics' && !Util.showAsPassed(audit.result))
        .sort((a, b) => {
          const scoreA = a.result.scoreDisplayMode === 'informative' ? 100 : Number(a.result.score);
          const scoreB = b.result.scoreDisplayMode === 'informative' ? 100 : Number(b.result.score);
          return scoreA - scoreB;
        });

    if (diagnosticAudits.length) {
      const groupEl = this.renderAuditGroup(groups['diagnostics']);
      diagnosticAudits.forEach(item => groupEl.appendChild(this.renderAudit(item)));
      groupEl.classList.add('lh-audit-group--diagnostics');
      element.appendChild(groupEl);
    }

    // Passed audits
    const passedAudits = category.auditRefs
        .filter(audit => (audit.group === 'load-opportunities' || audit.group === 'diagnostics') &&
            Util.showAsPassed(audit.result));

    if (!passedAudits.length) return element;

    const clumpOpts = {
      auditRefs: passedAudits,
      groupDefinitions: groups,
    };
    const passedElem = this.renderClump('passed', clumpOpts);
    element.appendChild(passedElem);
    return element;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PerformanceCategoryRenderer;
} else {
  self.PerformanceCategoryRenderer = PerformanceCategoryRenderer;
}
