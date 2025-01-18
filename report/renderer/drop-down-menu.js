/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-env browser */

/** @typedef {import('./dom.js').DOM} DOM */

export class DropDownMenu {
  /**
   * @param {DOM} dom
   */
  constructor(dom) {
    /** @type {DOM} */
    this._dom = dom;
    /** @type {HTMLElement} */
    this._toggleEl; // eslint-disable-line no-unused-expressions
    /** @type {HTMLElement} */
    this._menuEl; // eslint-disable-line no-unused-expressions

    this.onDocumentKeyDown = this.onDocumentKeyDown.bind(this);
    this.onToggleClick = this.onToggleClick.bind(this);
    this.onToggleKeydown = this.onToggleKeydown.bind(this);
    this.onMenuFocusOut = this.onMenuFocusOut.bind(this);
    this.onMenuKeydown = this.onMenuKeydown.bind(this);

    this._getNextMenuItem = this._getNextMenuItem.bind(this);
    this._getNextSelectableNode = this._getNextSelectableNode.bind(this);
    this._getPreviousMenuItem = this._getPreviousMenuItem.bind(this);
  }

  /**
   * @param {function(MouseEvent): any} menuClickHandler
   */
  setup(menuClickHandler) {
    this._toggleEl = this._dom.find('.lh-topbar button.lh-tools__button', this._dom.rootEl);
    this._toggleEl.addEventListener('click', this.onToggleClick);
    this._toggleEl.addEventListener('keydown', this.onToggleKeydown);

    this._menuEl = this._dom.find('.lh-topbar div.lh-tools__dropdown', this._dom.rootEl);
    this._menuEl.addEventListener('keydown', this.onMenuKeydown);
    this._menuEl.addEventListener('click', menuClickHandler);
  }

  close() {
    this._toggleEl.classList.remove('lh-active');
    this._toggleEl.setAttribute('aria-expanded', 'false');
    if (this._menuEl.contains(this._dom.document().activeElement)) {
      // Refocus on the tools button if the drop down last had focus
      this._toggleEl.focus();
    }
    this._menuEl.removeEventListener('focusout', this.onMenuFocusOut);
    this._dom.document().removeEventListener('keydown', this.onDocumentKeyDown);
  }

  /**
   * @param {HTMLElement} firstFocusElement
   */
  open(firstFocusElement) {
    if (this._toggleEl.classList.contains('lh-active')) {
      // If the drop down is already open focus on the element
      firstFocusElement.focus();
    } else {
      // Wait for drop down transition to complete so options are focusable.
      this._menuEl.addEventListener('transitionend', () => {
        firstFocusElement.focus();
      }, {once: true});
    }

    this._toggleEl.classList.add('lh-active');
    this._toggleEl.setAttribute('aria-expanded', 'true');
    this._menuEl.addEventListener('focusout', this.onMenuFocusOut);
    this._dom.document().addEventListener('keydown', this.onDocumentKeyDown);
  }

  /**
   * Click handler for tools button.
   * @param {Event} e
   */
  onToggleClick(e) {
    e.preventDefault();
    e.stopImmediatePropagation();

    if (this._toggleEl.classList.contains('lh-active')) {
      this.close();
    } else {
      this.open(this._getNextMenuItem());
    }
  }

  /**
   * Handler for tool button.
   * @param {KeyboardEvent} e
   */
  onToggleKeydown(e) {
    switch (e.code) {
      case 'ArrowUp':
        e.preventDefault();
        this.open(this._getPreviousMenuItem());
        break;
      case 'ArrowDown':
      case 'Enter':
      case ' ':
        e.preventDefault();
        this.open(this._getNextMenuItem());
        break;
      default:
       // no op
    }
  }

  /**
   * Handler for tool DropDown.
   * @param {KeyboardEvent} e
   */
  onMenuKeydown(e) {
    const el = /** @type {?HTMLElement} */ (e.target);

    switch (e.code) {
      case 'ArrowUp':
        e.preventDefault();
        this._getPreviousMenuItem(el).focus();
        break;
      case 'ArrowDown':
        e.preventDefault();
        this._getNextMenuItem(el).focus();
        break;
      case 'Home':
        e.preventDefault();
        this._getNextMenuItem().focus();
        break;
      case 'End':
        e.preventDefault();
        this._getPreviousMenuItem().focus();
        break;
      default:
       // no op
    }
  }

  /**
   * Keydown handler for the document.
   * @param {KeyboardEvent} e
   */
  onDocumentKeyDown(e) {
    if (e.keyCode === 27) { // ESC
      this.close();
    }
  }

  /**
   * Focus out handler for the drop down menu.
   * @param {FocusEvent} e
   */
  onMenuFocusOut(e) {
    const focusedEl = /** @type {?HTMLElement} */ (e.relatedTarget);

    if (!this._menuEl.contains(focusedEl)) {
      this.close();
    }
  }

  /**
   * @param {Array<Node>} allNodes
   * @param {?HTMLElement=} startNode
   * @return {HTMLElement}
   */
  _getNextSelectableNode(allNodes, startNode) {
    const nodes = allNodes
      .filter(node => node instanceof HTMLElement)
      .filter(node => {
        // 'Save as Gist' option may be disabled.
        if (node.hasAttribute('disabled')) {
          return false;
        }

        // 'Save as Gist' option may have display none.
        if (window.getComputedStyle(node).display === 'none') {
          return false;
        }

        return true;
      });

    let nextIndex = startNode ? (nodes.indexOf(startNode) + 1) : 0;
    if (nextIndex >= nodes.length) {
      nextIndex = 0;
    }

    return nodes[nextIndex];
  }

  /**
   * @param {?HTMLElement=} startEl
   * @return {HTMLElement}
   */
  _getNextMenuItem(startEl) {
    const nodes = Array.from(this._menuEl.childNodes);
    return this._getNextSelectableNode(nodes, startEl);
  }

  /**
   * @param {?HTMLElement=} startEl
   * @return {HTMLElement}
   */
  _getPreviousMenuItem(startEl) {
    const nodes = Array.from(this._menuEl.childNodes).reverse();
    return this._getNextSelectableNode(nodes, startEl);
  }
}
