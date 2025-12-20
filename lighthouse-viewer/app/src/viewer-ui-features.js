/**
 * Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* global ReportUIFeatures, ReportGenerator */

/** @typedef {import('../../../lighthouse-core/report/html/renderer/dom')} DOM */

/**
 * Extends ReportUIFeatures to add an (optional) ability to save to a gist and
 * generates the saved report from a browserified ReportGenerator.
 */
class ViewerUIFeatures extends ReportUIFeatures {
  /**
   * @param {DOM} dom
   * @param {?function(LH.Result): void} saveGistCallback
   */
  constructor(dom, saveGistCallback) {
    super(dom);

    this._saveGistCallback = saveGistCallback;
  }

  /**
   * @param {LH.Result} report
   * @override
   */
  initFeatures(report) {
    super.initFeatures(report);

    // Disable option to save as gist if no callback for saving.
    if (!this._saveGistCallback) {
      const saveGistItem = this._dom.find('.lh-tools--gist', this._document);
      saveGistItem.setAttribute('disabled', 'true');
    }
  }

  /**
   * Uses ReportGenerator to create the html that recreates this report.
   * @return {string}
   * @override
   */
  getReportHtml() {
    return ReportGenerator.generateReportHtml(this.json);
  }

  /**
   * @override
   */
  saveAsGist() {
    if (this._saveGistCallback) {
      this._saveGistCallback(this.json);
    } else {
      // UI should prevent this from being called with no callback, but throw to be sure.
      throw new Error('Cannot save this report as a gist');
    }

    // Disable save-as-gist option after saving.
    const saveGistItem = this._dom.find('.lh-tools--gist', this._document);
    saveGistItem.setAttribute('disabled', 'true');
  }
}

// node export for testing.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ViewerUIFeatures;
}
