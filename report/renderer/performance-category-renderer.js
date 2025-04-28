/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/** @typedef {import('./dom.js').DOM} DOM */

import {CategoryRenderer} from './category-renderer.js';
import {ReportUtils} from './report-utils.js';
import {Globals} from './report-globals.js';
import {Util} from '../../shared/util.js';
import {createGauge, updateGauge} from './explodey-gauge.js';

const LOCAL_STORAGE_INSIGHTS_KEY = '__lh__insights_audits_toggle_state';

/**
 * @typedef {('DEFAULT'|'AUDITS'|'INSIGHTS')} InsightsExperimentState
 */

export class PerformanceCategoryRenderer extends CategoryRenderer {
  /** @type InsightsExperimentState*/
  _memoryInsightToggleState = 'DEFAULT';

  /**
   * @param {LH.ReportResult.AuditRef} audit
   * @return {!Element}
   */
  _renderMetric(audit) {
    const tmpl = this.dom.createComponent('metric');
    const element = this.dom.find('.lh-metric', tmpl);
    element.id = audit.result.id;
    const rating = ReportUtils.calculateRating(audit.result.score, audit.result.scoreDisplayMode);
    element.classList.add(`lh-metric--${rating}`);

    const titleEl = this.dom.find('.lh-metric__title', tmpl);
    titleEl.textContent = audit.result.title;

    const valueEl = this.dom.find('.lh-metric__value', tmpl);
    valueEl.textContent = audit.result.displayValue || '';

    const descriptionEl = this.dom.find('.lh-metric__description', tmpl);
    descriptionEl.append(this.dom.convertMarkdownLinkSnippets(audit.result.description));

    if (audit.result.scoreDisplayMode === 'error') {
      descriptionEl.textContent = '';
      valueEl.textContent = 'Error!';
      const tooltip = this.dom.createChildOf(descriptionEl, 'span');
      tooltip.textContent = audit.result.errorMessage || 'Report error: no metric information';
    } else if (audit.result.scoreDisplayMode === 'notApplicable') {
      valueEl.textContent = '--';
    }

    return element;
  }

  /**
   * Get a link to the interactive scoring calculator with the metric values.
   * @param {LH.ReportResult.AuditRef[]} auditRefs
   * @return {string}
   */
  _getScoringCalculatorHref(auditRefs) {
    // TODO: filter by !!acronym when dropping renderer support of v7 LHRs.
    const metrics = auditRefs.filter(audit => audit.group === 'metrics');
    const tti = auditRefs.find(audit => audit.id === 'interactive');
    const fci = auditRefs.find(audit => audit.id === 'first-cpu-idle');
    const fmp = auditRefs.find(audit => audit.id === 'first-meaningful-paint');
    if (tti) metrics.push(tti);
    if (fci) metrics.push(fci);
    if (fmp && typeof fmp.result.score === 'number') metrics.push(fmp);

    /**
     * Clamp figure to 2 decimal places
     * @param {number} val
     * @return {number}
     */
    const clampTo2Decimals = val => Math.round(val * 100) / 100;

    const metricPairs = metrics.map(audit => {
      let value;
      if (typeof audit.result.numericValue === 'number') {
        value = audit.id === 'cumulative-layout-shift' ?
          clampTo2Decimals(audit.result.numericValue) :
          Math.round(audit.result.numericValue);
        value = value.toString();
      } else {
        value = 'null';
      }
      return [audit.acronym || audit.id, value];
    });
    const paramPairs = [...metricPairs];

    if (Globals.reportJson) {
      paramPairs.push(['device', Globals.reportJson.configSettings.formFactor]);
      paramPairs.push(['version', Globals.reportJson.lighthouseVersion]);
    }

    const params = new URLSearchParams(paramPairs);
    const url = new URL('https://googlechrome.github.io/lighthouse/scorecalc/');
    url.hash = params.toString();
    return url.href;
  }

