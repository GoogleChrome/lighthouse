/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* global document window ga DOM ReportRenderer ReportUIFeatures Logger */

// eslint-disable-next-line no-unused-vars
function __initLighthouseReport__() {
  const dom = new DOM(document);
  const renderer = new ReportRenderer(dom);
  const container = dom.find('main', document);
  /** @type {LH.ReportResult} */
  // @ts-expect-error
  const lhr = window.__LIGHTHOUSE_JSON__;
  renderer.renderReport(lhr, container);

  // Hook in JS features and page-level event listeners after the report
  // is in the document.
  const features = new ReportUIFeatures(dom);
  features.initFeatures(lhr);

  document.addEventListener('lh-analytics', /** @param {Event} e */ e => {
    // @ts-expect-error
    if (window.ga) ga(e.detail.cmd, e.detail.fields);
  });

  document.addEventListener('lh-log', /** @param {Event} e */ e => {
    const el = document.querySelector('#lh-log');
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
