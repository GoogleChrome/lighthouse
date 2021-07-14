/**
 * @license
 * Copyright 2017 The Lighthouse Authors. All Rights Reserved.
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

/* globals self, Util */

/** @typedef {import('./dom.js')} DOM */
/** @typedef {import('./report-renderer.js')} ReportRenderer */
/** @typedef {import('./details-renderer.js')} DetailsRenderer */
/** @typedef {import('./util.js')} Util */
/** @typedef {'failed'|'warning'|'manual'|'passed'|'notApplicable'} TopLevelClumpId */

class CategoryRenderer {
  /**
   * @param {DOM} dom
   * @param {DetailsRenderer} detailsRenderer
   */
  constructor(dom, detailsRenderer) {
    /** @type {DOM} */
    this.dom = dom;
    /** @type {DetailsRenderer} */
    this.detailsRenderer = detailsRenderer;
    /** @type {ParentNode} */
    this.templateContext = this.dom.document();

    this.detailsRenderer.setTemplateContext(this.templateContext);
  }

  /**
   * Display info per top-level clump. Define on class to avoid race with Util init.
   */
  get _clumpTitles() {
    return {
      warning: Util.i18n.strings.warningAuditsGroupTitle,
      manual: Util.i18n.strings.manualAuditsGroupTitle,
      passed: Util.i18n.strings.passedAuditsGroupTitle,
      notApplicable: Util.i18n.strings.notApplicableAuditsGroupTitle,
    };
  }

  /**
   * @param {LH.ReportResult.AuditRef} audit
   * @return {Element}
   */
  renderAudit(audit) {
    const auditEl = this.dom.getComponent('audit');
    return this.populateAuditValues(audit, auditEl);
  }

  /**
   * Populate an DOM tree with audit details. Used by renderAudit and renderOpportunity
   * @param {LH.ReportResult.AuditRef} audit
   * @param {HTMLElement} auditEl
   * @return {!Element}
   */
  populateAuditValues(audit, auditEl) {
    const strings = Util.i18n.strings;
    auditEl.id = audit.result.id;
    const scoreDisplayMode = audit.result.scoreDisplayMode;

    if (audit.result.displayValue) {
      this.dom.find('.lh-audit__display-text', auditEl).textContent = audit.result.displayValue;
    }

    const titleEl = this.dom.find('.lh-audit__title', auditEl);
    titleEl.appendChild(this.dom.convertMarkdownCodeSnippets(audit.result.title));
    const descEl = this.dom.find('.lh-audit__description', auditEl);
    descEl.appendChild(this.dom.convertMarkdownLinkSnippets(audit.result.description));

    for (const relevantMetric of audit.relevantMetrics || []) {
      const adornEl = this.dom.createChildOf(descEl, 'span', 'lh-audit__adorn', {
        title: `Relevant to ${relevantMetric.result.title}`,
      });
      adornEl.textContent = relevantMetric.acronym || relevantMetric.id;
    }

    if (audit.stackPacks) {
      audit.stackPacks.forEach(pack => {
        const packElm = this.dom.createElement('div');
        packElm.classList.add('lh-audit__stackpack');

        const packElmImg = this.dom.createElement('img');
        packElmImg.classList.add('lh-audit__stackpack__img');
        packElmImg.src = pack.iconDataURL;
        packElmImg.alt = pack.title;
        packElm.appendChild(packElmImg);

        packElm.appendChild(this.dom.convertMarkdownLinkSnippets(pack.description));

        this.dom.find('.lh-audit__stackpacks', auditEl)
          .appendChild(packElm);
      });
    }

    const header = this.dom.find('details', auditEl);
    if (audit.result.details) {
      const elem = this.detailsRenderer.render(audit.result.details);
      if (elem) {
        elem.classList.add('lh-details');
        header.appendChild(elem);
      }
    }

    // Add chevron SVG to the end of the summary
    this.dom.find('.lh-chevron-container', auditEl).appendChild(this._createChevron());
    this._setRatingClass(auditEl, audit.result.score, scoreDisplayMode);

    if (audit.result.scoreDisplayMode === 'error') {
      auditEl.classList.add(`lh-audit--error`);
      const textEl = this.dom.find('.lh-audit__display-text', auditEl);
      textEl.textContent = strings.errorLabel;
      textEl.classList.add('tooltip-boundary');
      const tooltip = this.dom.createChildOf(textEl, 'div', 'tooltip tooltip--error');
      tooltip.textContent = audit.result.errorMessage || strings.errorMissingAuditInfo;
    } else if (audit.result.explanation) {
      const explEl = this.dom.createChildOf(titleEl, 'div', 'lh-audit-explanation');
      explEl.textContent = audit.result.explanation;
    }
    const warnings = audit.result.warnings;
    if (!warnings || warnings.length === 0) return auditEl;

    // Add list of warnings or singular warning
    const summaryEl = this.dom.find('summary', header);
    const warningsEl = this.dom.createChildOf(summaryEl, 'div', 'lh-warnings');
    this.dom.createChildOf(warningsEl, 'span').textContent = strings.warningHeader;
    if (warnings.length === 1) {
      warningsEl.appendChild(this.dom.document().createTextNode(warnings.join('')));
    } else {
      const warningsUl = this.dom.createChildOf(warningsEl, 'ul');
      for (const warning of warnings) {
        const item = this.dom.createChildOf(warningsUl, 'li');
        item.textContent = warning;
      }
    }
    return auditEl;
  }

