/**
 * Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* global LighthouseReportViewer, Logger */

// eslint-disable-next-line no-unused-vars
function main() {
  const logEl = document.querySelector('#lh-log');
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
