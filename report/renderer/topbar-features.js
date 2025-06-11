/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-env browser */

/** @typedef {import('./dom.js').DOM} DOM */
/** @typedef {import('./report-ui-features').ReportUIFeatures} ReportUIFeatures */

import {DropDownMenu} from './drop-down-menu.js';
import {toggleDarkTheme} from './features-util.js';
import {openViewer, openViewerAndSendData} from './open-tab.js';

export class TopbarFeatures {
  /**
   * @param {ReportUIFeatures} reportUIFeatures
   * @param {DOM} dom
   */
  constructor(reportUIFeatures, dom) {
    /** @type {LH.Result} */
    this.lhr; // eslint-disable-line no-unused-expressions
    this._reportUIFeatures = reportUIFeatures;
    this._dom = dom;
    this._dropDownMenu = new DropDownMenu(this._dom);
    this._copyAttempt = false;
    /** @type {HTMLElement} */
    this.topbarEl; // eslint-disable-line no-unused-expressions
    /** @type {HTMLElement} */
    this.categoriesEl; // eslint-disable-line no-unused-expressions
    /** @type {HTMLElement?} */
    this.stickyHeaderEl; // eslint-disable-line no-unused-expressions
    /** @type {HTMLElement} */
    this.highlightEl; // eslint-disable-line no-unused-expressions
    this.onDropDownMenuClick = this.onDropDownMenuClick.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onCopy = this.onCopy.bind(this);
    this.collapseAllDetails = this.collapseAllDetails.bind(this);
  }

  /**
   * @param {LH.Result} lhr
   */
  enable(lhr) {
    this.lhr = lhr;
    this._dom.rootEl.addEventListener('keyup', this.onKeyUp);
    this._dom.document().addEventListener('copy', this.onCopy);
    this._dropDownMenu.setup(this.onDropDownMenuClick);
    this._setUpCollapseDetailsAfterPrinting();

    const topbarLogo = this._dom.find('.lh-topbar__logo', this._dom.rootEl);
    topbarLogo.addEventListener('click', () => toggleDarkTheme(this._dom));

    this._setupStickyHeader();
  }

  /**
   * Handler for tool button.
   * @param {Event} e
   */
  onDropDownMenuClick(e) {
    e.preventDefault();

    const el = /** @type {?Element} */ (e.target);

    if (!el || !el.hasAttribute('data-action')) {
      return;
    }

    switch (el.getAttribute('data-action')) {
      case 'copy':
        this.onCopyButtonClick();
        break;
      case 'print-summary':
        this.collapseAllDetails();
        this._print();
        break;
      case 'print-expanded':
        this.expandAllDetails();
        this._print();
        break;
      case 'save-json': {
        const jsonStr = JSON.stringify(this.lhr, null, 2);
        this._reportUIFeatures._saveFile(new Blob([jsonStr], {type: 'application/json'}));
        break;
      }
      case 'save-html': {
        const htmlStr = this._reportUIFeatures.getReportHtml();
        try {
          this._reportUIFeatures._saveFile(new Blob([htmlStr], {type: 'text/html'}));
        } catch (e) {
          this._dom.fireEventOn('lh-log', this._dom.document(), {
            cmd: 'error', msg: 'Could not export as HTML. ' + e.message,
          });
        }
        break;
      }
      case 'open-viewer': {
        // DevTools cannot send data with postMessage, and we only want to use the URL fragment
        // approach for viewer when needed, so check the environment and choose accordingly.
        if (this._dom.isDevTools()) {
          openViewer(this.lhr);
        } else {
          openViewerAndSendData(this.lhr);
        }
        break;
      }
      case 'save-gist': {
        this._reportUIFeatures.saveAsGist();
        break;
      }
      case 'toggle-dark': {
        toggleDarkTheme(this._dom);
        break;
      }
      case 'view-unthrottled-trace': {
        this._reportUIFeatures._opts.onViewTrace?.();
      }
    }

    this._dropDownMenu.close();
  }

  /**
   * Handle copy events.
   * @param {ClipboardEvent} e
   */
  onCopy(e) {
    // Only handle copy button presses (e.g. ignore the user copying page text).
    if (this._copyAttempt && e.clipboardData) {
      // We want to write our own data to the clipboard, not the user's text selection.
      e.preventDefault();
      e.clipboardData.setData('text/plain', JSON.stringify(this.lhr, null, 2));

      this._dom.fireEventOn('lh-log', this._dom.document(), {
        cmd: 'log', msg: 'Report JSON copied to clipboard',
      });
    }

    this._copyAttempt = false;
  }

  /**
   * Copies the report JSON to the clipboard (if supported by the browser).
   */
  onCopyButtonClick() {
    this._dom.fireEventOn('lh-analytics', this._dom.document(), {
      name: 'copy',
    });

    try {
      if (this._dom.document().queryCommandSupported('copy')) {
        this._copyAttempt = true;

        // Note: In Safari 10.0.1, execCommand('copy') returns true if there's
        // a valid text selection on the page. See http://caniuse.com/#feat=clipboard.
        if (!this._dom.document().execCommand('copy')) {
          this._copyAttempt = false; // Prevent event handler from seeing this as a copy attempt.

          this._dom.fireEventOn('lh-log', this._dom.document(), {
            cmd: 'warn', msg: 'Your browser does not support copy to clipboard.',
          });
        }
      }
    } catch (e) {
      this._copyAttempt = false;
      this._dom.fireEventOn('lh-log', this._dom.document(), {cmd: 'log', msg: e.message});
    }
  }