  /**
   * @return {Element}
   */
  _createChevron() {
    const chevronTmpl = this.dom.cloneTemplate('#tmpl-lh-chevron', this.templateContext);
    const chevronEl = this.dom.find('svg.lh-chevron', chevronTmpl);
    return chevronEl;
  }

  /**
   * @param {Element} element DOM node to populate with values.
   * @param {number|null} score
   * @param {string} scoreDisplayMode
   * @return {!Element}
   */
  _setRatingClass(element, score, scoreDisplayMode) {
    const rating = Util.calculateRating(score, scoreDisplayMode);
    element.classList.add(`lh-audit--${scoreDisplayMode.toLowerCase()}`);
    if (scoreDisplayMode !== 'informative') {
      element.classList.add(`lh-audit--${rating}`);
    }
    return element;
  }

  /**
   * @param {LH.ReportResult.Category} category
   * @param {Record<string, LH.Result.ReportGroup>} groupDefinitions
   * @return {DocumentFragment}
   */
  renderCategoryHeader(category, groupDefinitions) {
    const tmpl = this.dom.cloneTemplate('#tmpl-lh-category-header', this.templateContext);

    const gaugeContainerEl = this.dom.find('.lh-score__gauge', tmpl);
    const gaugeEl = this.renderScoreGauge(category, groupDefinitions);
    gaugeContainerEl.appendChild(gaugeEl);

    if (category.description) {
      const descEl = this.dom.convertMarkdownLinkSnippets(category.description);
      this.dom.find('.lh-category-header__description', tmpl).appendChild(descEl);
    }

    return tmpl;
  }

  /**
   * Renders the group container for a group of audits. Individual audit elements can be added
   * directly to the returned element.
   * @param {LH.Result.ReportGroup} group
   * @return {Element}
   */
  renderAuditGroup(group) {
    const groupEl = this.dom.createElement('div', 'lh-audit-group');

    const auditGroupHeader = this.dom.createElement('div', 'lh-audit-group__header');

    this.dom.createChildOf(auditGroupHeader, 'span', 'lh-audit-group__title')
      .textContent = group.title;
    if (group.description) {
      const descriptionEl = this.dom.convertMarkdownLinkSnippets(group.description);
      descriptionEl.classList.add('lh-audit-group__description');
      auditGroupHeader.appendChild(descriptionEl);
    }
    groupEl.appendChild(auditGroupHeader);

    return groupEl;
  }

  /**
   * Takes an array of auditRefs, groups them if requested, then returns an
   * array of audit and audit-group elements.
   * @param {Array<LH.ReportResult.AuditRef>} auditRefs
   * @param {Object<string, LH.Result.ReportGroup>} groupDefinitions
   * @return {Array<Element>}
   */
  _renderGroupedAudits(auditRefs, groupDefinitions) {
    // Audits grouped by their group (or under notAGroup).
    /** @type {Map<string, Array<LH.ReportResult.AuditRef>>} */
    const grouped = new Map();

    // Add audits without a group first so they will appear first.
    const notAGroup = 'NotAGroup';
    grouped.set(notAGroup, []);

    for (const auditRef of auditRefs) {
      const groupId = auditRef.group || notAGroup;
      const groupAuditRefs = grouped.get(groupId) || [];
      groupAuditRefs.push(auditRef);
      grouped.set(groupId, groupAuditRefs);
    }

    /** @type {Array<Element>} */
    const auditElements = [];

    for (const [groupId, groupAuditRefs] of grouped) {
      if (groupId === notAGroup) {
        // Push not-grouped audits individually.
        for (const auditRef of groupAuditRefs) {
          auditElements.push(this.renderAudit(auditRef));
        }
        continue;
      }

      // Push grouped audits as a group.
      const groupDef = groupDefinitions[groupId];
      const auditGroupElem = this.renderAuditGroup(groupDef);
      for (const auditRef of groupAuditRefs) {
        auditGroupElem.appendChild(this.renderAudit(auditRef));
      }
      auditGroupElem.classList.add(`lh-audit-group--${groupId}`);
      auditElements.push(auditGroupElem);
    }

    return auditElements;
  }