  /**
   * Returns overallImpact and linearImpact for an audit.
   * The overallImpact is determined by the audit saving's effect on the overall performance score.
   * We use linearImpact to compare audits where their overallImpact is rounded down to 0.
   *
   * @param {LH.ReportResult.AuditRef} audit
   * @param {LH.ReportResult.AuditRef[]} metricAudits
   * @return {{overallImpact: number, overallLinearImpact: number}}
   */
  overallImpact(audit, metricAudits) {
    if (!audit.result.metricSavings) {
      return {overallImpact: 0, overallLinearImpact: 0};
    }

    let overallImpact = 0;
    let overallLinearImpact = 0;
    for (const [k, savings] of Object.entries(audit.result.metricSavings)) {
      // Get metric savings for individual audit.
      if (savings === undefined) continue;

      // Get the metric data.
      const mAudit = metricAudits.find(audit => audit.acronym === k);
      if (!mAudit) continue;
      if (mAudit.result.score === null) continue;

      const mValue = mAudit.result.numericValue;
      if (!mValue) continue;

      const linearImpact = savings / mValue * mAudit.weight;
      overallLinearImpact += linearImpact;

      const scoringOptions = mAudit.result.scoringOptions;
      if (!scoringOptions) continue;

      const newMetricScore = Util.computeLogNormalScore(scoringOptions, mValue - savings);

      const weightedMetricImpact = (newMetricScore - mAudit.result.score) * mAudit.weight;
      overallImpact += weightedMetricImpact;
    }
    return {overallImpact, overallLinearImpact};
  }

  /**
   * @param {InsightsExperimentState} newState
  **/
  _persistInsightToggleToStorage(newState) {
    try {
      window.localStorage.setItem(LOCAL_STORAGE_INSIGHTS_KEY, newState);
    } finally {
      this._memoryInsightToggleState = newState;
    }
  }

  /**
   * @returns {InsightsExperimentState}
  **/
  _getInsightToggleState() {
    let state = this._getRawInsightToggleState();
    if (state === 'DEFAULT') state = 'AUDITS';
    return state;
  }

  /**
   * @returns {InsightsExperimentState}
  **/
  _getRawInsightToggleState() {
    try {
      const fromStorage = window.localStorage.getItem(LOCAL_STORAGE_INSIGHTS_KEY);
      if (fromStorage === 'AUDITS' || fromStorage === 'INSIGHTS') {
        return fromStorage;
      }
    } catch {
      return this._memoryInsightToggleState;
    }
    return 'DEFAULT';
  }

  /**
   * @param {HTMLButtonElement} button
  **/
  _setInsightToggleButtonText(button) {
    const state = this._getInsightToggleState();
    button.innerText =
      state === 'AUDITS' ? Globals.strings.tryInsights : Globals.strings.goBackToAudits;
  }

  /**
   * @param {HTMLElement} element
   */
  _renderInsightsToggle(element) {
    // Insights / Audits toggle.
    const container = this.dom.createChildOf(element, 'div', 'lh-perf-insights-toggle');
    const textSpan = this.dom.createChildOf(container, 'span', 'lh-perf-toggle-text');
    const icon = this.dom.createElement('span', 'lh-perf-insights-icon insights-icon-url');
    textSpan.appendChild(icon);
    textSpan.appendChild(this.dom.convertMarkdownLinkSnippets(Globals.strings.insightsNotice));

    const buttonClasses = 'lh-button lh-button-insight-toggle';
    const button = this.dom.createChildOf(container, 'button', buttonClasses);
    this._setInsightToggleButtonText(button);

    button.addEventListener('click', event => {
      event.preventDefault();
      const swappableSection = this.dom.maybeFind('.lh-perf-audits--swappable');
      if (swappableSection) {
        this.dom.swapSectionIfPossible(swappableSection);
      }
      const currentState = this._getInsightToggleState();
      const newState = currentState === 'AUDITS' ? 'INSIGHTS' : 'AUDITS';
      this.dom.fireEventOn('lh-analytics', this.dom.document(), {
        name: 'toggle_insights',
        data: {newState},
      });
      this._persistInsightToggleToStorage(newState);
      this._setInsightToggleButtonText(button);
    });

    container.appendChild(button);
  }

