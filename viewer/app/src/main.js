/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Logger} from '../../../report/renderer/logger.js';
import {LighthouseReportViewer} from './lighthouse-report-viewer.js';

// eslint-disable-next-line no-unused-vars
function main() {
  const logEl = document.querySelector('div#lh-log');
  if (!logEl) {
    throw new Error('logger element not found');
  }
  // TODO: switch all global uses of logger to `lh-log` events.
  window.logger = new Logger(logEl);

  // Listen for log events from main report.
  document.addEventListener('lh-log', e => {
    const ce = /** @type {CustomEvent<{cmd: string, msg: string}>} */ (e);

    switch (ce.detail.cmd) {
      case 'log':
        window.logger.log(ce.detail.msg);
        break;
      case 'warn':
        window.logger.warn(ce.detail.msg);
        break;
      case 'error':
        window.logger.error(ce.detail.msg);
        break;
      case 'hide':
        window.logger.hide();
        break;
    }
  });

  // Listen for analytics events from main report.
  document.addEventListener('lh-analytics', e => {
    const ce = /** @type {CustomEvent<{cmd: string, fields: UniversalAnalytics.FieldsObject}>} */
      (e);

    if (window.ga) {
      window.ga(ce.detail.cmd, ce.detail.fields);
    }
  });

  window.viewer = new LighthouseReportViewer();
}

window.addEventListener('DOMContentLoaded', main);