  /**
   * Take a set of audits, group them if they have groups, then render in a top-level
   * clump that can't be expanded/collapsed.
   * @param {Array<LH.ReportResult.AuditRef>} auditRefs
   * @param {Object<string, LH.Result.ReportGroup>} groupDefinitions
   * @return {Element}
   */
  renderUnexpandableClump(auditRefs, groupDefinitions) {
    const clumpElement = this.dom.createElement('div');
    const elements = this._renderGroupedAudits(auditRefs, groupDefinitions);
    elements.forEach(elem => clumpElement.appendChild(elem));
    return clumpElement;
  }

  /**
   * Take a set of audits and render in a top-level, expandable clump that starts
   * in a collapsed state.
   * @param {Exclude<TopLevelClumpId, 'failed'>} clumpId
   * @param {{auditRefs: Array<LH.ReportResult.AuditRef>, description?: string}} clumpOpts
   * @return {!Element}
   */
  renderClump(clumpId, {auditRefs, description}) {
    const clumpTmpl = this.dom.cloneTemplate('#tmpl-lh-clump', this.templateContext);
    const clumpElement = this.dom.find('.lh-clump', clumpTmpl);

    if (clumpId === 'warning') {
      clumpElement.setAttribute('open', '');
    }

    const summaryInnerEl = this.dom.find('div.lh-audit-group__summary', clumpElement);
    summaryInnerEl.appendChild(this._createChevron());

    const headerEl = this.dom.find('.lh-audit-group__header', clumpElement);
    const title = this._clumpTitles[clumpId];
    this.dom.find('.lh-audit-group__title', headerEl).textContent = title;
    if (description) {
      const descriptionEl = this.dom.convertMarkdownLinkSnippets(description);
      descriptionEl.classList.add('lh-audit-group__description');
      headerEl.appendChild(descriptionEl);
    }

    const itemCountEl = this.dom.find('.lh-audit-group__itemcount', clumpElement);
    itemCountEl.textContent = `(${auditRefs.length})`;

    // Add all audit results to the clump.
    const auditElements = auditRefs.map(this.renderAudit.bind(this));
    clumpElement.append(...auditElements);

    clumpElement.classList.add(`lh-clump--${clumpId.toLowerCase()}`);
    return clumpElement;
  }

  /**
   * @param {ParentNode} context
   */
  setTemplateContext(context) {
    this.templateContext = context;
    this.detailsRenderer.setTemplateContext(context);
  }

  /**
   * @param {LH.ReportResult.Category} category
   * @param {Record<string, LH.Result.ReportGroup>} groupDefinitions
   * @return {DocumentFragment}
   */
  renderScoreGauge(category, groupDefinitions) { // eslint-disable-line no-unused-vars
    const tmpl = this.dom.cloneTemplate('#tmpl-lh-gauge', this.templateContext);
    const wrapper = this.dom.find('a.lh-gauge__wrapper', tmpl);
    wrapper.href = `#${category.id}`;

    if (Util.isPluginCategory(category.id)) {
      wrapper.classList.add('lh-gauge__wrapper--plugin');
    }

    // Cast `null` to 0
    const numericScore = Number(category.score);
    const gauge = this.dom.find('.lh-gauge', tmpl);
    const gaugeArc = this.dom.find('circle.lh-gauge-arc', gauge);

    if (gaugeArc) this._setGaugeArc(gaugeArc, numericScore);

    const scoreOutOf100 = Math.round(numericScore * 100);
    const percentageEl = this.dom.find('div.lh-gauge__percentage', tmpl);
    percentageEl.textContent = scoreOutOf100.toString();
    if (category.score === null) {
      percentageEl.textContent = '?';
      percentageEl.title = Util.i18n.strings.errorLabel;
    }

    // Render a numerical score if the category has applicable audits, or no audits whatsoever.
    if (category.auditRefs.length === 0 || this.hasApplicableAudits(category)) {
      wrapper.classList.add(`lh-gauge__wrapper--${Util.calculateRating(category.score)}`);
    } else {
      wrapper.classList.add(`lh-gauge__wrapper--not-applicable`);
      percentageEl.textContent = '-';
      percentageEl.title = Util.i18n.strings.notApplicableAuditsGroupTitle;
    }

    this.dom.find('.lh-gauge__label', tmpl).textContent = category.title;
    return tmpl;
  }

  /**
   * Returns true if an LH category has any non-"notApplicable" audits.
   * @param {LH.ReportResult.Category} category
   * @return {boolean}
   */
  hasApplicableAudits(category) {
    return category.auditRefs.some(ref => ref.result.scoreDisplayMode !== 'notApplicable');
  }

