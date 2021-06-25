/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import _Crdp from 'devtools-protocol/types/protocol';
import _CrdpMappings from 'devtools-protocol/types/protocol-mapping';
import {ParseSelectorToTagNames} from 'typed-query-selector/parser';

/** Merge properties of the types in union `T`. Where properties overlap, property types becomes the union of the two (or more) possible types. */
type MergeTypes<T> = {
  [K in (T extends unknown ? keyof T : never)]: T extends Record<K, infer U> ? U : never;
};

// Helper types for strict querySelector/querySelectorAll that includes the overlap
// between HTML and SVG node names (<a>, <script>, etc).
// see https://github.com/GoogleChrome/lighthouse/issues/12011
type HtmlAndSvgElementTagNameMap = MergeTypes<HTMLElementTagNameMap|SVGElementTagNameMap> & {
  // Fall back to Element (base of HTMLElement and SVGElement) if no specific tag name matches.
  [id: string]: Element;
};
type QuerySelectorParse<I extends string> = ParseSelectorToTagNames<I> extends infer TagNames ?
  TagNames extends Array<string> ?
    HtmlAndSvgElementTagNameMap[TagNames[number]] :
    Element: // Fall back for queries typed-query-selector fails to parse, e.g. `'[alt], [aria-label]'`.
  never;

