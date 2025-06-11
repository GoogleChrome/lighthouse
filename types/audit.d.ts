/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {ArbitraryEqualityMap} from '../core/lib/arbitrary-equality-map.js';
import {Artifacts} from './artifacts.js';
import AuditDetails from './lhr/audit-details.js';
import Config from './config.js';
import Gatherer from './gatherer.js';
import {IcuMessage} from './lhr/i18n.js';
import * as AuditResult from './lhr/audit-result.js';
import Util from './utility-types.js';

declare module Audit {
  export import Details = AuditDetails;
  export type Result = AuditResult.Result;
  export type ScoreDisplayMode = AuditResult.ScoreDisplayMode;
  export type ScoreDisplayModes = AuditResult.ScoreDisplayModes;
  export type MetricSavings = AuditResult.MetricSavings;

  export type ProductMetricSavings = {
    FCP?: number;
    LCP?: number;
    TBT?: number;
    CLS?: number;
    INP?: number;
  };

  type Context = Util.Immutable<{
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

  interface ScoreOptions {
    p10: number;
    median: number;
  }

  interface Meta {
    /** The string identifier of the audit, in kebab case. */
    id: string;
    /** Short, user-visible title for the audit when successful. */
    title: string | IcuMessage;
    /** Short, user-visible title for the audit when failing. */
    failureTitle?: string | IcuMessage;
    /** A more detailed description that describes why the audit is important and links to Lighthouse documentation on the audit; markdown links supported. */
    description: string | IcuMessage;
    /** A list of the members of LH.Artifacts that must be present for the audit to execute. */
    requiredArtifacts: Array<keyof Artifacts>;
    /** A list of the members of LH.Artifacts that augment the audit, but aren't necessary. For internal use only with experimental-config. */
    __internalOptionalArtifacts?: Array<keyof Artifacts>;
    /** A string identifying how the score should be interpreted for display. */
    scoreDisplayMode?: AuditResult.ScoreDisplayMode;
    /** A list of gather modes that this audit is applicable to. */
    supportedModes?: Gatherer.GatherMode[],
    /** A number indicating how much guidance Lighthouse provides to solve the problem in this audit on a 1-3 scale. Higher means more guidance. */
    guidanceLevel?: number;
    /** A list of audit ids that this audit replaces. Used to ensure the report does not render the audits in this list at the same time as the audit which contains the list. */
    replacesAudits?: string[];
  }

  interface ByteEfficiencyItem extends AuditDetails.OpportunityItem {
    url: string;
    wastedBytes: number;
    totalBytes: number;
    wastedPercent?: number;
  }

  // TODO: consider making some of the `string | IcuMessage` into just `IcuMessage` to require i18n.

  /** The shared properties of an Audit.Product whether it has a numericValue or not. We want to enforce `numericUnit` accompanying `numericValue` whenever it is set, so the final Audit.Product type is a discriminated union on `'numericValue' in audit`*/
  interface ProductBase {
    /** The scored value of the audit, provided in the range `0-1`, or null if `scoreDisplayMode` indicates not scored. */
    score: number | null;
    /** The i18n'd string value that the audit wishes to display for its results. This value is not necessarily the string version of the `numericValue`. */
    displayValue?: string | IcuMessage;
    /** An explanation of why the audit failed on the test page. */
    explanation?: string | IcuMessage;
    /** Error message from any exception thrown while running this audit. */
    errorMessage?: string | IcuMessage;
    /** Error stack from any exception thrown while running this audit. */
    errorStack?: string;
    warnings?: Array<string | IcuMessage>;
    /** Overrides scoreDisplayMode with notApplicable if set to true */
    notApplicable?: boolean;
    /** Extra information about the page provided by some types of audits, in one of several possible forms that can be rendered in the HTML report. */
    details?: AuditDetails;
    /** If an audit encounters unusual execution circumstances, strings can be put in this optional array to add top-level warnings to the LHR. */
    runWarnings?: Array<IcuMessage>;
    /** Estimates of how much this audit affects various performance metrics. Values will be in the unit of the respective metrics. */
    metricSavings?: ProductMetricSavings;
    /** Score details including p10 and median for calculating an audit's log-normal score. */
    scoringOptions?: ScoreOptions;
    /** A string identifying how the score should be interpreted for display. Overrides audit meta `scoreDisplayMode` if defined. */
    scoreDisplayMode?: AuditResult.ScoreDisplayMode;
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
  type Product = NonNumericProduct | NumericProduct;
}

export default Audit;