  /**
   * @param {LH.ReportResult.Category} category
   * @param {Object<string, LH.Result.ReportGroup>} groups
   * @param {{gatherMode: LH.Result.GatherMode}=} options
   * @return {Element}
   * @override
   */
  render(category, groups, options) {
    const strings = Globals.strings;
    const element = this.dom.createElement('div', 'lh-category');
    element.id = category.id;
    element.append(this.renderCategoryHeader(category, groups, options));

    // Metrics.
    const metricAudits = category.auditRefs.filter(audit => audit.group === 'metrics');
    if (metricAudits.length) {
      const [metricsGroupEl, metricsFooterEl] = this.renderAuditGroup(groups.metrics);

      // Metric descriptions toggle.
      const checkboxEl = this.dom.createElement('input', 'lh-metrics-toggle__input');
      const checkboxId = `lh-metrics-toggle${Globals.getUniqueSuffix()}`;
      checkboxEl.setAttribute('aria-label', 'Toggle the display of metric descriptions');
      checkboxEl.type = 'checkbox';
      checkboxEl.id = checkboxId;
      metricsGroupEl.prepend(checkboxEl);
      const metricHeaderEl = this.dom.find('.lh-audit-group__header', metricsGroupEl);
      const labelEl = this.dom.createChildOf(metricHeaderEl, 'label', 'lh-metrics-toggle__label');
      labelEl.htmlFor = checkboxId;
      const showEl = this.dom.createChildOf(labelEl, 'span', 'lh-metrics-toggle__labeltext--show');
      const hideEl = this.dom.createChildOf(labelEl, 'span', 'lh-metrics-toggle__labeltext--hide');
      showEl.textContent = Globals.strings.expandView;
      hideEl.textContent = Globals.strings.collapseView;

      const metricsBoxesEl = this.dom.createElement('div', 'lh-metrics-container');
      metricsGroupEl.insertBefore(metricsBoxesEl, metricsFooterEl);
      metricAudits.forEach(item => {
        metricsBoxesEl.append(this._renderMetric(item));
      });

      // Only add the disclaimer with the score calculator link if the category was rendered with a score gauge.
      if (element.querySelector('.lh-gauge__wrapper')) {
        const descriptionEl = this.dom.find('.lh-category-header__description', element);
        const estValuesEl = this.dom.createChildOf(descriptionEl, 'div', 'lh-metrics__disclaimer');
        const disclaimerEl = this.dom.convertMarkdownLinkSnippets(strings.varianceDisclaimer);
        estValuesEl.append(disclaimerEl);

        // Add link to score calculator.
        const calculatorLink = this.dom.createChildOf(estValuesEl, 'a', 'lh-calclink');
        calculatorLink.target = '_blank';
        calculatorLink.textContent = strings.calculatorLink;
        this.dom.safelySetHref(calculatorLink, this._getScoringCalculatorHref(category.auditRefs));
      }

      metricsGroupEl.classList.add('lh-audit-group--metrics');
      element.append(metricsGroupEl);
    }

    // Filmstrip
    const timelineEl = this.dom.createChildOf(element, 'div', 'lh-filmstrip-container');
    const thumbnailAudit = category.auditRefs.find(audit => audit.id === 'screenshot-thumbnails');
    const thumbnailResult = thumbnailAudit?.result;
    if (thumbnailResult?.details) {
      timelineEl.id = thumbnailResult.id;
      const filmstripEl = this.detailsRenderer.render(thumbnailResult.details);
      filmstripEl && timelineEl.append(filmstripEl);
    }

    this._renderInsightsToggle(element);

    const legacyAuditsSection =
      this.renderFilterableSection(category, groups, ['diagnostics'], metricAudits);
    legacyAuditsSection?.classList.add('lh-perf-audits--swappable', 'lh-perf-audits--legacy');

    const experimentalInsightsSection =
      this.renderFilterableSection(category, groups, ['insights', 'diagnostics'], metricAudits);
    experimentalInsightsSection?.classList.add(
      'lh-perf-audits--swappable', 'lh-perf-audits--experimental');

    if (legacyAuditsSection) {
      element.append(legacyAuditsSection);

      // Many tests expect just one of these sections to be in the DOM at a given time.
      // To prevent the hidden section from tripping up these tests, we will just remove the hidden
      // section from the DOM and store it in memory.
      if (experimentalInsightsSection) {
        this.dom.registerSwappableSections(legacyAuditsSection, experimentalInsightsSection);
      }
    }
    // Deal with the user loading the report and having toggled to Insights
    // which is now stored in local storage. Put in a rAF otherwise this code
    // runs before the DOM is created.
    if (this._getInsightToggleState() === 'INSIGHTS') {
      requestAnimationFrame(() => {
        const swappableSection = this.dom.maybeFind('.lh-perf-audits--swappable');
        if (swappableSection) {
          this.dom.swapSectionIfPossible(swappableSection);
        }
      });
    }

    // Log the initial state.
    this.dom.fireEventOn('lh-analytics', this.dom.document(), {
      name: 'initial_insights_state',
      data: {state: this._getRawInsightToggleState()},
    });

    const isNavigationMode = !options || options?.gatherMode === 'navigation';
    if (isNavigationMode && category.score !== null) {
      const el = createGauge(this.dom);
      updateGauge(this.dom, el, category);
      this.dom.find('.lh-score__gauge', element).replaceWith(el);
    }

    return element;
  }

