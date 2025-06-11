/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Adds tools button, print, and other dynamic functionality to
 * the report.
 */

/** @typedef {import('./dom').DOM} DOM */

import {ElementScreenshotRenderer} from './element-screenshot-renderer.js';
import {toggleDarkTheme} from './features-util.js';
import {openTreemap} from './open-tab.js';
import {TopbarFeatures} from './topbar-features.js';
import {Util} from '../../shared/util.js';
import {getLhrFilenamePrefix} from '../generator/file-namer.js';
import {Globals} from './report-globals.js';

/**
 * @param {HTMLTableElement} tableEl
 * @return {Array<HTMLElement>}
 */
function getTableRows(tableEl) {
  return Array.from(tableEl.tBodies[0].rows);
}
export class ReportUIFeatures {
  /**
   * @param {DOM} dom
   * @param {LH.Renderer.Options} opts
   */
  constructor(dom, opts = {}) {
    /** @type {LH.Result} */
    this.json; // eslint-disable-line no-unused-expressions
    /** @type {DOM} */
    this._dom = dom;

    this._opts = opts;

    this._topbar = opts.omitTopbar ? null : new TopbarFeatures(this, dom);
    this.onMediaQueryChange = this.onMediaQueryChange.bind(this);
  }

  /**
   * Adds tools button, print, and other functionality to the report. The method
   * should be called whenever the report needs to be re-rendered.
   * @param {LH.Result} lhr
   */
  initFeatures(lhr) {
    this.json = lhr;
    this._fullPageScreenshot = Util.getFullPageScreenshot(lhr);

    if (this._topbar) {
      this._topbar.enable(lhr);
      this._topbar.resetUIState();
    }
    this._setupMediaQueryListeners();
    this._setupThirdPartyFilter();
    this._setupElementScreenshotOverlay(this._dom.rootEl);

    // Do not query the system preferences for DevTools - DevTools should only apply dark theme
    // if dark is selected in the settings panel.
    // TODO: set `disableDarkMode` in devtools and delete this special case.
    const disableDarkMode = this._dom.isDevTools() ||
      this._opts.disableDarkMode || this._opts.disableAutoDarkModeAndFireworks;
    if (!disableDarkMode && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      toggleDarkTheme(this._dom, true);
    }

    // Fireworks!
    // To get fireworks you need 100 scores in all core categories.
    const fireworksRequiredCategoryIds = ['performance', 'accessibility', 'best-practices', 'seo'];
    const scoresAll100 = fireworksRequiredCategoryIds.every(id => {
      const cat = lhr.categories[id];
      return cat && cat.score === 1;
    });
    const disableFireworks =
      this._opts.disableFireworks || this._opts.disableAutoDarkModeAndFireworks;
    if (scoresAll100 && !disableFireworks) {
      this._enableFireworks();
      // If dark mode is allowed, force it on because it looks so much better.
      if (!disableDarkMode) toggleDarkTheme(this._dom, true);
    }

    // Show the metric descriptions by default when there is an error.
    const hasMetricError = lhr.categories.performance && lhr.categories.performance.auditRefs
      .some(audit => Boolean(audit.group === 'metrics' && lhr.audits[audit.id].errorMessage));
    if (hasMetricError) {
      const toggleInputEl = this._dom.find('input.lh-metrics-toggle__input', this._dom.rootEl);
      toggleInputEl.checked = true;
    }

    const showTreemapApp =
      this.json.audits['script-treemap-data'] && this.json.audits['script-treemap-data'].details;
    if (showTreemapApp) {
      this.addButton({
        text: Globals.strings.viewTreemapLabel,
        icon: 'treemap',
        onClick: () => openTreemap(this.json),
      });
    }

    if (this._opts.onViewTrace) {
      if (lhr.configSettings.throttlingMethod === 'simulate') {
        // eslint-disable-next-line max-len
        this._dom.find('a[data-action="view-unthrottled-trace"]', this._dom.rootEl).classList.remove('lh-hidden');
      } else {
        this.addButton({
          text: Globals.strings.viewTraceLabel,
          onClick: () => this._opts.onViewTrace?.(),
        });
      }
    }

    if (this._opts.getStandaloneReportHTML) {
      this._dom.find('a[data-action="save-html"]', this._dom.rootEl).classList.remove('lh-hidden');
    }

    // Fill in all i18n data.
    for (const node of this._dom.findAll('[data-i18n]', this._dom.rootEl)) {
      // These strings are guaranteed to (at least) have a default English string in UIStrings,
      // so this cannot be undefined as long as `report-ui-features.data-i18n` test passes.
      const i18nKey = node.getAttribute('data-i18n');
      const i18nAttr = /** @type {keyof typeof Globals.strings} */ (i18nKey);
      node.textContent = Globals.strings[i18nAttr];
    }
  }

