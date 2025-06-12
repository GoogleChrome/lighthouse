/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */


import fs from 'fs';

import {getModuleDirectory} from '../../shared/esm-utils.js';

const moduleDir = getModuleDirectory(import.meta);

/* eslint-disable max-len */
const FLOW_REPORT_TEMPLATE = fs.readFileSync(`${moduleDir}/../../flow-report/assets/standalone-flow-template.html`, 'utf8');
const REGULAR_REPORT_CSS = fs.readFileSync(moduleDir + '/../assets/styles.css', 'utf8');
const FLOW_REPORT_CSS = fs.readFileSync(`${moduleDir}/../../flow-report/assets/styles.css`, 'utf8');
const FLOW_REPORT_JAVASCRIPT = fs.readFileSync(`${moduleDir}/../../dist/report/flow.js`, 'utf8');
/* eslint-enable max-len */

export const flowReportAssets = {
  FLOW_REPORT_TEMPLATE,
  FLOW_REPORT_CSS: [REGULAR_REPORT_CSS, FLOW_REPORT_CSS].join('\n'),
  FLOW_REPORT_JAVASCRIPT,
};
