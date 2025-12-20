/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import LHError = require('../lighthouse-core/lib/lh-error.js');
import Util = require('../lighthouse-core/report/html/renderer/util.js');

declare global {
  module LH {
    export type LighthouseError = LHError;

    export type I18NMessageValuesEntry = {path: string, values:  Record<string, string | number>};
    export type I18NMessageEntry = string | I18NMessageValuesEntry;

    export interface I18NMessages {
      [icuMessageId: string]: I18NMessageEntry[];
    }

    export type I18NRendererStrings = typeof Util['UIStrings'];

    export interface Environment {
      /** The user agent string of the version of Chrome used. */
      hostUserAgent: string;
      /** The user agent string that was sent over the network. */
      networkUserAgent: string;
      /** The benchmark index number that indicates rough device class. */
      benchmarkIndex: number;
    }

    /**
     * The full output of a Lighthouse run.
     */
    export interface Result {
      /** The URL that was supplied to Lighthouse and initially navigated to. */
      requestedUrl: string;
      /** The post-redirects URL that Lighthouse loaded. */
      finalUrl: string;
      /** The ISO-8601 timestamp of when the results were generated. */
      fetchTime: string;
      /** The version of Lighthouse with which these results were generated. */
      lighthouseVersion: string;
      /** An object containing the results of the audits, keyed by the audits' `id` identifier. */
      audits: Record<string, Audit.Result>;
      /** The top-level categories, their overall scores, and member audits. */
      categories: Record<string, Result.Category>;
      /** Descriptions of the groups referenced by CategoryMembers. */
      categoryGroups?: Record<string, Result.ReportGroup>;

      /** The config settings used for these results. */
      configSettings: Config.Settings;
      /** List of top-level warnings for this Lighthouse run. */
      runWarnings: string[];
      /** A top-level error message that, if present, indicates a serious enough problem that this Lighthouse result may need to be discarded. */
      runtimeError?: {code: string, message: string};
      /** The User-Agent string of the browser used run Lighthouse for these results. */
      userAgent: string;
      /** Information about the environment in which Lighthouse was run. */
      environment: Environment;
      /** Execution timings for the Lighthouse run */
      timing: Result.Timing;
      /** The record of all formatted string locations in the LHR and their corresponding source values. */
      i18n: {rendererFormattedStrings: I18NRendererStrings, icuMessagePaths: I18NMessages};
      /** An array containing the result of all stack packs. */
      stackPacks?: Result.StackPack[];
    }

    // Result namespace
    export module Result {
      export interface Timing {
        entries: Artifacts.MeasureEntry[];
        total: number;
      }

      export interface Category {
        /** The string identifier of the category. */
        id: string;
        /** The human-friendly name of the category */
        title: string;
        /** A more detailed description of the category and its importance. */
        description?: string;
        /** A description for the manual audits in the category. */
        manualDescription?: string;
        /** The overall score of the category, the weighted average of all its audits. */
        score: number|null;
        /** An array of references to all the audit members of this category. */
        auditRefs: AuditRef[];
      }

      export interface AuditRef {
        /** Matches the `id` of an Audit.Result. */
        id: string;
        /** The weight of the audit's score in the overall category score. */
        weight: number;
        /** Optional grouping within the category. Matches the key of a Result.Group. */
        group?: string;
      }

      export interface ReportGroup {
        /** The title of the display group. */
        title: string;
        /** A brief description of the purpose of the display group. */
        description?: string;
      }

      /**
       * A pack of secondary audit descriptions to be used when a page uses a
       * specific technology stack, giving stack-specific advice for some of
       * Lighthouse's audits.
       */
      export interface StackPack {
        /** The unique string ID for this stack pack. */
        id: string;
        /** The title of the stack pack, to be displayed in the report. */
        title: string;
        /** A base64 data url to be used as the stack pack's icon. */
        iconDataURL: string;
        /** A set of descriptions for some of Lighthouse's audits, keyed by audit `id`. */
        descriptions: Record<string, string>;
      }
    }
  }
}

// empty export to keep file a module
export {}
