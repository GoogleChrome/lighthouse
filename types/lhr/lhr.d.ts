/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Result as AuditResult} from './audit-result.js';
import AuditDetails from './audit-details.js';
import {ConfigSettings} from './settings.js';

/**
 * The full output of a Lighthouse run.
 */
interface Result {
  /** Gather mode used to collect artifacts for this result. */
  gatherMode: Result.GatherMode;
  /** The URL that Lighthouse initially navigated to. Will be `undefined` in timespan/snapshot. */
  requestedUrl?: string;
  /** URL of the last document request during a Lighthouse navigation. Will be `undefined` in timespan/snapshot. */
  mainDocumentUrl?: string;
  /**
   * For historical reasons, this will always be the same as `mainDocumentUrl`.
   * @deprecated
   */
  finalUrl?: string;
  /** The URL displayed on the page after Lighthouse finishes. */
  finalDisplayedUrl: string;
  /** The ISO-8601 timestamp of when the results were generated. */
  fetchTime: string;
  /** The version of Lighthouse with which these results were generated. */
  lighthouseVersion: string;
  /** An object containing the results of the audits, keyed by the audits' `id` identifier. */
  audits: Record<string, AuditResult>;
  /** The top-level categories, their overall scores, and member audits. */
  categories: Record<string, Result.Category>;
  /** Descriptions of the groups referenced by CategoryMembers. */
  categoryGroups?: Record<string, Result.ReportGroup>;

  /** The config settings used for these results. */
  configSettings: ConfigSettings;
  /** List of top-level warnings for this Lighthouse run. */
  runWarnings: string[];
  /** A top-level error message that, if present, indicates a serious enough problem that this Lighthouse result may need to be discarded. */
  runtimeError?: {
    code: string;
    message: string;
    /** Error stack from any fatal error. */
    errorStack?: string;
    /** Artifact the threw the fatal error. */
    artifactKey?: string;
  };
  /** The User-Agent string of the browser used run Lighthouse for these results. */
  userAgent: string;
  /** Information about the environment in which Lighthouse was run. */
  environment: Result.Environment;
  /** Execution timings for the Lighthouse run */
  timing: Result.Timing;
  /** Strings for the report and the record of all formatted string locations in the LHR and their corresponding source values. */
  i18n: {
    rendererFormattedStrings: Record<string, string>;
    /** Optional because LR has many old LHRs that return nothing for this property. */
    icuMessagePaths?: Result.IcuMessagePaths;
  };
  /** An array containing the result of all stack packs. */
  stackPacks?: Result.StackPack[];
  /** All the origins encountered during this Lighthouse run, and information about what web property (aka "entity") they belong to. Won't be present for snapshot mode. */
  entities?: Result.Entities;
  /** Screenshot taken of the full page, with node rects referencing audit results. If there was an error with collection, this is null. If disabled via the disableFullPageScreenshot setting, this is undefined. */
  fullPageScreenshot?: Result.FullPageScreenshot | null;
}

// Result namespace
declare module Result {
  interface Environment {
    /** The user agent string of the version of Chrome used. */
    hostUserAgent: string;
    /** The user agent string that was sent over the network. */
    networkUserAgent: string;
    /** The benchmark index number that indicates rough device class. */
    benchmarkIndex: number;
    /** The version of libraries with which these results were generated. Ex: axe-core. */
    credits?: Record<string, string|undefined>,
  }

  interface Timing {
    entries: MeasureEntry[];
    total: number;
  }

  interface MeasureEntry {
    // From PerformanceEntry
    readonly duration: number;
    readonly entryType: string;
    readonly name: string;
    readonly startTime: number;
    /** Whether timing entry was collected during artifact gathering. */
    gather?: boolean;
  }

  interface Category {
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
    /** An array of all the modes supported by the category. */
    supportedModes?:  Result.GatherMode[];
  }

  interface AuditRef {
    /** Matches the `id` of an Audit.Result. */
    id: string;
    /** The weight of the audit's score in the overall category score. */
    weight: number;
    /** Optional grouping within the category. Matches the key of a Result.Group. */
    group?: string;
    /** The conventional acronym for the audit/metric. */
    acronym?: string;
  }

  interface ReportGroup {
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
  interface StackPack {
    /** The unique string ID for this stack pack. */
    id: string;
    /** The title of the stack pack, to be displayed in the report. */
    title: string;
    /** A base64 data url to be used as the stack pack's icon. */
    iconDataURL: string;
    /** A set of descriptions for some of Lighthouse's audits, keyed by audit `id`. */
    descriptions: Record<string, string>;
  }

  interface FullPageScreenshot {
    screenshot: {
      /** Base64 image data URL. */
      data: string;
      width: number;
      height: number;
    };
    nodes: Record<string, {id?: string} & AuditDetails.Rect>;
  }

  /**
   * Entity classification for the run, for resolving URLs/items to entities in report.
   */
  interface Entities extends Array<LhrEntity> {}

  /**
   * An entity that's either recognized by third-party-web or made up by Lighthouse.
   */
  interface LhrEntity {
    /** Name of the entity. Maps to third-party-web unique name for recognized entities and a root domain name for the unrecognized. */
    name: string;
    /** Homepage URL for a recognized entity, if available in third-party-web. */
    homepage?: string;
    /** Category name that the entity belongs to, if available. */
    category?: string;
    /** Is this entity the first party? */
    isFirstParty?: boolean;
    /** Is this entity recognized by third-party-web? */
    isUnrecognized?: boolean;
    /** List of origin strings that belong to this entity found in network records. */
    origins: Array<string>;
  }

  /**
   * Info about an `LH.IcuMessage` value that was localized to a string when
   * included in the LHR. Value is either a
   *  - path (`_.set()` style) into the original object where the message was replaced
   *  - those paths and a set of values that were inserted into the localized strings.
   */
  type IcuMessagePath = string | {path: string, values: Record<string, string | number>};

  /**
   * A representation of `LH.IcuMessage`s that were in an object (e.g. `LH.Result`)
   * and have been replaced by localized strings. `LH.Result.IcuMessagePaths` provides a
   * mapping that can be used to change the locale of the object again.
   * Keyed by ids from the locale message json files, values are information on
   * how to replace the string if needed.
   */
  interface IcuMessagePaths {
    [i18nId: string]: IcuMessagePath[];
  }

  /** Gather mode used to collect artifacts. */
  type GatherMode = 'navigation'|'timespan'|'snapshot';
}

export default Result;