  /**
   * @param {{text: string, icon?: string, onClick: () => void}} opts
   */
  addButton(opts) {
    // Use qSA directly to as we don't want to throw (if this element is missing).
    const metricsEl = this._dom.rootEl.querySelector('.lh-audit-group--metrics');
    if (!metricsEl) return;

    let buttonsEl = metricsEl.querySelector('.lh-buttons');
    if (!buttonsEl) buttonsEl = this._dom.createChildOf(metricsEl, 'div', 'lh-buttons');

    const classes = [
      'lh-button',
    ];
    if (opts.icon) {
      classes.push('lh-report-icon');
      classes.push(`lh-report-icon--${opts.icon}`);
    }
    const buttonEl = this._dom.createChildOf(buttonsEl, 'button', classes.join(' '));
    buttonEl.textContent = opts.text;
    buttonEl.addEventListener('click', opts.onClick);
    return buttonEl;
  }

  resetUIState() {
    if (this._topbar) {
      this._topbar.resetUIState();
    }
  }

  /**
   * Returns the html that recreates this report.
   * @return {string}
   */
  getReportHtml() {
    if (!this._opts.getStandaloneReportHTML) {
      throw new Error('`getStandaloneReportHTML` is not set');
    }

    this.resetUIState();
    return this._opts.getStandaloneReportHTML();
  }

  /**
   * Save json as a gist. Unimplemented in base UI features.
   */
  saveAsGist() {
    // TODO ?
    throw new Error('Cannot save as gist from base report');
  }

  _enableFireworks() {
    const scoresContainer = this._dom.find('.lh-scores-container', this._dom.rootEl);
    scoresContainer.classList.add('lh-score100');
  }

  _setupMediaQueryListeners() {
    const mediaQuery = self.matchMedia('(max-width: 500px)');
    mediaQuery.addListener(this.onMediaQueryChange);
    // Ensure the handler is called on init
    this.onMediaQueryChange(mediaQuery);
  }

  /**
   * Resets the state of page before capturing the page for export.
   * When the user opens the exported HTML page, certain UI elements should
   * be in their closed state (not opened) and the templates should be unstamped.
   */
  _resetUIState() {
    if (this._topbar) {
      this._topbar.resetUIState();
    }
  }

  /**
   * Handle media query change events.
   * @param {MediaQueryList|MediaQueryListEvent} mql
   */
  onMediaQueryChange(mql) {
    this._dom.rootEl.classList.toggle('lh-narrow', mql.matches);
  }