  /**
   * @param {LH.ReportResult.Category} category
   * @param {Object<string, LH.Result.ReportGroup>} groups
   * @param {string[]} groupNames
   * @param {LH.ReportResult.AuditRef[]} metricAudits
   * @return {Element|null}
   */
  renderFilterableSection(category, groups, groupNames, metricAudits) {
    if (groupNames.some(groupName => !groups[groupName])) return null;

    const element = this.dom.createElement('div');

    /** @type {Set<string>} */
    const replacedAuditIds = new Set();

    /**
     * This exists to temporarily allow showing insights - which are in the hidden
     * group by default - when using the insights toggle.
     * See https://github.com/GoogleChrome/lighthouse/pull/16418 for motivation.
     *
     * @param {LH.ReportResult.AuditRef} auditRef
     */
    const getGroup = (auditRef) => {
      return auditRef.id.endsWith('-insight') ? 'insights' : auditRef.group ?? '';
    };

    const allGroupAudits =
      category.auditRefs.filter(audit => groupNames.includes(getGroup(audit)));
    for (const auditRef of allGroupAudits) {
      auditRef.result.replacesAudits?.forEach(replacedAuditId => {
        replacedAuditIds.add(replacedAuditId);
      });
    }

    // Diagnostics
    const allFilterableAudits = allGroupAudits
      .filter(audit => !replacedAuditIds.has(audit.id))
      .map(auditRef => {
        const {overallImpact, overallLinearImpact} = this.overallImpact(auditRef, metricAudits);
        const guidanceLevel = auditRef.result.guidanceLevel || 1;
        const auditEl = this.renderAudit(auditRef);

        return {auditRef, auditEl, overallImpact, overallLinearImpact, guidanceLevel};
      });

    const filterableAudits = allFilterableAudits
      .filter(audit => !ReportUtils.showAsPassed(audit.auditRef.result));

    const passedAudits = allFilterableAudits
      .filter(audit => ReportUtils.showAsPassed(audit.auditRef.result));

    /** @type {Record<string, [Element, Element|null]|undefined>} */
    const groupElsMap = {};
    for (const groupName of groupNames) {
      const groupEls = this.renderAuditGroup(groups[groupName]);
      groupEls[0].classList.add(`lh-audit-group--${groupName}`);
      groupElsMap[groupName] = groupEls;
    }

    /**
     * @param {string} acronym
     */
    function refreshFilteredAudits(acronym) {
      for (const audit of allFilterableAudits) {
        if (acronym === 'All') {
          audit.auditEl.hidden = false;
        } else {
          const shouldHide = audit.auditRef.result.metricSavings?.[acronym] === undefined;
          audit.auditEl.hidden = shouldHide;
        }
      }

      filterableAudits.sort((a, b) => {
        // Performance diagnostics should only have score display modes of "informative" and "metricSavings"
        // If the score display mode is "metricSavings", the `score` will be a coarse approximation of the overall impact.
        // Therefore, it makes sense to sort audits by score first to ensure visual clarity with the score icons.
        const scoreA = a.auditRef.result.score || 0;
        const scoreB = b.auditRef.result.score || 0;
        if (scoreA !== scoreB) return scoreA - scoreB;

        // If there is a metric filter applied, we should sort by the impact to that specific metric.
        if (acronym !== 'All') {
          const aSavings = a.auditRef.result.metricSavings?.[acronym] ?? -1;
          const bSavings = b.auditRef.result.metricSavings?.[acronym] ?? -1;
          if (aSavings !== bSavings) return bSavings - aSavings;
        }

        // Overall impact is the estimated improvement to the performance score
        if (a.overallImpact !== b.overallImpact) {
          return b.overallImpact * b.guidanceLevel - a.overallImpact * a.guidanceLevel;
        }

        // Fall back to the linear impact if the normal impact is rounded down to 0
        if (
          a.overallImpact === 0 && b.overallImpact === 0 &&
          a.overallLinearImpact !== b.overallLinearImpact
        ) {
          return b.overallLinearImpact * b.guidanceLevel - a.overallLinearImpact * a.guidanceLevel;
        }

        // Audits that have no estimated savings should be prioritized by the guidance level
        return b.guidanceLevel - a.guidanceLevel;
      });

      for (const audit of filterableAudits) {
        if (!audit.auditRef.group) continue;

        const groupEls = groupElsMap[getGroup(audit.auditRef)];
        if (!groupEls) continue;

        const [groupEl, footerEl] = groupEls;
        groupEl.insertBefore(audit.auditEl, footerEl);
      }
    }

    /** @type {Set<string>} */
    const filterableMetricAcronyms = new Set();
    for (const audit of filterableAudits) {
      const metricSavings = audit.auditRef.result.metricSavings || {};
      for (const [key, value] of Object.entries(metricSavings)) {
        if (typeof value === 'number') filterableMetricAcronyms.add(key);
      }
    }

    const filterableMetrics =
      metricAudits.filter(a => a.acronym && filterableMetricAcronyms.has(a.acronym));

    // TODO: only add if there are opportunities & diagnostics rendered.
    if (filterableMetrics.length) {
      this.renderMetricAuditFilter(filterableMetrics, element, refreshFilteredAudits);
    }

    refreshFilteredAudits('All');

    for (const groupName of groupNames) {
      if (filterableAudits.some(audit => getGroup(audit.auditRef) === groupName)) {
        const groupEls = groupElsMap[groupName];
        if (!groupEls) continue;
        element.append(groupEls[0]);
      }
    }

    if (!passedAudits.length) return element;

    const clumpOpts = {
      auditRefsOrEls: passedAudits.map(audit => audit.auditEl),
      groupDefinitions: groups,
    };
    const passedElem = this.renderClump('passed', clumpOpts);
    element.append(passedElem);

    return element;
  }