declare global {
  // Augment Intl to include
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/getCanonicalLocales
  namespace Intl {
    var getCanonicalLocales: (locales?: string | Array<string>) => Array<string>;
  }

  /** Make properties K in T optional. */
  type MakeOptional<T, K extends keyof T> = {
    [P in Exclude<keyof T, K>]: T[P]
  } & {
    [P in K]+?: T[P]
  }

  /** An object with the keys in the union K mapped to themselves as values. */
  type SelfMap<K extends string> = {
    [P in K]: P;
  };

  /** Make optional all properties on T and any properties on object properties of T. */
  type RecursivePartial<T> =
    // Recurse into arrays and tuples: elements aren't (newly) optional, but any properties they have are.
    T extends (infer U)[] ? RecursivePartial<U>[] :
    // Recurse into objects: properties and any of their properties are optional.
    T extends object ? {[P in keyof T]?: RecursivePartial<T[P]>} :
    // Strings, numbers, etc. (terminal types) end here.
    T;

  /** Recursively makes all properties of T read-only. */
  export type Immutable<T> =
    T extends Function ? T :
    T extends Array<infer R> ? ImmutableArray<R> :
    T extends Map<infer K, infer V> ? ImmutableMap<K, V> :
    T extends Set<infer M> ? ImmutableSet<M> :
    T extends object ? ImmutableObject<T> :
    T

  // Intermediate immutable types. Prefer e.g. Immutable<Set<T>> over direct use.
  type ImmutableArray<T> = ReadonlyArray<Immutable<T>>;
  type ImmutableMap<K, V> = ReadonlyMap<Immutable<K>, Immutable<V>>;
  type ImmutableSet<T> = ReadonlySet<Immutable<T>>;
  type ImmutableObject<T> = {
    readonly [K in keyof T]: Immutable<T[K]>;
  };

  /**
   * Exclude void from T
   */
  type NonVoid<T> = T extends void ? never : T;

  /** Remove properties K from T. */
  type StrictOmit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

  /** Obtain the type of the first parameter of a function. */
  type FirstParamType<T extends (arg1: any, ...args: any[]) => any> =
    T extends (arg1: infer P, ...args: any[]) => any ? P : never;

  type FlattenedPromise<A> = Promise<A extends Promise<infer X> ? X : A>;

  type UnPromise<T> = T extends Promise<infer U> ? U : T

  /**
   * Split string `S` on delimiter `D`.
   * From https://github.com/microsoft/TypeScript/pull/40336#issue-476562046
   */
  type Split<S extends string, D extends string> =
    string extends S ? string[] :
    S extends '' ? [] :
    S extends `${infer T}${D}${infer U}` ? [T, ...Split<U, D>] :
    [S];

  /**
  * Join an array of strings using camelCase capitalization rules.
  */
  type StringsToCamelCase<T extends unknown[]> =
    T extends [] ? '' :
    T extends [string, ...infer U] ? `${T[0]}${Capitalize<StringsToCamelCase<U>>}` :
    string;

  /**
  * If `S` is a kebab-style string `S`, convert to camelCase.
  */
  type KebabToCamelCase<S> = S extends string ? StringsToCamelCase<Split<S, '-'>> : S;

  /** Returns T with any kebab-style property names rewritten as camelCase. */
  type CamelCasify<T> = {
    [K in keyof T as KebabToCamelCase<K>]: T[K];
  }

  module LH {
    // re-export useful type modules under global LH module.
    export import Crdp = _Crdp;
    export import CrdpEvents = _CrdpMappings.Events;
    export import CrdpCommands = _CrdpMappings.Commands;

    /** Simulation settings that control the amount of network & cpu throttling in the run. */
    interface ThrottlingSettings {
      /** The round trip time in milliseconds. */
      rttMs?: number;
      /** The network throughput in kilobits per second. */
      throughputKbps?: number;
      // devtools settings
      /** The network request latency in milliseconds. */
      requestLatencyMs?: number;
      /** The network download throughput in kilobits per second. */
      downloadThroughputKbps?: number;
      /** The network upload throughput in kilobits per second. */
      uploadThroughputKbps?: number;
      // used by both
      /** The amount of slowdown applied to the cpu (1/<cpuSlowdownMultiplier>). */
      cpuSlowdownMultiplier?: number
    }

    export interface PrecomputedLanternData {
      additionalRttByOrigin: {[origin: string]: number};
      serverResponseTimeByOrigin: {[origin: string]: number};
    }

    export type Locale = 'en-US'|'en'|'en-AU'|'en-GB'|'en-IE'|'en-SG'|'en-ZA'|'en-IN'|'ar-XB'|'ar'|'bg'|'ca'|'cs'|'da'|'de'|'el'|'en-XA'|'en-XL'|'es'|'es-419'|'es-AR'|'es-BO'|'es-BR'|'es-BZ'|'es-CL'|'es-CO'|'es-CR'|'es-CU'|'es-DO'|'es-EC'|'es-GT'|'es-HN'|'es-MX'|'es-NI'|'es-PA'|'es-PE'|'es-PR'|'es-PY'|'es-SV'|'es-US'|'es-UY'|'es-VE'|'fi'|'fil'|'fr'|'he'|'hi'|'hr'|'hu'|'gsw'|'id'|'in'|'it'|'iw'|'ja'|'ko'|'lt'|'lv'|'mo'|'nl'|'nb'|'no'|'pl'|'pt'|'pt-PT'|'ro'|'ru'|'sk'|'sl'|'sr'|'sr-Latn'|'sv'|'ta'|'te'|'th'|'tl'|'tr'|'uk'|'vi'|'zh'|'zh-HK'|'zh-TW';

    export type OutputMode = 'json' | 'html' | 'csv';

    export type ScreenEmulationSettings = {
      /** Overriding width value in pixels (minimum 0, maximum 10000000). 0 disables the override. */
      width: number;
      /** Overriding height value in pixels (minimum 0, maximum 10000000). 0 disables the override. */
      height: number;
      /** Overriding device scale factor value. 0 disables the override. */
      deviceScaleFactor: number;
      /** Whether to emulate mobile device. This includes viewport meta tag, overlay scrollbars, text autosizing and more. */
      mobile: boolean;
      /** Whether screen emulation is disabled. If true, the other emulation settings are ignored. */
      disabled: boolean;
    };

    export type DisplayStrings = {
       /** A user-facing string to display in Runtime Settings for the Device row */
       deviceSetting?: string;
       /** A user-facing string to display in Runtime Settings for the Network throttling row */
       networkThrottlingSetting?: string;
       /** A user-facing string to display in Runtime Settings for the CPU throttling row */
       cpuThrottlingSetting?: string;
    }

    /**
     * Options that are found in both the flags used by the Lighthouse module
     * interface and the Config's `settings` object.
     */
    interface SharedFlagsSettings {
      /** The type(s) of report output to be produced. */
      output?: OutputMode|OutputMode[];
      /** The locale to use for the output. */
      locale?: Locale;
      /** The maximum amount of time to wait for a page content render, in ms. If no content is rendered within this limit, the run is aborted with an error. */
      maxWaitForFcp?: number;
      /** The maximum amount of time to wait for a page to load, in ms. */
      maxWaitForLoad?: number;
      /** List of URL patterns to block. */
      blockedUrlPatterns?: string[] | null;
      /** Comma-delimited list of trace categories to include. */
      additionalTraceCategories?: string | null;
      /** Flag indicating the run should only audit. */
      auditMode?: boolean | string;
      /** Flag indicating the run should only gather. */
      gatherMode?: boolean | string;
      /** Flag indicating that the browser storage should not be reset for the audit. */
      disableStorageReset?: boolean;

      /** How Lighthouse should interpret this run in regards to scoring performance metrics and skipping mobile-only tests in desktop. Must be set even if throttling/emulation is being applied outside of Lighthouse. */
      formFactor?: 'mobile'|'desktop';
      /** Screen emulation properties (width, height, dpr, mobile viewport) to apply or an object of `{disabled: true}` if Lighthouse should avoid applying screen emulation. If either emulation is applied outside of Lighthouse, or it's being run on a mobile device, it typically should be set to disabled. For desktop, we recommend applying consistent desktop screen emulation. */
      screenEmulation?: Partial<ScreenEmulationSettings>;
      /** User Agent string to apply, `false` to not change the host's UA string, or `true` to use Lighthouse's default UA string. */
      emulatedUserAgent?: string | boolean;

      /** The method used to throttle the network. */
      throttlingMethod?: 'devtools'|'simulate'|'provided';
      /** The throttling config settings. */
      throttling?: ThrottlingSettings;
      /* Optional object of user-facing strings to be used instead of Lighthouse's given values. */
      displayStrings?: DisplayStrings;
      /** If present, the run should only conduct this list of audits. */
      onlyAudits?: string[] | null;
      /** If present, the run should only conduct this list of categories. */
      onlyCategories?: string[] | null;
      /** If present, the run should skip this list of audits. */
      skipAudits?: string[] | null;
      /** List of extra HTTP Headers to include. */
      extraHeaders?: Crdp.Network.Headers | null; // See extraHeaders TODO in bin.js
      /** How Lighthouse was run, e.g. from the Chrome extension or from the npm module */
      channel?: string
      /** Precomputed lantern estimates to use instead of observed analysis. */
      precomputedLanternData?: PrecomputedLanternData | null;
      /** The budget.json object for LightWallet. */
      budgets?: Array<Budget> | null;
    }

    /**
     * Extends the flags in SharedFlagsSettings with flags used to configure the
     * Lighthouse module but will not end up in the Config settings.
     */
    export interface Flags extends SharedFlagsSettings {
      /** The port to use for the debugging protocol, if manually connecting. */
      port?: number;
      /** The hostname to use for the debugging protocol, if manually connecting. */
      hostname?: string;
      /** The level of logging to enable. */
      logLevel?: 'silent'|'error'|'info'|'verbose';
      /** The path to the config JSON. */
      configPath?: string;
      /** Run the specified plugins. */
      plugins?: string[];
    }

    /**
     * Extends the flags accepted by the Lighthouse module with additional flags
     * used just for controlling the CLI.
     */
    export interface CliFlags extends Flags {
      _: string[];
      chromeIgnoreDefaultFlags: boolean;
      chromeFlags: string | string[];
      /** Output path for the generated results. */
      outputPath?: string;
      /** Flag to save the trace contents and screenshots to disk. */
      saveAssets: boolean;
      /** Flag to open the report immediately. */
      view: boolean;
      /** Flag to enable error reporting. */
      enableErrorReporting?: boolean;
      /** Flag to print a list of all audits + categories. */
      listAllAudits: boolean;
      /** Flag to print a list of all required trace categories. */
      listTraceCategories: boolean;
      /** A preset audit of selected audit categories to run. */
      preset?: 'experimental'|'perf'|'desktop';
      /** A flag to enable logLevel 'verbose'. */
      verbose: boolean;
      /** A flag to enable logLevel 'silent'. */
      quiet: boolean;
      /** A flag to print the normalized config for the given config and options, then exit. */
      printConfig: boolean;
      /** Path to the file where precomputed lantern data should be read from. */
      precomputedLanternDataPath?: string;
      /** Path to the file where precomputed lantern data should be written to. */
      lanternDataOutputPath?: string;
      /** Path to the budget.json file for LightWallet. */
      budgetPath?: string | null;

      // The following are given defaults in cli-flags, so are not optional like in Flags or SharedFlagsSettings.
      output: OutputMode[];
      port: number;
      hostname: string;
    }

    export interface RunnerResult {
      lhr: Result;
      report: string|string[];
      artifacts: Artifacts;
    }

    export interface ReportCategory {
      name: string;
      description: string;
      audits: ReportAudit[];
    }

    export interface ReportAudit {
      id: string;
      weight: number;
      group: string;
    }

    /**
     * A record of DevTools Debugging Protocol events.
     */
    export type DevtoolsLog = Array<Protocol.RawEventMessage>;

    export interface Trace {
      traceEvents: TraceEvent[];
      metadata?: {
        'cpu-family'?: number;
      };
      [futureProps: string]: any;
    }

    /** The type of the Profile & ProfileChunk event in Chromium traces. Note that this is subtly different from Crdp.Profiler.Profile. */
    export interface TraceCpuProfile {
      nodes?: Array<{id: number, callFrame: {functionName: string, url?: string}, parent?: number}>
      samples?: Array<number>
      timeDeltas?: Array<number>
    }

    /**
     * @see https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU/preview
     */
    export interface TraceEvent {
      name: string;
      cat: string;
      args: {
        fileName?: string;
        snapshot?: string;
        sync_id?: string;
        beginData?: {
          frame?: string;
          startLine?: number;
          url?: string;
        };
        data?: {
          frame?: string;
          isLoadingMainFrame?: boolean;
          documentLoaderURL?: string;
          frames?: {
            frame: string;
            parent?: string;
            processId?: number;
          }[];
          page?: string;
          readyState?: number;
          requestId?: string;
          startTime?: number;
          timeDeltas?: TraceCpuProfile['timeDeltas'];
          cpuProfile?: TraceCpuProfile;
          callFrame?: Required<TraceCpuProfile>['nodes'][0]['callFrame']
          /** Marker for each synthetic CPU profiler event for the range of _potential_ ts values. */
          _syntheticProfilerRange?: {
            earliestPossibleTimestamp: number
            latestPossibleTimestamp: number
          }
          stackTrace?: {
            url: string
          }[];
          styleSheetUrl?: string;
          timerId?: string;
          url?: string;
          is_main_frame?: boolean;
          cumulative_score?: number;
          id?: string;
          nodeId?: number;
          impacted_nodes?: Array<{
            node_id: number,
            old_rect?: Array<number>,
            new_rect?: Array<number>,
          }>;
          score?: number;
          weighted_score_delta?: number;
          had_recent_input?: boolean;
          compositeFailed?: number;
          unsupportedProperties?: string[];
          size?: number;
        };
        frame?: string;
        name?: string;
        labels?: string;
      };
      pid: number;
      tid: number;
      /** Timestamp of the event in microseconds. */
      ts: number;
      dur: number;
      ph: 'B'|'b'|'D'|'E'|'e'|'F'|'I'|'M'|'N'|'n'|'O'|'R'|'S'|'T'|'X';
      s?: 't';
      id?: string;
      id2?: {
        local?: string;
      };
    }

    export interface DevToolsJsonTarget {
      description: string;
      devtoolsFrontendUrl: string;
      id: string;
      title: string;
      type: string;
      url: string;
      webSocketDebuggerUrl: string;
    }
  }

  interface Window {
    // Cached native functions/objects for use in case the page overwrites them.
    // See: `executionContext.cacheNativesOnNewDocument`.
    __nativePromise: PromiseConstructor;
    __nativePerformance: Performance;
    __nativeURL: typeof URL;
    __ElementMatches: Element['matches'];

    /** Used for monitoring long tasks in the test page. */
    ____lastLongTask?: number;

    /** Used by FullPageScreenshot gatherer. */
    __lighthouseNodesDontTouchOrAllVarianceGoesAway: Map<Element, string>;
    __lighthouseExecutionContextId?: number;

    // Not defined in tsc yet: https://github.com/microsoft/TypeScript/issues/40807
    requestIdleCallback(callback: (deadline: {didTimeout: boolean, timeRemaining: () => DOMHighResTimeStamp}) => void, options?: {timeout: number}): number;
  }

  // Stricter querySelector/querySelectorAll using typed-query-selector.
  interface ParentNode {
    querySelector<S extends string>(selector: S): QuerySelectorParse<S>;
    querySelectorAll<S extends string>(selector: S): NodeListOf<QuerySelectorParse<S>>;
  }
}
