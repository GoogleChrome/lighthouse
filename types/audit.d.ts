/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import ArbitraryEqualityMap = require('../lighthouse-core/lib/arbitrary-equality-map.js');

declare global {
  module LH.Audit {
    export type Context = Immutable<{
      /** audit options */
      options: Record<string, any>;
      settings: Config.Settings;
      /**
       * Nested cache for already-computed computed artifacts. Keyed first on
       * the computed artifact's `name` property, then on input artifact(s).
       * Values are Promises resolving to the computedArtifact result.
       */
      computedCache: Map<string, ArbitraryEqualityMap>;
    }>;

    export interface ScoreOptions {
      p10: number;
      median: number;
    }

    export interface ScoreDisplayModes {
      /** Scores of 0-1 (map to displayed scores of 0-100). */
      NUMERIC: 'numeric';
      /** Pass/fail audit (0 and 1 are only possible scores). */
      BINARY: 'binary';
      /** The audit exists only to tell you to review something yourself. Score is null and should be ignored. */
      MANUAL: 'manual';
      /** The audit is an FYI only, and can't be interpreted as pass/fail. Score is null and should be ignored. */
      INFORMATIVE: 'informative';
      /** The audit turned out to not apply to the page. Score is null and should be ignored. */
      NOT_APPLICABLE: 'notApplicable';
      /** There was an error while running the audit (check `errorMessage` for details). Score is null and should be ignored. */
      ERROR: 'error';
    }

    export type ScoreDisplayMode = Audit.ScoreDisplayModes[keyof Audit.ScoreDisplayModes];

    export interface Meta {
      /** The string identifier of the audit, in kebab case. */
      id: string;
      /** Short, user-visible title for the audit when successful. */
      title: string;
      /** Short, user-visible title for the audit when failing. */
      failureTitle?: string;
      /** A more detailed description that describes why the audit is important and links to Lighthouse documentation on the audit; markdown links supported. */
      description: string;
      /** A list of the members of LH.Artifacts that must be present for the audit to execute. */
      requiredArtifacts: Array<keyof Artifacts>;
      /** A list of the members of LH.Artifacts that augment the audit, but aren't necessary. For internal use only with experimental-config. */
      __internalOptionalArtifacts?: Array<keyof Artifacts>;
      /** A string identifying how the score should be interpreted for display. */
      scoreDisplayMode?: Audit.ScoreDisplayMode;
    }

    export interface ByteEfficiencyItem extends Audit.Details.OpportunityItem {
      url: string;
      wastedBytes: number;
      totalBytes: number;
      wastedPercent?: number;
    }

    /** The shared properties of an Audit.Product whether it has a numericValue or not. We want to enforce `numericUnit` accompanying `numericValue` whenever it is set, so the final Audit.Product type is a discriminated union on `'numericValue' in audit`*/
    interface ProductBase {
      /** The scored value of the audit, provided in the range `0-1`, or null if `scoreDisplayMode` indicates not scored. */
      score: number | null;
      /** The i18n'd string value that the audit wishes to display for its results. This value is not necessarily the string version of the `numericValue`. */
      displayValue?: string;
      /** An explanation of why the audit failed on the test page. */
      explanation?: string;
      /** Error message from any exception thrown while running this audit. */
      errorMessage?: string;
      warnings?: string[];
      /** Deprecated and does not make its way into the Lighthouse report. */
      extendedInfo?: {[p: string]: any};
      /** Overrides scoreDisplayMode with notApplicable if set to true */
      notApplicable?: boolean;
      /** Extra information about the page provided by some types of audits, in one of several possible forms that can be rendered in the HTML report. */
      details?: Audit.Details;
      /** If an audit encounters unusual execution circumstances, strings can be put in this optional array to add top-level warnings to the LHR. */
      runWarnings?: Array<string>;
    }

    /** The Audit.Product type for audits that do not return a `numericValue`. */
    interface NonNumericProduct extends ProductBase {
      numericValue?: never;
    }

    /** The Audit.Product type for audits that do return a `numericValue`. */
    interface NumericProduct extends ProductBase {
      /** A numeric value that has a meaning specific to the audit, e.g. the number of nodes in the DOM or the timestamp of a specific load event. More information can be found in the audit details, if present. */
      numericValue: number;
      /** The unit of `numericValue`, used when the consumer wishes to convert numericValue to a display string. A superset of https://tc39.es/proposal-unified-intl-numberformat/section6/locales-currencies-tz_proposed_out.html#sec-issanctionedsimpleunitidentifier */
      numericUnit: 'byte'|'millisecond'|'element'|'unitless';
    }

    /** Type returned by Audit.audit(). Only score is required.  */
    export type Product = NonNumericProduct | NumericProduct;

    /* Audit result returned in Lighthouse report. All audits offer a description and score of 0-1. */
    export interface Result {
      displayValue?: string;
      /** An explanation of why the audit failed on the test page. */
      explanation?: string;
      /** Error message from any exception thrown while running this audit. */
      errorMessage?: string;
      warnings?: string[];
      /** The scored value of the audit, provided in the range `0-1`, or null if `scoreDisplayMode` indicates not scored. */
      score: number|null;
      /**
       * A string identifying how the score should be interpreted:
       * 'binary': pass/fail audit (0 and 1 are only possible scores).
       * 'numeric': scores of 0-1 (map to displayed scores of 0-100).
       * 'informative': the audit is an FYI only, and can't be interpreted as pass/fail. Score is null and should be ignored.
       * 'notApplicable': the audit turned out to not apply to the page. Score is null and should be ignored.
       * 'manual': The audit exists only to tell you to review something yourself. Score is null and should be ignored.
       * 'error': There was an error while running the audit (check `errorMessage` for details). Score is null and should be ignored.
       */
      scoreDisplayMode: ScoreDisplayMode;
      /** Short, user-visible title for the audit. The text can change depending on if the audit passed or failed. */
      title: string;
      /** The string identifier of the audit, in kebab case. */
      id: string;
      /** A more detailed description that describes why the audit is important and links to Lighthouse documentation on the audit; markdown links supported. */
      description: string;
      /** A numeric value that has a meaning specific to the audit, e.g. the number of nodes in the DOM or the timestamp of a specific load event. More information can be found in the audit details, if present. */
      numericValue?: number;
      /** The unit of `numericValue`, used when the consumer wishes to convert numericValue to a display string. */
      numericUnit?: string;
      /** Extra information about the page provided by some types of audits, in one of several possible forms that can be rendered in the HTML report. */
      details?: Audit.Details;
    }

    export interface Results {
      [metric: string]: Result;
    }

    export type SimpleCriticalRequestNode = {
      [id: string]: {
        request: {
          url: string;
          startTime: number;
          endTime: number;
          responseReceivedTime: number;
          transferSize: number;
        };
        children?: SimpleCriticalRequestNode;
      }
    }

    type MultiCheckAuditP1 = Partial<Record<Artifacts.ManifestValueCheckID, boolean>>;
    type MultiCheckAuditP2 = Partial<Artifacts.ManifestValues>;
    interface MultiCheckAuditP3 {
      failures: Array<string>;
      manifestValues?: undefined;
      allChecks?: undefined;
    }

    export type MultiCheckAuditDetails = MultiCheckAuditP1 & MultiCheckAuditP2 & MultiCheckAuditP3;
  }
}

// empty export to keep file a module
export {}