  /**
   * Render the control to filter the audits by metric. The filtering is done at runtime by CSS only
   * @param {LH.ReportResult.AuditRef[]} filterableMetrics
   * @param {HTMLDivElement} categoryEl
   * @param {(acronym: string) => void} onFilterChange
   */
  renderMetricAuditFilter(filterableMetrics, categoryEl, onFilterChange) {
    const metricFilterEl = this.dom.createElement('div', 'lh-metricfilter');
    const textEl = this.dom.createChildOf(metricFilterEl, 'span', 'lh-metricfilter__text');
    textEl.textContent = Globals.strings.showRelevantAudits;

    const filterChoices = [
      /** @type {const} */ ({acronym: 'All', id: 'All'}),
      ...filterableMetrics,
    ];

    // Form labels need to reference unique IDs, but multiple reports rendered in the same DOM (eg PSI)
    // would mean ID conflict.  To address this, we 'scope' these radio inputs with a unique suffix.
    const uniqSuffix = Globals.getUniqueSuffix();
    for (const metric of filterChoices) {
      const elemId = `metric-${metric.acronym}-${uniqSuffix}`;
      const radioEl = this.dom.createChildOf(metricFilterEl, 'input', 'lh-metricfilter__radio');
      radioEl.type = 'radio';
      radioEl.name = `metricsfilter-${uniqSuffix}`;
      radioEl.id = elemId;

      const labelEl = this.dom.createChildOf(metricFilterEl, 'label', 'lh-metricfilter__label');
      labelEl.htmlFor = elemId;
      labelEl.title = 'result' in metric ? metric.result.title : '';
      labelEl.textContent = metric.acronym || metric.id;

      if (metric.acronym === 'All') {
        radioEl.checked = true;
        labelEl.classList.add('lh-metricfilter__label--active');
      }
      categoryEl.append(metricFilterEl);

      // Toggle class/hidden state based on filter choice.
      radioEl.addEventListener('input', _ => {
        for (const elem of categoryEl.querySelectorAll('label.lh-metricfilter__label')) {
          elem.classList.toggle('lh-metricfilter__label--active', elem.htmlFor === elemId);
        }
        categoryEl.classList.toggle('lh-category--filtered', metric.acronym !== 'All');

        onFilterChange(metric.acronym || 'All');

        // Hide groups/clumps if all child audits are also hidden.
        const groupEls = categoryEl.querySelectorAll('div.lh-audit-group, details.lh-audit-group');
        for (const groupEl of groupEls) {
          groupEl.hidden = false;
          const childEls = Array.from(groupEl.querySelectorAll('div.lh-audit'));
          const areAllHidden = !!childEls.length && childEls.every(auditEl => auditEl.hidden);
          groupEl.hidden = areAllHidden;
        }
      });
    }
  }
}
