/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview The entry point for rendering the Lighthouse report for the HTML
 * file created by ReportGenerator.
 * The renderer code is bundled and injected into the report HTML along with the JSON report.
 */

/* global ga */

import {renderReport} from '../renderer/api.js';
import {Logger} from '../renderer/logger.js';

function __initLighthouseReport__() {
  /** @type {LH.Result} */
  // @ts-expect-error
  const lhr = window.__LIGHTHOUSE_JSON__;

  const reportRootEl = renderReport(lhr, {
    occupyEntireViewport: true,
    getStandaloneReportHTML() {
      return document.documentElement.outerHTML;
    },
  });
  document.body.append(reportRootEl);

  document.addEventListener('lh-analytics', /** @param {Event} e */ e => {
    // @ts-expect-error
    if (window.ga) ga(e.detail.cmd, e.detail.fields);
  });

  document.addEventListener('lh-log', /** @param {Event} e */ e => {
    const el = document.querySelector('div#lh-log');
    if (!el) return;

    const logger = new Logger(el);
    // @ts-expect-error
    const detail = e.detail;

    switch (detail.cmd) {
      case 'log':
        logger.log(detail.msg);
        break;
      case 'warn':
        logger.warn(detail.msg);
        break;
      case 'error':
        logger.error(detail.msg);
        break;
      case 'hide':
        logger.hide();
        break;
    }
  });
}

// @ts-expect-error
window.__initLighthouseReport__ = __initLighthouseReport__;
