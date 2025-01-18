/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview The entry point for rendering the Lighthouse flow report for the HTML file created by ReportGenerator.
 * The renderer code is bundled and injected into the report HTML along with the JSON report.
 */

import {renderFlowReport} from '../api';

function __initLighthouseFlowReport__() {
  const container = document.body.querySelector('main');
  if (!container) throw Error('Container element not found');
  renderFlowReport(window.__LIGHTHOUSE_FLOW_JSON__, container, {
    getReportHtml: () => document.documentElement.outerHTML,
  });
}

window.__initLighthouseFlowReport__ = __initLighthouseFlowReport__;
window.__initLighthouseFlowReport__();
