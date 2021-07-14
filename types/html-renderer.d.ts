/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import _CategoryRenderer = require('../report/renderer/category-renderer.js');
import _TemplateComponents = require('../report/renderer/template-components.js');
import _CriticalRequestChainRenderer = require('../report/renderer/crc-details-renderer.js');
import _SnippetRenderer = require('../report/renderer/snippet-renderer.js');
import _ElementScreenshotRenderer = require('../report/renderer/element-screenshot-renderer.js');
import _DetailsRenderer = require('../report/renderer/details-renderer.js');
import _DOM = require('../report/renderer/dom.js');
import _I18n = require('../report/renderer/i18n.js');
import _PerformanceCategoryRenderer = require('../report/renderer/performance-category-renderer.js');
import _PwaCategoryRenderer = require('../report/renderer/pwa-category-renderer.js');
import _ReportRenderer = require('../report/renderer/report-renderer.js');
import _ReportUIFeatures = require('../report/renderer/report-ui-features.js');
import _Util = require('../report/renderer/util.js');
import _TextEncoding = require('../report/renderer/text-encoding.js');
import _prepareLabData = require('../report/renderer/psi.js');
import _FileNamer = require('../lighthouse-core/lib/file-namer.js');

declare global {
  var CategoryRenderer: typeof _CategoryRenderer;
  var CriticalRequestChainRenderer: typeof _CriticalRequestChainRenderer;
  var SnippetRenderer: typeof _SnippetRenderer;
  var ElementScreenshotRenderer: typeof _ElementScreenshotRenderer
  var DetailsRenderer: typeof _DetailsRenderer;
  var DOM: typeof _DOM;
  var getFilenamePrefix: typeof _FileNamer.getFilenamePrefix;
  var I18n: typeof _I18n;
  var PerformanceCategoryRenderer: typeof _PerformanceCategoryRenderer;
  var PwaCategoryRenderer: typeof _PwaCategoryRenderer;
  var ReportRenderer: typeof _ReportRenderer;
  var ReportUIFeatures: typeof _ReportUIFeatures;
  var Util: typeof _Util;
  var TemplateComponents: typeof _TemplateComponents;
  var TextEncoding: typeof _TextEncoding;
  var prepareLabData: typeof _prepareLabData;
  var CompressionStream: {
    prototype: CompressionStream,
    new (format: string): CompressionStream,
  };

  interface CompressionStream extends GenericTransformStream {
    readonly format: string;
  }

  interface Window {
    CategoryRenderer: typeof _CategoryRenderer;
    CriticalRequestChainRenderer: typeof _CriticalRequestChainRenderer;
    SnippetRenderer: typeof _SnippetRenderer;
    ElementScreenshotRenderer: typeof _ElementScreenshotRenderer
    DetailsRenderer: typeof _DetailsRenderer;
    DOM: typeof _DOM;
    I18n: typeof _I18n;
    PerformanceCategoryRenderer: typeof _PerformanceCategoryRenderer;
    PwaCategoryRenderer: typeof _PwaCategoryRenderer;
    ReportRenderer: typeof _ReportRenderer;
    ReportUIFeatures: typeof _ReportUIFeatures;
    Util: typeof _Util;
    TemplateComponents: typeof _TemplateComponents;
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
        relevantMetrics?: LH.ReportResult.AuditRef[];
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
    export module Renderer {
      /** String enum of possible component ids to clone */
      export type componentIds = 'scorescale' | 'topbar' | 'audit' | 'opportunity';
    }
  }
}

// empty export to keep file a module
export {}
