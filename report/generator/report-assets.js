/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */


import fs from 'fs';

import {flowReportAssets} from './flow-report-assets.js';
import {getModuleDirectory} from '../../shared/esm-utils.js';

const moduleDir = getModuleDirectory(import.meta);

const REPORT_TEMPLATE = fs.readFileSync(moduleDir + '/../assets/standalone-template.html',
    'utf8');
const REPORT_JAVASCRIPT = fs.readFileSync(moduleDir + '/../../dist/report/standalone.js', 'utf8');

export const reportAssets = {
  REPORT_TEMPLATE,
  REPORT_JAVASCRIPT,
  // Flow report assets are not needed for every bundle.
  // Replacing/ignoring flow-report-assets.js (e.g. `rollupPlugins.shim`) will
  // remove the flow assets from the bundle.
  ...flowReportAssets,
};
