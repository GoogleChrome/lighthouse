/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import _CategoryRenderer = require('../lighthouse-core/report/html/renderer/category-renderer.js');
import _CriticalRequestChainRenderer = require('../lighthouse-core/report/html/renderer/crc-details-renderer.js');
import _SnippetRenderer = require('../lighthouse-core/report/html/renderer/snippet-renderer.js');
import _DetailsRenderer = require('../lighthouse-core/report/html/renderer/details-renderer.js');
import _DOM = require('../lighthouse-core/report/html/renderer/dom.js');
import _I18n = require('../lighthouse-core/report/html/renderer/i18n.js');
import _PerformanceCategoryRenderer = require('../lighthouse-core/report/html/renderer/performance-category-renderer.js');
import _PwaCategoryRenderer = require('../lighthouse-core/report/html/renderer/pwa-category-renderer.js');
import _ReportRenderer = require('../lighthouse-core/report/html/renderer/report-renderer.js');
import _ReportUIFeatures = require('../lighthouse-core/report/html/renderer/report-ui-features.js');
import _Util = require('../lighthouse-core/report/html/renderer/util.js');
import _prepareLabData = require('../lighthouse-core/report/html/renderer/psi.js');
import _FileNamer = require('../lighthouse-core/lib/file-namer.js');

declare global {
  var CategoryRenderer: typeof _CategoryRenderer;
  var CriticalRequestChainRenderer: typeof _CriticalRequestChainRenderer;
  var SnippetRenderer: typeof _SnippetRenderer;
  var DetailsRenderer: typeof _DetailsRenderer;
  var DOM: typeof _DOM;
  var getFilenamePrefix: typeof _FileNamer.getFilenamePrefix;
  var I18n: typeof _I18n;
  var PerformanceCategoryRenderer: typeof _PerformanceCategoryRenderer;
  var PwaCategoryRenderer: typeof _PwaCategoryRenderer;
  var ReportRenderer: typeof _ReportRenderer;
  var ReportUIFeatures: typeof _ReportUIFeatures;
  var Util: typeof _Util;
  var prepareLabData: typeof _prepareLabData;

  interface Window {
    CategoryRenderer: typeof _CategoryRenderer;
    CriticalRequestChainRenderer: typeof _CriticalRequestChainRenderer;
    SnippetRenderer: typeof _SnippetRenderer;
    DetailsRenderer: typeof _DetailsRenderer;
    DOM: typeof _DOM;
    I18n: typeof _I18n;
    PerformanceCategoryRenderer: typeof _PerformanceCategoryRenderer;
    PwaCategoryRenderer: typeof _PwaCategoryRenderer;
    ReportRenderer: typeof _ReportRenderer;
    ReportUIFeatures: typeof _ReportUIFeatures;
    Util: typeof _Util;
    prepareLabData: typeof _prepareLabData;
  }

  module LH {
    // During report generation, the LHR object is transformed a bit for convenience
    // Primarily, the auditResult is added as .result onto the auditRef. We're lazy sometimes. It'll be removed in due time.
    export interface ReportResult extends Result {
      categories: Record<string, ReportResult.Category>;
    }
    export module ReportResult {
      export interface Category extends Result.Category {
        auditRefs: Array<AuditRef>
      }

      export interface AuditRef extends Result.AuditRef {
        result: Audit.Result;
        stackPacks?: StackPackDescription[];
      }

      export interface StackPackDescription {
         /** The title of the stack pack. */
        title: string;
        /** A base64 data url to be used as the stack pack's icon. */
        iconDataURL: string;
        /** The stack-specific description for this audit. */
        description: string;
      }
    }
  }
}

// empty export to keep file a module
export {}
