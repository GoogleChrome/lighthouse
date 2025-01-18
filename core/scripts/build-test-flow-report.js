/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// node core/scripts/build-test-flow-report.js

import fs from 'fs';

import open from 'open';

import {ReportGenerator} from '../../report/generator/report-generator.js';
import {LH_ROOT} from '../../shared/root.js';
import {readJson} from '../test/test-utils.js';

const flow = readJson('core/test/fixtures/user-flows/reports/sample-flow-result.json');
const htmlReport = ReportGenerator.generateFlowReportHtml(flow);
const filepath = `${LH_ROOT}/dist/sample-reports/flow-report/index.html`;
fs.writeFileSync(filepath, htmlReport);
open(filepath);
