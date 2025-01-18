/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/** @typedef {import('./dom.js').DOM} DOM */
/** @typedef {import('./report-renderer.js').ReportRenderer} ReportRenderer */
/** @typedef {import('./details-renderer.js').DetailsRenderer} DetailsRenderer */
/** @typedef {'failed'|'warning'|'manual'|'passed'|'notApplicable'} TopLevelClumpId */

import {ReportUtils} from './report-utils.js';
import {Globals} from './report-globals.js';

export class CategoryRenderer {
  /**
   * @param {DOM} dom
   * @param {DetailsRenderer} detailsRenderer
   */
  constructor(dom, detailsRenderer) {
    /** @type {DOM} */
    this.dom = dom;
    /** @type {DetailsRenderer} */
    this.detailsRenderer = detailsRenderer;
  }

  /**
   * Display info per top-level clump. Define on class to avoid race with Util init.
   */
  get _clumpTitles() {
    return {
      warning: Globals.strings.warningAuditsGroupTitle,
      manual: Globals.strings.manualAuditsGroupTitle,
      passed: Globals.strings.passedAuditsGroupTitle,
      notApplicable: Globals.strings.notApplicableAuditsGroupTitle,
    };
  }

  /**
   * @param {LH.ReportResult.AuditRef} audit
   * @return {HTMLElement}
   */
  renderAudit(audit) {
    const strings = Globals.strings;
    const component = this.dom.createComponent('audit');
    const auditEl = this.dom.find('div.lh-audit', component);
    auditEl.id = audit.result.id;
    const scoreDisplayMode = audit.result.scoreDisplayMode;

    if (audit.result.displayValue) {
      this.dom.find('.lh-audit__display-text', auditEl).textContent = audit.result.displayValue;
    }

    const titleEl = this.dom.find('.lh-audit__title', auditEl);
    titleEl.append(this.dom.convertMarkdownCodeSnippets(audit.result.title));
    const descEl = this.dom.find('.lh-audit__description', auditEl);
    descEl.append(this.dom.convertMarkdownLinkSnippets(audit.result.description));

    for (const relevantMetric of audit.relevantMetrics || []) {
      const adornEl = this.dom.createChildOf(descEl, 'span', 'lh-audit__adorn');
      adornEl.title = `Relevant to ${relevantMetric.result.title}`;
      adornEl.textContent = relevantMetric.acronym || relevantMetric.id;
    }

    if (audit.stackPacks) {
      audit.stackPacks.forEach(pack => {
        const packElmImg = this.dom.createElement('img', 'lh-audit__stackpack__img');
        packElmImg.src = pack.iconDataURL;
        packElmImg.alt = pack.title;

        const snippets = this.dom.convertMarkdownLinkSnippets(pack.description, {
          alwaysAppendUtmSource: true,
        });
        const packElm = this.dom.createElement('div', 'lh-audit__stackpack');
        packElm.append(packElmImg, snippets);

        this.dom.find('.lh-audit__stackpacks', auditEl)
          .append(packElm);
      });
    }

    const header = this.dom.find('details', auditEl);
    if (audit.result.details) {
      const elem = this.detailsRenderer.render(audit.result.details);
      if (elem) {
        elem.classList.add('lh-details');
        header.append(elem);
      }
    }

    // Add chevron SVG to the end of the summary
    this.dom.find('.lh-chevron-container', auditEl).append(this._createChevron());
    this._setRatingClass(auditEl, audit.result.score, scoreDisplayMode);

    if (audit.result.scoreDisplayMode === 'error') {
      auditEl.classList.add(`lh-audit--error`);
      const textEl = this.dom.find('.lh-audit__display-text', auditEl);
      textEl.textContent = strings.errorLabel;
      textEl.classList.add('lh-tooltip-boundary');
      const tooltip = this.dom.createChildOf(textEl, 'div', 'lh-tooltip lh-tooltip--error');
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
      warningsEl.append(this.dom.createTextNode(warnings.join('')));
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
   * Inject the final screenshot next to the score gauge of the first category (likely Performance)
   * @param {HTMLElement} categoriesEl
   * @param {LH.ReportResult['audits']} audits
   * @param {Element} scoreScaleEl
   */
  injectFinalScreenshot(categoriesEl, audits, scoreScaleEl) {
    const audit = audits['final-screenshot'];
    if (!audit || audit.scoreDisplayMode === 'error') return null;
    if (!audit.details || audit.details.type !== 'screenshot') return null;

    const imgEl = this.dom.createElement('img', 'lh-final-ss-image');
    const finalScreenshotDataUri = audit.details.data;
    imgEl.src = finalScreenshotDataUri;
    imgEl.alt = audit.title;

    const firstCatHeaderEl = this.dom.find('.lh-category .lh-category-header', categoriesEl);
    const leftColEl = this.dom.createElement('div', 'lh-category-headercol');
    const separatorEl = this.dom.createElement('div',
        'lh-category-headercol lh-category-headercol--separator');
    const rightColEl = this.dom.createElement('div', 'lh-category-headercol');

    leftColEl.append(...firstCatHeaderEl.childNodes);
    leftColEl.append(scoreScaleEl);
    rightColEl.append(imgEl);
    firstCatHeaderEl.append(leftColEl, separatorEl, rightColEl);
    firstCatHeaderEl.classList.add('lh-category-header__finalscreenshot');
  }

  /**
   * @return {Element}
   */
  _createChevron() {
    const component = this.dom.createComponent('chevron');
    const chevronEl = this.dom.find('svg.lh-chevron', component);
    return chevronEl;
  }

  /**
   * @param {Element} element DOM node to populate with values.
   * @param {number|null} score
   * @param {string} scoreDisplayMode
   * @return {!Element}
   */
  _setRatingClass(element, score, scoreDisplayMode) {
    const rating = ReportUtils.calculateRating(score, scoreDisplayMode);
    element.classList.add(`lh-audit--${scoreDisplayMode.toLowerCase()}`);
    if (scoreDisplayMode !== 'informative') {
      element.classList.add(`lh-audit--${rating}`);
    }
    return element;
  }

  /**
   * @param {LH.ReportResult.Category} category
   * @param {Record<string, LH.Result.ReportGroup>} groupDefinitions
   * @param {{gatherMode: LH.Result.GatherMode}=} options
   * @return {DocumentFragment}
   */
  renderCategoryHeader(category, groupDefinitions, options) {
    const component = this.dom.createComponent('categoryHeader');

    const gaugeContainerEl = this.dom.find('.lh-score__gauge', component);
    const gaugeEl = this.renderCategoryScore(category, groupDefinitions, options);
    gaugeContainerEl.append(gaugeEl);

    if (category.description) {
      const descEl = this.dom.convertMarkdownLinkSnippets(category.description);
      this.dom.find('.lh-category-header__description', component).append(descEl);
    }

    return component;
  }

  /**
   * Renders the group container for a group of audits. Individual audit elements can be added
   * directly to the returned element.
   * @param {LH.Result.ReportGroup} group
   * @return {[Element, Element | null]}
   */
  renderAuditGroup(group) {
    const groupEl = this.dom.createElement('div', 'lh-audit-group');

    const auditGroupHeader = this.dom.createElement('div', 'lh-audit-group__header');

    this.dom.createChildOf(auditGroupHeader, 'span', 'lh-audit-group__title')
      .textContent = group.title;
    groupEl.append(auditGroupHeader);

    let footerEl = null;
    if (group.description) {
      footerEl = this.dom.convertMarkdownLinkSnippets(group.description);
      footerEl.classList.add('lh-audit-group__description', 'lh-audit-group__footer');
      groupEl.append(footerEl);
    }

    return [groupEl, footerEl];
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
      const [auditGroupElem, auditGroupFooterEl] = this.renderAuditGroup(groupDef);
      for (const auditRef of groupAuditRefs) {
        auditGroupElem.insertBefore(this.renderAudit(auditRef), auditGroupFooterEl);
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
    elements.forEach(elem => clumpElement.append(elem));
    return clumpElement;
  }

  /**
   * Take a set of audits and render in a top-level, expandable clump that starts
   * in a collapsed state.
   * @param {Exclude<TopLevelClumpId, 'failed'>} clumpId
   * @param {{auditRefsOrEls: Array<LH.ReportResult.AuditRef | HTMLElement>, description?: string, openByDefault?: boolean}} clumpOpts
   * @return {!Element}
   */
  renderClump(clumpId, {auditRefsOrEls, description, openByDefault}) {
    const clumpComponent = this.dom.createComponent('clump');
    const clumpElement = this.dom.find('.lh-clump', clumpComponent);

    if (openByDefault) {
      clumpElement.setAttribute('open', '');
    }

    const headerEl = this.dom.find('.lh-audit-group__header', clumpElement);
    const title = this._clumpTitles[clumpId];
    this.dom.find('.lh-audit-group__title', headerEl).textContent = title;

    const itemCountEl = this.dom.find('.lh-audit-group__itemcount', clumpElement);
    itemCountEl.textContent = `(${auditRefsOrEls.length})`;

    // Add all audit results to the clump.
    const auditElements = auditRefsOrEls.map(audit => {
      if (audit instanceof HTMLElement) {
        return audit;
      } else {
        return this.renderAudit(audit);
      }
    });
    clumpElement.append(...auditElements);

    const el = this.dom.find('.lh-audit-group', clumpComponent);
    if (description) {
      const descriptionEl = this.dom.convertMarkdownLinkSnippets(description);
      descriptionEl.classList.add('lh-audit-group__description', 'lh-audit-group__footer');
      el.append(descriptionEl);
    }

    this.dom.find('.lh-clump-toggletext--show', el).textContent = Globals.strings.show;
    this.dom.find('.lh-clump-toggletext--hide', el).textContent = Globals.strings.hide;

    clumpElement.classList.add(`lh-clump--${clumpId.toLowerCase()}`);
    return el;
  }

  /**
   * @param {LH.ReportResult.Category} category
   * @param {Record<string, LH.Result.ReportGroup>} groupDefinitions
   * @param {{gatherMode: LH.Result.GatherMode, omitLabel?: boolean, onPageAnchorRendered?: (link: HTMLAnchorElement) => void}=} options
   * @return {DocumentFragment}
   */
  renderCategoryScore(category, groupDefinitions, options) {
    let categoryScore;
    if (options && ReportUtils.shouldDisplayAsFraction(options.gatherMode)) {
      categoryScore = this.renderCategoryFraction(category);
    } else {
      categoryScore = this.renderScoreGauge(category, groupDefinitions);
    }

    if (options?.omitLabel) {
      const label = this.dom.find('.lh-gauge__label,.lh-fraction__label', categoryScore);
      label.remove();
    }

    if (options?.onPageAnchorRendered) {
      const anchor = this.dom.find('a', categoryScore);
      options.onPageAnchorRendered(anchor);
    }

    return categoryScore;
  }

  /**
   * @param {LH.ReportResult.Category} category
   * @param {Record<string, LH.Result.ReportGroup>} groupDefinitions
   * @return {DocumentFragment}
   */
  renderScoreGauge(category, groupDefinitions) { // eslint-disable-line no-unused-vars
    const tmpl = this.dom.createComponent('gauge');
    const wrapper = this.dom.find('a.lh-gauge__wrapper', tmpl);

    if (ReportUtils.isPluginCategory(category.id)) {
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
      percentageEl.classList.add('lh-gauge--error');
      percentageEl.textContent = '';
      percentageEl.title = Globals.strings.errorLabel;
    }

    // Render a numerical score if the category has applicable audits, or no audits whatsoever.
    if (category.auditRefs.length === 0 || this.hasApplicableAudits(category)) {
      wrapper.classList.add(`lh-gauge__wrapper--${ReportUtils.calculateRating(category.score)}`);
    } else {
      wrapper.classList.add(`lh-gauge__wrapper--not-applicable`);
      percentageEl.textContent = '-';
      percentageEl.title = Globals.strings.notApplicableAuditsGroupTitle;
    }

    this.dom.find('.lh-gauge__label', tmpl).textContent = category.title;
    return tmpl;
  }

  /**
   * @param {LH.ReportResult.Category} category
   * @return {DocumentFragment}
   */
  renderCategoryFraction(category) {
    const tmpl = this.dom.createComponent('fraction');
    const wrapper = this.dom.find('a.lh-fraction__wrapper', tmpl);

    const {numPassed, numPassableAudits, totalWeight} =
      ReportUtils.calculateCategoryFraction(category);

    const fraction = numPassed / numPassableAudits;
    const content = this.dom.find('.lh-fraction__content', tmpl);
    const text = this.dom.createElement('span');
    text.textContent = `${numPassed}/${numPassableAudits}`;
    content.append(text);

    let rating = ReportUtils.calculateRating(fraction);

    // If none of the available audits can affect the score, a rating isn't useful.
    // The flow report should display the fraction with neutral icon and coloring in this case.
    if (totalWeight === 0) {
      rating = 'null';
    }

    wrapper.classList.add(`lh-fraction__wrapper--${rating}`);

    this.dom.find('.lh-fraction__label', tmpl).textContent = category.title;
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
    return Boolean(audit.result.warnings?.length);
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

    if (ReportUtils.showAsPassed(auditRef.result)) {
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
   * @param {Object<string, LH.Result.ReportGroup>=} groupDefinitions
   * @param {{gatherMode: LH.Result.GatherMode}=} options
   * @return {Element}
   */
  render(category, groupDefinitions = {}, options) {
    const element = this.dom.createElement('div', 'lh-category');
    element.id = category.id;
    element.append(this.renderCategoryHeader(category, groupDefinitions, options));

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
      if (auditRef.group === 'hidden') continue;
      const clumpId = this._getClumpIdForAuditRef(auditRef);
      const clump = /** @type {Array<LH.ReportResult.AuditRef>} */ (clumps.get(clumpId)); // already defined
      clump.push(auditRef);
      clumps.set(clumpId, clump);
    }

    // Sort audits by weight.
    for (const auditRefs of clumps.values()) {
      auditRefs.sort((a, b) => {
        return b.weight - a.weight;
      });
    }

    const numFailingAudits = clumps.get('failed')?.length;
    // Render each clump.
    for (const [clumpId, auditRefs] of clumps) {
      if (auditRefs.length === 0) continue;

      if (clumpId === 'failed') {
        const clumpElem = this.renderUnexpandableClump(auditRefs, groupDefinitions);
        clumpElem.classList.add(`lh-clump--failed`);
        element.append(clumpElem);
        continue;
      }

      const description = clumpId === 'manual' ? category.manualDescription : undefined;
      // Expand on warning, or manual audits when there are no failing audits.
      const openByDefault =
        clumpId === 'warning' || (clumpId === 'manual' && numFailingAudits === 0);
      const clumpElem = this.renderClump(clumpId, {
        auditRefsOrEls: auditRefs,
        description,
        openByDefault,
      });
      element.append(clumpElem);
    }

    return element;
  }
}
