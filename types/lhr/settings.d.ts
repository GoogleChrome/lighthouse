/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {Protocol as Crdp} from 'devtools-protocol/types/protocol.js';

export type Locale = 'en-US'|'en'|'en-AU'|'en-GB'|'en-IE'|'en-SG'|'en-ZA'|'en-IN'|'ar-XB'|'ar'|'bg'|'ca'|'cs'|'da'|'de'|'el'|'en-XA'|'en-XL'|'es'|'es-419'|'es-AR'|'es-BO'|'es-BR'|'es-BZ'|'es-CL'|'es-CO'|'es-CR'|'es-CU'|'es-DO'|'es-EC'|'es-GT'|'es-HN'|'es-MX'|'es-NI'|'es-PA'|'es-PE'|'es-PR'|'es-PY'|'es-SV'|'es-US'|'es-UY'|'es-VE'|'fi'|'fil'|'fr'|'he'|'hi'|'hr'|'hu'|'gsw'|'id'|'in'|'it'|'iw'|'ja'|'ko'|'lt'|'lv'|'mo'|'nl'|'nb'|'no'|'pl'|'pt'|'pt-PT'|'ro'|'ru'|'sk'|'sl'|'sr'|'sr-Latn'|'sv'|'ta'|'te'|'th'|'tl'|'tr'|'uk'|'vi'|'zh'|'zh-HK'|'zh-TW';

/** Simulation settings that control the amount of network & cpu throttling in the run. */
export interface ThrottlingSettings {
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

/**
 * Options that are found in both the flags used by the Lighthouse module
 * interface and the Config's `settings` object.
 */
 export interface SharedFlagsSettings {
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
  /**
   * Flag indicating which kinds of browser storage should be reset for the audit.
   * Cookies are not cleared by default, so the user isn't logged out.
   * indexeddb, websql, and localstorage are not cleared by default to prevent
   * loss of potentially important data.
   * https://chromedevtools.github.io/debugger-protocol-viewer/tot/Storage/#type-StorageType
   */
  clearStorageTypes?: Crdp.Storage.StorageType[];
  /** Flag indicating that Lighthouse should pause after page load to wait for the user's permission to continue the audit. */
  debugNavigation?: boolean;
  /** If set to true, will skip the initial navigation to about:blank. */
  skipAboutBlank?: boolean;
  /** If set to true, gatherers should avoid any behavior that may be destructive to the page state. (e.g. extra navigations, resizing the viewport) */
  usePassiveGathering?: boolean;

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
  /** If present, the run should only conduct this list of audits. */
  onlyAudits?: string[] | null;
  /** If present, the run should only conduct this list of categories. */
  onlyCategories?: string[] | null;
  /** If present, the run should skip this list of audits. */
  skipAudits?: string[] | null;
  /** List of extra HTTP Headers to include. */
  extraHeaders?: Record<string, string> | null; // Matches `Protocol.Network.Headers`.
  /** How Lighthouse was run, e.g. from the Chrome extension or from the npm module */
  channel?: string
  /** Precomputed lantern estimates to use instead of observed analysis. */
  precomputedLanternData?: PrecomputedLanternData | null;

  /** The number of milliseconds to wait after FCP until the page should be considered loaded. */
  pauseAfterFcpMs?: number;
  /** The number of milliseconds to wait after the load event until the page should be considered loaded. */
  pauseAfterLoadMs?: number;
  /** The number of milliseconds to wait between high priority network requests or 3 simulataneous requests before the page should be considered loaded. */
  networkQuietThresholdMs?: number;
  /** The number of milliseconds to wait between long tasks until the page should be considered loaded. */
  cpuQuietThresholdMs?: number;
  /** The URL to use for the "blank" neutral page in between navigations. Defaults to `about:blank`. */
  blankPage?: string;
  /** Disables collection of the full page screenshot, which can be rather large and possibly leave the page in an undesirable state. */
  disableFullPageScreenshot?: boolean;

  /** Disables failing on 404 status code, and instead issues a warning */
  ignoreStatusCode?: boolean;
}

export interface ConfigSettings extends Required<SharedFlagsSettings> {
  throttling: Required<ThrottlingSettings>;
  screenEmulation: ScreenEmulationSettings;
}
