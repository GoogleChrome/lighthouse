/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {ReportGenerator as _ReportGenerator} from '../../report/generator/report-generator.js';
import {Logger as _Logger} from '../../report/renderer/logger.js';
import {LighthouseReportViewer as _LighthouseReportViewer} from '../app/src/lighthouse-report-viewer.js';
import 'google.analytics';

// Import for needed DOM type augmentation.
import '../../report/types/augment-dom';

// Import for LH globals needed for report files.
import '../../report/types/html-renderer';

import '../../flow-report/types/flow-report';

declare global {
  var ReportGenerator: typeof _ReportGenerator;
  var logger: _Logger;
  var idbKeyval: typeof import('idb-keyval');

  interface Window {
    viewer: _LighthouseReportViewer;
    ga: UniversalAnalytics.ga;
    __hash?: string;

    // Inserted by viewer build.
    LH_CURRENT_VERSION: string;
  }
}
