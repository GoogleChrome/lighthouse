/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Logs messages via a UI butter.
 */
export class Logger {
  /**
   * @param {HTMLElement} element - expected to have id #lh-log
   */
  constructor(element) {
    this.el = element;
    const styleEl = document.createElement('style');
    styleEl.textContent = /* css */ `
      #lh-log {
        position: fixed;
        background-color: #323232;
        color: #fff;
        min-height: 48px;
        min-width: 288px;
        padding: 16px 24px;
        box-shadow: 0 2px 5px 0 rgba(0, 0, 0, 0.26);
        border-radius: 2px;
        margin: 12px;
        font-size: 14px;
        cursor: default;
        transition: transform 0.3s, opacity 0.3s;
        transform: translateY(100px);
        opacity: 0;
        bottom: 0;
        left: 0;
        z-index: 3;
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: center;
      }
      
      #lh-log.lh-show {
        opacity: 1;
        transform: translateY(0);
      }
    `;
    if (!this.el.parentNode) throw new Error('element needs to be in the DOM');
    this.el.parentNode.insertBefore(styleEl, this.el);
    this._id = undefined;
  }

  /**
   * Shows a butter bar.
   * @param {string} msg The message to show.
   * @param {boolean=} autoHide True to hide the message after a duration.
   *     Default is true.
   */
  log(msg, autoHide = true) {
    this._id && clearTimeout(this._id);

    this.el.textContent = msg;
    this.el.classList.add('lh-show');
    if (autoHide) {
      this._id = setTimeout(() => {
        this.el.classList.remove('lh-show');
      }, 7000);
    }
  }

  /**
   * @param {string} msg
   */
  warn(msg) {
    this.log('Warning: ' + msg);
  }

  /**
   * @param {string} msg
   */
  error(msg) {
    this.log(msg);

    // Rethrow to make sure it's auditable as an error, but in a setTimeout so page
    // recovers gracefully and user can try loading a report again.
    setTimeout(() => {
      throw new Error(msg);
    }, 0);
  }

  /**
   * Explicitly hides the butter bar.
   */
  hide() {
    this._id && clearTimeout(this._id);
    this.el.classList.remove('lh-show');
  }
}