  _setupThirdPartyFilter() {
    // Some audits should not display the third party filter option.
    const thirdPartyFilterAuditExclusions = [
      // These audits deal explicitly with third party resources.
      'uses-rel-preconnect',
      'third-party-facades',
    ];
    // Some audits should hide third party by default.
    const thirdPartyFilterAuditHideByDefault = [
      // Only first party resources are actionable.
      'legacy-javascript',
    ];

    // Get all tables with a text url column.
    const tables = Array.from(this._dom.rootEl.querySelectorAll('table.lh-table'));
    const tablesWithUrls = tables
      .filter(el =>
        el.querySelector('td.lh-table-column--url, td.lh-table-column--source-location'))
      .filter(el => {
        const containingAudit = el.closest('.lh-audit');
        if (!containingAudit) throw new Error('.lh-table not within audit');
        return !thirdPartyFilterAuditExclusions.includes(containingAudit.id);
      });

    tablesWithUrls.forEach((tableEl) => {
      const rowEls = getTableRows(tableEl);
      const nonSubItemRows = rowEls.filter(rowEl => !rowEl.classList.contains('lh-sub-item-row'));
      const thirdPartyRowEls = this._getThirdPartyRows(nonSubItemRows,
        Util.getFinalDisplayedUrl(this.json));
      // Entity-grouped tables don't have zebra lines.
      const hasZebraStyle = rowEls.some(rowEl => rowEl.classList.contains('lh-row--even'));

      // create input box
      const filterTemplate = this._dom.createComponent('3pFilter');
      const filterInput = this._dom.find('input', filterTemplate);

      filterInput.addEventListener('change', e => {
        const shouldHideThirdParty = e.target instanceof HTMLInputElement && !e.target.checked;
        let even = true;
        let rowEl = nonSubItemRows[0];
        while (rowEl) {
          const shouldHide = shouldHideThirdParty && thirdPartyRowEls.includes(rowEl);

          // Iterate subsequent associated sub item rows.
          do {
            rowEl.classList.toggle('lh-row--hidden', shouldHide);

            if (hasZebraStyle) {
              // Adjust for zebra styling.
              rowEl.classList.toggle('lh-row--even', !shouldHide && even);
              rowEl.classList.toggle('lh-row--odd', !shouldHide && !even);
            }

            rowEl = /** @type {HTMLElement} */ (rowEl.nextElementSibling);
          } while (rowEl && rowEl.classList.contains('lh-sub-item-row'));

          if (!shouldHide) even = !even;
        }
      });

      // thirdPartyRowEls contains both heading and item rows.
      // Filter out heading rows to get third party resource count.
      const thirdPartyResourceCount = thirdPartyRowEls.filter(
        rowEl => !rowEl.classList.contains('lh-row--group')).length;
      this._dom.find('.lh-3p-filter-count', filterTemplate).textContent =
        `${thirdPartyResourceCount}`;
      this._dom.find('.lh-3p-ui-string', filterTemplate).textContent =
          Globals.strings.thirdPartyResourcesLabel;

      const allThirdParty = thirdPartyRowEls.length === nonSubItemRows.length;
      const allFirstParty = !thirdPartyRowEls.length;

      // If all or none of the rows are 3rd party, hide the control.
      if (allThirdParty || allFirstParty) {
        this._dom.find('div.lh-3p-filter', filterTemplate).hidden = true;
      }

      // Add checkbox to the DOM.
      if (!tableEl.parentNode) return; // Keep tsc happy.
      tableEl.parentNode.insertBefore(filterTemplate, tableEl);

      // Hide third-party rows for some audits by default.
      const containingAudit = tableEl.closest('.lh-audit');
      if (!containingAudit) throw new Error('.lh-table not within audit');
      if (thirdPartyFilterAuditHideByDefault.includes(containingAudit.id) && !allThirdParty) {
        filterInput.click();
      }
    });
  }

  /**
   * @param {Element} rootEl
   */
  _setupElementScreenshotOverlay(rootEl) {
    if (!this._fullPageScreenshot) return;

    ElementScreenshotRenderer.installOverlayFeature({
      dom: this._dom,
      rootEl: rootEl,
      overlayContainerEl: rootEl,
      fullPageScreenshot: this._fullPageScreenshot,
    });
  }

  /**
   * From a table with URL entries, finds the rows containing third-party URLs
   * and returns them.
   * @param {HTMLElement[]} rowEls
   * @param {string} finalDisplayedUrl
   * @return {Array<HTMLElement>}
   */
  _getThirdPartyRows(rowEls, finalDisplayedUrl) {
    const finalDisplayedUrlEntity = Util.getEntityFromUrl(finalDisplayedUrl, this.json.entities);
    const firstPartyEntityName = this.json.entities?.find(e => e.isFirstParty === true)?.name;

    /** @type {Array<HTMLElement>} */
    const thirdPartyRowEls = [];
    for (const rowEl of rowEls) {
      if (firstPartyEntityName) {
        // We rely on entity-classification for new LHRs that support it.
        if (!rowEl.dataset.entity || rowEl.dataset.entity === firstPartyEntityName) continue;
      } else {
        // Without 10.0's entity classification, fallback to the older root domain-based filtering.
        const urlItem = rowEl.querySelector('div.lh-text__url');
        if (!urlItem) continue;
        const datasetUrl = urlItem.dataset.url;
        if (!datasetUrl) continue;
        const isThirdParty =
          Util.getEntityFromUrl(datasetUrl, this.json.entities) !== finalDisplayedUrlEntity;
        if (!isThirdParty) continue;
      }

      thirdPartyRowEls.push(rowEl);
    }

    return thirdPartyRowEls;
  }

  /**
   * @param {Blob|File} blob
   */
  _saveFile(blob) {
    const ext = blob.type.match('json') ? '.json' : '.html';
    const filename = getLhrFilenamePrefix({
      finalDisplayedUrl: Util.getFinalDisplayedUrl(this.json),
      fetchTime: this.json.fetchTime,
    }) + ext;
    if (this._opts.onSaveFileOverride) {
      this._opts.onSaveFileOverride(blob, filename);
    } else {
      this._dom.saveFile(blob, filename);
    }
  }
}