  /**
   * Define the score arc of the gauge
   * Credit to xgad for the original technique: https://codepen.io/xgad/post/svg-radial-progress-meters
   * @param {SVGCircleElement} arcElem
   * @param {number} percent
   */
  _setGaugeArc(arcElem, percent) {
    const circumferencePx = 2 * Math.PI * Number(arcElem.getAttribute('r'));
    // The rounded linecap of the stroke extends the arc past its start and end.
    // First, we tweak the -90deg rotation to start exactly at the top of the circle.
    const strokeWidthPx = Number(arcElem.getAttribute('stroke-width'));
    const rotationalAdjustmentPercent = 0.25 * strokeWidthPx / circumferencePx;
    arcElem.style.transform = `rotate(${-90 + rotationalAdjustmentPercent * 360}deg)`;

    // Then, we terminate the line a little early as well.
    let arcLengthPx = percent * circumferencePx - strokeWidthPx / 2;
    // Special cases. No dot for 0, and full ring if 100
    if (percent === 0) arcElem.style.opacity = '0';
    if (percent === 1) arcLengthPx = circumferencePx;

    arcElem.style.strokeDasharray = `${Math.max(arcLengthPx, 0)} ${circumferencePx}`;
  }

  /**
   * @param {LH.ReportResult.AuditRef} audit
   * @return {boolean}
   */
  _auditHasWarning(audit) {
    return Boolean(audit.result.warnings && audit.result.warnings.length);
  }

  /**
   * Returns the id of the top-level clump to put this audit in.
   * @param {LH.ReportResult.AuditRef} auditRef
   * @return {TopLevelClumpId}
   */
  _getClumpIdForAuditRef(auditRef) {
    const scoreDisplayMode = auditRef.result.scoreDisplayMode;
    if (scoreDisplayMode === 'manual' || scoreDisplayMode === 'notApplicable') {
      return scoreDisplayMode;
    }

    if (Util.showAsPassed(auditRef.result)) {
      if (this._auditHasWarning(auditRef)) {
        return 'warning';
      } else {
        return 'passed';
      }
    } else {
      return 'failed';
    }
  }

  /**
   * Renders a set of top level sections (clumps), under a status of failed, warning,
   * manual, passed, or notApplicable. The result ends up something like:
   *
   * failed clump
   *   ├── audit 1 (w/o group)
   *   ├── audit 2 (w/o group)
   *   ├── audit group
   *   |  ├── audit 3
   *   |  └── audit 4
   *   └── audit group
   *      ├── audit 5
   *      └── audit 6
   * other clump (e.g. 'manual')
   *   ├── audit 1
   *   ├── audit 2
   *   ├── …
   *   ⋮
   * @param {LH.ReportResult.Category} category
   * @param {Object<string, LH.Result.ReportGroup>} [groupDefinitions]
   * @return {Element}
   */
  render(category, groupDefinitions = {}) {
    const element = this.dom.createElement('div', 'lh-category');
    this.createPermalinkSpan(element, category.id);
    element.appendChild(this.renderCategoryHeader(category, groupDefinitions));

    // Top level clumps for audits, in order they will appear in the report.
    /** @type {Map<TopLevelClumpId, Array<LH.ReportResult.AuditRef>>} */
    const clumps = new Map();
    clumps.set('failed', []);
    clumps.set('warning', []);
    clumps.set('manual', []);
    clumps.set('passed', []);
    clumps.set('notApplicable', []);

    // Sort audits into clumps.
    for (const auditRef of category.auditRefs) {
      const clumpId = this._getClumpIdForAuditRef(auditRef);
      const clump = /** @type {Array<LH.ReportResult.AuditRef>} */ (clumps.get(clumpId)); // already defined
      clump.push(auditRef);
      clumps.set(clumpId, clump);
    }

    // Render each clump.
    for (const [clumpId, auditRefs] of clumps) {
      if (auditRefs.length === 0) continue;

      if (clumpId === 'failed') {
        const clumpElem = this.renderUnexpandableClump(auditRefs, groupDefinitions);
        clumpElem.classList.add(`lh-clump--failed`);
        element.appendChild(clumpElem);
        continue;
      }

      const description = clumpId === 'manual' ? category.manualDescription : undefined;
      const clumpElem = this.renderClump(clumpId, {auditRefs, description});
      element.appendChild(clumpElem);
    }

    return element;
  }

  /**
   * Create a non-semantic span used for hash navigation of categories
   * @param {Element} element
   * @param {string} id
   */
  createPermalinkSpan(element, id) {
    const permalinkEl = this.dom.createChildOf(element, 'span', 'lh-permalink');
    permalinkEl.id = id;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CategoryRenderer;
} else {
  self.CategoryRenderer = CategoryRenderer;
}