  /**
   * Keyup handler for the document.
   * @param {KeyboardEvent} e
   */
  onKeyUp(e) {
    // Ctrl+P - Expands audit details when user prints via keyboard shortcut.
    if ((e.ctrlKey || e.metaKey) && e.keyCode === 80) {
      this._dropDownMenu.close();
    }
  }

  /**
   * Expands all audit `<details>`.
   * Ideally, a print stylesheet could take care of this, but CSS has no way to
   * open a `<details>` element.
   */
  expandAllDetails() {
    const details = this._dom.findAll('.lh-categories details', this._dom.rootEl);
    details.map(detail => detail.open = true);
  }

  /**
   * Collapses all audit `<details>`.
   * open a `<details>` element.
   */
  collapseAllDetails() {
    const details = this._dom.findAll('.lh-categories details', this._dom.rootEl);
    details.map(detail => detail.open = false);
  }

  _print() {
    if (this._reportUIFeatures._opts.onPrintOverride) {
      this._reportUIFeatures._opts.onPrintOverride(this._dom.rootEl);
    } else {
      self.print();
    }
  }

  /**
   * Resets the state of page before capturing the page for export.
   * When the user opens the exported HTML page, certain UI elements should
   * be in their closed state (not opened) and the templates should be unstamped.
   */
  resetUIState() {
    this._dropDownMenu.close();
  }

  /**
   * Finds the first scrollable ancestor of `element`. Falls back to the document.
   * @param {Element} element
   * @return {Element | Document}
   */
  _getScrollParent(element) {
    const {overflowY} = window.getComputedStyle(element);
    const isScrollable = overflowY !== 'visible' && overflowY !== 'hidden';

    if (isScrollable) {
      return element;
    }

    if (element.parentElement) {
      return this._getScrollParent(element.parentElement);
    }

    return document;
  }

  /**
   * Sets up listeners to collapse audit `<details>` when the user closes the
   * print dialog, all `<details>` are collapsed.
   */
  _setUpCollapseDetailsAfterPrinting() {
    // FF and IE implement these old events.
    const supportsOldPrintEvents = 'onbeforeprint' in self;
    if (supportsOldPrintEvents) {
      self.addEventListener('afterprint', this.collapseAllDetails);
    } else {
      // Note: FF implements both window.onbeforeprint and media listeners. However,
      // it doesn't matchMedia doesn't fire when matching 'print'.
      self.matchMedia('print').addListener(mql => {
        if (mql.matches) {
          this.expandAllDetails();
        } else {
          this.collapseAllDetails();
        }
      });
    }
  }

  _setupStickyHeader() {
    // Cache these elements to avoid qSA on each onscroll.
    this.topbarEl = this._dom.find('div.lh-topbar', this._dom.rootEl);
    this.categoriesEl = this._dom.find('div.lh-categories', this._dom.rootEl);

    // Defer behind rAF to avoid forcing layout.
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      // Only present in the DOM if it'll be used (>=2 categories)
      try {
        this.stickyHeaderEl = this._dom.find('div.lh-sticky-header', this._dom.rootEl);
      } catch {
        return;
      }

      // Highlighter will be absolutely positioned at first gauge, then transformed on scroll.
      this.highlightEl = this._dom.createChildOf(this.stickyHeaderEl, 'div', 'lh-highlighter');

      // Update sticky header visibility and highlight when page scrolls/resizes.
      const scrollParent = this._getScrollParent(
        this._dom.find('.lh-container', this._dom.rootEl));
      // The 'scroll' handler must be should be on {Element | Document}...
      scrollParent.addEventListener('scroll', () => this._updateStickyHeader());
      // However resizeObserver needs an element, *not* the document.
      const resizeTarget = scrollParent instanceof window.Document
        ? document.documentElement
        : scrollParent;
      new window.ResizeObserver(() => this._updateStickyHeader()).observe(resizeTarget);
    }));
  }

  /**
   * Toggle visibility and update highlighter position
   */
  _updateStickyHeader() {
    if (!this.stickyHeaderEl) return;

    // Show sticky header when the main 5 gauges clear the topbar.
    const topbarBottom = this.topbarEl.getBoundingClientRect().bottom;
    const categoriesTop = this.categoriesEl.getBoundingClientRect().top;
    const showStickyHeader = topbarBottom >= categoriesTop;

    // Highlight mini gauge when section is in view.
    // In view = the last category that starts above the middle of the window.
    const categoryEls = Array.from(this._dom.rootEl.querySelectorAll('.lh-category'));
    const categoriesAboveTheMiddle =
      categoryEls.filter(el => el.getBoundingClientRect().top - window.innerHeight / 2 < 0);
    const highlightIndex =
      categoriesAboveTheMiddle.length > 0 ? categoriesAboveTheMiddle.length - 1 : 0;

    // Category order matches gauge order in sticky header.
    const gaugeWrapperEls =
      this.stickyHeaderEl.querySelectorAll('.lh-gauge__wrapper, .lh-fraction__wrapper');
    const gaugeToHighlight = gaugeWrapperEls[highlightIndex];
    const origin = gaugeWrapperEls[0].getBoundingClientRect().left;
    const offset = gaugeToHighlight.getBoundingClientRect().left - origin;

    // Mutate at end to avoid layout thrashing.
    this.highlightEl.style.transform = `translate(${offset}px)`;
    this.stickyHeaderEl.classList.toggle('lh-sticky-header--visible', showStickyHeader);
  }
}
