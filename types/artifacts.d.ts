/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {parseManifest} from '../core/lib/manifest-parser.js';
import {Simulator} from '../core/lib/dependency-graph/simulator/simulator.js';
import {LighthouseError} from '../core/lib/lh-error.js';
import {NetworkRequest as _NetworkRequest} from '../core/lib/network-request.js';
import speedline from 'speedline-core';
import TextSourceMap from '../core/lib/cdt/generated/SourceMap.js';
import {ArbitraryEqualityMap} from '../core/lib/arbitrary-equality-map.js';
import type { TaskNode as _TaskNode } from '../core/lib/tracehouse/main-thread-tasks.js';
import AuditDetails from './lhr/audit-details'
import Config from './config';
import Gatherer from './gatherer';
import {IcuMessage} from './lhr/i18n';
import LHResult from './lhr/lhr'
import Protocol from './protocol';
import Util from './utility-types.js';
import Audit from './audit.js';

export interface Artifacts extends BaseArtifacts, GathererArtifacts {}

export type FRArtifacts = Util.StrictOmit<Artifacts,
  | 'Fonts'
  | 'Manifest'
  | 'MixedContent'
  | keyof FRBaseArtifacts
>;

/**
 * Artifacts always created by gathering. These artifacts are available to Lighthouse plugins.
 * NOTE: any breaking changes here are considered breaking Lighthouse changes that must be done
 * on a major version bump.
 */
export type BaseArtifacts = UniversalBaseArtifacts & ContextualBaseArtifacts & LegacyBaseArtifacts

export type FRBaseArtifacts = UniversalBaseArtifacts & ContextualBaseArtifacts;

/**
 * The set of base artifacts that are available in every mode of Lighthouse operation.
 */
interface UniversalBaseArtifacts {
  /** The ISO-8601 timestamp of when the test page was fetched and artifacts collected. */
  fetchTime: string;
  /** A set of warnings about unexpected things encountered while loading and testing the page. */
  LighthouseRunWarnings: Array<string | IcuMessage>;
  /** The benchmark index that indicates rough device class. */
  BenchmarkIndex: number;
  /** Many benchmark indexes. Many. */
  BenchmarkIndexes?: number[];
  /** An object containing information about the testing configuration used by Lighthouse. */
  settings: Config.Settings;
  /** The timing instrumentation of the gather portion of a run. */
  Timing: Artifacts.MeasureEntry[];
  /** Device which Chrome is running on. */
  HostFormFactor: 'desktop'|'mobile';
  /** The user agent string of the version of Chrome used. */
  HostUserAgent: string;
  /** Information about how Lighthouse artifacts were gathered. */
  GatherContext: {gatherMode: Gatherer.GatherMode};
}

/**
 * The set of base artifacts whose semantics differ or may be valueless in certain Lighthouse gather modes.
 */
interface ContextualBaseArtifacts {
  /** The URL initially requested and the post-redirects URL that was actually loaded. */
  URL: Artifacts.URL;
  /** If loading the page failed, value is the error that caused it. Otherwise null. */
  PageLoadError: LighthouseError | null;
}

/**
 * The set of base artifacts that were replaced by standard gatherers in Fraggle Rock.
 */
interface LegacyBaseArtifacts {
  /** The user agent string that Lighthouse used to load the page. Set to the empty string if unknown. */
  NetworkUserAgent: string;
  /** Information on detected tech stacks (e.g. JS libraries) used by the page. */
  Stacks: Artifacts.DetectedStack[];
  /** Parsed version of the page's Web App Manifest, or null if none found. This moved to a regular artifact in Fraggle Rock. */
  WebAppManifest: Artifacts.Manifest | null;
  /** Errors preventing page being installable as PWA. This moved to a regular artifact in Fraggle Rock. */
  InstallabilityErrors: Artifacts.InstallabilityErrors;
  /** A set of page-load traces, keyed by passName. */
  traces: {[passName: string]: Trace};
  /** A set of DevTools debugger protocol records, keyed by passName. */
  devtoolsLogs: {[passName: string]: DevtoolsLog};
}

/**
 * Artifacts provided by the default gatherers that are exposed to plugins with a hardended API.
 * NOTE: any breaking changes here are considered breaking Lighthouse changes that must be done
 * on a major version bump.
 */
interface PublicGathererArtifacts {
  /** ConsoleMessages deprecation and intervention warnings, console API calls, and exceptions logged by Chrome during page load. */
  ConsoleMessages: Artifacts.ConsoleMessage[];
  /** All the iframe elements in the page. */
  IFrameElements: Artifacts.IFrameElement[];
  /** The contents of the main HTML document network resource. */
  MainDocumentContent: string;
  /** Information on size and loading for all the images in the page. Natural size information for `picture` and CSS images is only available if the image was one of the largest 50 images. */
  ImageElements: Artifacts.ImageElement[];
  /** All the link elements on the page or equivalently declared in `Link` headers. @see https://html.spec.whatwg.org/multipage/links.html */
  LinkElements: Artifacts.LinkElement[];
  /** The values of the <meta> elements in the head. */
  MetaElements: Array<{name?: string, content?: string, property?: string, httpEquiv?: string, charset?: string, node: Artifacts.NodeDetails}>;
  /** Information on all script elements in the page. Also contains the content of all requested scripts and the networkRecord requestId that contained their content. Note, HTML documents will have one entry per script tag, all with the same requestId. */
  ScriptElements: Array<Artifacts.ScriptElement>;
  /** The dimensions and devicePixelRatio of the loaded viewport. */
  ViewportDimensions: Artifacts.ViewportDimensions;
}

/**
 * Artifacts provided by the default gatherers. Augment this interface when adding additional
 * gatherers. Changes to these artifacts are not considered a breaking Lighthouse change.
 */
export interface GathererArtifacts extends PublicGathererArtifacts,LegacyBaseArtifacts {
  /** The results of running the aXe accessibility tests on the page. */
  Accessibility: Artifacts.Accessibility;
  /** Array of all anchors on the page. */
  AnchorElements: Artifacts.AnchorElement[];
  /** Errors when attempting to use the back/forward cache. */
  BFCacheFailures: Artifacts.BFCacheFailure[];
  /** Array of all URLs cached in CacheStorage. */
  CacheContents: string[];
  /** CSS coverage information for styles used by page's final state. */
  CSSUsage: {rules: LH.Crdp.CSS.RuleUsage[], stylesheets: Artifacts.CSSStyleSheetInfo[]};
  /** The primary log of devtools protocol activity. Used in Fraggle Rock gathering. */
  DevtoolsLog: DevtoolsLog;
  /** Information on the document's doctype(or null if not present), specifically the name, publicId, and systemId.
      All properties default to an empty string if not present */
  Doctype: Artifacts.Doctype | null;
  /** Information on the size of all DOM nodes in the page and the most extreme members. */
  DOMStats: Artifacts.DOMStats;
  /** Relevant attributes and child properties of all <object>s, <embed>s and <applet>s in the page. */
  EmbeddedContent: Artifacts.EmbeddedContentInfo[];
  /** Information for font faces used in the page. */
  Fonts: Artifacts.Font[];
  /** Information on poorly sized font usage and the text affected by it. */
  FontSize: Artifacts.FontSize;
  /** All the input elements, including associated form and label elements. */
  Inputs: {inputs: Artifacts.InputElement[]; forms: Artifacts.FormElement[]; labels: Artifacts.LabelElement[]};
  /** Screenshot of the entire page (rather than just the above the fold content). */
  FullPageScreenshot: Artifacts.FullPageScreenshot | null;
  /** Information about event listeners registered on the global object. */
  GlobalListeners: Array<Artifacts.GlobalListener>;
  /** The issues surfaced in the devtools Issues panel */
  InspectorIssues: Artifacts.InspectorIssues;
  /** JS coverage information for code used during audit. Keyed by script id. */
  // 'url' is excluded because it can be overriden by a magic sourceURL= comment, which makes keeping it a dangerous footgun!
  JsUsage: Record<string, Omit<LH.Crdp.Profiler.ScriptCoverage, 'url'>>;
  /** Parsed version of the page's Web App Manifest, or null if none found. */
  Manifest: Artifacts.Manifest | null;
  /** The URL loaded with interception */
  MixedContent: {url: string};
  /** Size and compression opportunity information for all the images in the page. */
  OptimizedImages: Array<Artifacts.OptimizedImage | Artifacts.OptimizedImageError>;
  /** HTML snippets and node paths from any password inputs that prevent pasting. */
  PasswordInputsWithPreventedPaste: Artifacts.PasswordInputsWithPreventedPaste[];
  /** Size info of all network records sent without compression and their size after gzipping. */
  ResponseCompression: {requestId: string, url: string, mimeType: string, transferSize: number, resourceSize: number, gzipSize?: number}[];
  /** Information on fetching and the content of the /robots.txt file. */
  RobotsTxt: {status: number|null, content: string|null, errorMessage?: string};
  /** Information on all scripts in the page. */
  Scripts: Artifacts.Script[];
  /** Version information for all ServiceWorkers active after the first page load. */
  ServiceWorker: {versions: LH.Crdp.ServiceWorker.ServiceWorkerVersion[], registrations: LH.Crdp.ServiceWorker.ServiceWorkerRegistration[]};
  /** Source maps of scripts executed in the page. */
  SourceMaps: Array<Artifacts.SourceMap>;
  /** Information on <script> and <link> tags blocking first paint. */
  TagsBlockingFirstPaint: Artifacts.TagBlockingFirstPaint[];
  /** Information about tap targets including their position and size. */
  TapTargets: Artifacts.TapTarget[];
  /** The primary log of devtools protocol activity. Used in Fraggle Rock gathering. */
  Trace: Trace;
  /** Elements associated with metrics (ie: Largest Contentful Paint element). */
  TraceElements: Artifacts.TraceElement[];
}

declare module Artifacts {
  type ComputedContext = Util.Immutable<{
    computedCache: Map<string, ArbitraryEqualityMap>;
  }>;

  type NetworkRequest = _NetworkRequest;
  type TaskNode = _TaskNode;
  type MetaElement = Artifacts['MetaElements'][0];

  interface URL {
    /**
     * URL of the initially requested URL during a Lighthouse navigation.
     * Will be `undefined` in timespan/snapshot.
     */
    requestedUrl?: string;
    /**
     * URL of the last document request during a Lighthouse navigation.
     * Will be `undefined` in timespan/snapshot.
     */
    mainDocumentUrl?: string;
    /** URL displayed on the page after Lighthouse finishes. */
    finalDisplayedUrl: string;
  }

  interface NodeDetails {
    lhId: string,
    devtoolsNodePath: string,
    selector: string,
    boundingRect: Rect,
    snippet: string,
    nodeLabel: string,
  }

  interface RuleExecutionError {
    name: string;
    message: string;
  }

  interface AxeRuleResult {
    id: string;
    impact?: string;
    tags: Array<string>;
    nodes: Array<{
      target: Array<string>;
      failureSummary?: string;
      node: NodeDetails;
      relatedNodes: NodeDetails[];
    }>;
    error?: RuleExecutionError;
  }

  interface Accessibility {
    violations: Array<AxeRuleResult>;
    notApplicable: Array<Pick<AxeRuleResult, 'id'>>;
    passes: Array<Pick<AxeRuleResult, 'id'>>;
    incomplete: Array<AxeRuleResult>;
    version: string;
  }

  interface CSSStyleSheetInfo {
    header: LH.Crdp.CSS.CSSStyleSheetHeader;
    content: string;
  }

  interface Doctype {
    name: string;
    publicId: string;
    systemId: string;
    documentCompatMode: string;
  }

  interface DOMStats {
    /** The total number of elements found within the page's body. */
    totalBodyElements: number;
    width: NodeDetails & {max: number;};
    depth: NodeDetails & {max: number;};
  }

  interface EmbeddedContentInfo {
    tagName: string;
    type: string | null;
    src: string | null;
    data: string | null;
    code: string | null;
    params: Array<{name: string; value: string}>;
    node: Artifacts.NodeDetails;
  }

  interface IFrameElement {
    /** The `id` attribute of the iframe. */
    id: string,
    /** Details for node in DOM for the iframe element */
    node: NodeDetails,
    /** The `src` attribute of the iframe. */
    src: string,
    /** The iframe's ClientRect. @see https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect */
    clientRect: {
      top: number;
      bottom: number;
      left: number;
      right: number;
      width: number;
      height: number;
    },
    /** If the iframe or an ancestor of the iframe is fixed in position. */
    isPositionFixed: boolean,
  }

  /** @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#Attributes */
  interface LinkElement {
    /** The `rel` attribute of the link, normalized to lower case. @see https://developer.mozilla.org/en-US/docs/Web/HTML/Link_types */
    rel: 'alternate'|'canonical'|'dns-prefetch'|'preconnect'|'preload'|'stylesheet'|string;
    /** The `href` attribute of the link or `null` if it was invalid in the header. */
    href: string | null
    /** The raw value of the `href` attribute. Only different from `href` when source is 'headers' */
    hrefRaw: string
    /** The `hreflang` attribute of the link */
    hreflang: string
    /** The `as` attribute of the link */
    as: string
    /** The `crossOrigin` attribute of the link */
    crossOrigin: string | null
    /** Where the link was found, either in the DOM or in the headers of the main document */
    source: 'head'|'body'|'headers'
    node: NodeDetails | null
  }

  interface PasswordInputsWithPreventedPaste {node: NodeDetails}

  interface Script extends Omit<LH.Crdp.Debugger.ScriptParsedEvent, 'url'|'embedderName'> {
    /**
     * Set by a sourceURL= magic comment if present, otherwise this is the same as the URL.
     * In some extreme cases dynamic scripts will on the protocol have neither a name or url,
     * in which case name will be `<compiled from string in X>` with some possible best-guess as to
     * what URL create the script.
     * Use this field for presentational purposes only.
     */
    name: string;
    /**
     * The network url of the script.
     * If the script is inline, this is the HTML document url.
     * If the script is dynamic (compiled from a string via eval, for example), this is undefined.
     */
    url?: string;
    content?: string;
  }

  interface ScriptElement {
    type: string | null
    src: string | null
    /** The `id` property of the script element; null if it had no `id` or if `source` is 'network'. */
    id: string | null
    async: boolean
    defer: boolean
    /** Details for node in DOM for the script element */
    node: NodeDetails | null
    /** Where the script was discovered, either in the head, the body, or network records. */
    source: 'head'|'body'|'network'
  }

  /** @see https://sourcemaps.info/spec.html#h.qz3o9nc69um5 */
  type RawSourceMap = {
    /** File version and must be a positive integer. */
    version: number
    /** A list of original source files used by the `mappings` entry. */
    sources: string[]
    /** A list of symbol names used by the `mappings` entry. */
    names?: string[]
    /** An optional source root, useful for relocating source files on a server or removing repeated values in the `sources` entry. This value is prepended to the individual entries in the `source` field. */
    sourceRoot?: string
    /** An optional list of source content, useful when the `source` can’t be hosted. The contents are listed in the same order as the sources. */
    sourcesContent?: string[]
    /** A string with the encoded mapping data. */
    mappings: string
    /** An optional name of the generated code (the bundled code that was the result of this build process) that this source map is associated with. */
    file?: string
    /**
     * An optional array of maps that are associated with an offset into the generated code.
     * `map` is optional because the spec defines that either `url` or `map` must be defined.
     * We explicitly only support `map` here.
    */
    sections?: Array<{offset: {line: number, column: number}, map?: RawSourceMap}>
  }

  /**
   * Source map for a given script found at scriptUrl. If there is an error in fetching or
   * parsing the map, errorMessage will be defined instead of map.
   */
  type SourceMap = {
    /** The DevTools protocol script identifier. */
    scriptId: string;
    /** URL of code that source map applies to. */
    scriptUrl: string
    /** URL of the source map. undefined if from data URL. */
    sourceMapUrl?: string
    /** Source map data structure. */
    map: RawSourceMap
  } | {
    /** The DevTools protocol script identifier. */
    scriptId: string;
    /** URL of code that source map applies to. */
    scriptUrl: string
    /** URL of the source map. undefined if from data URL. */
    sourceMapUrl?: string
    /** Error that occurred during fetching or parsing of source map. */
    errorMessage: string
    /** No map on account of error. */
    map?: undefined;
  }

  interface Bundle {
    rawMap: RawSourceMap;
    script: LH.Artifacts.Script;
    map: TextSourceMap;
    sizes: {
      // TODO(cjamcl): Rename to `sources`.
      files: Record<string, number>;
      unmappedBytes: number;
      totalBytes: number;
    } | {errorMessage: string};
  }

  /** @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#Attributes */
  interface AnchorElement {
    rel: string
    /** The computed href property: https://www.w3.org/TR/DOM-Level-2-HTML/html.html#ID-88517319, use `rawHref` for the exact attribute value */
    href: string
    /** The exact value of the href attribute value, as it is in the DOM */
    rawHref: string
    name?: string
    text: string
    role: string
    target: string
    node: NodeDetails
    onclick: string
    listeners?: Array<{
      type: LH.Crdp.DOMDebugger.EventListener['type']
    }>
  }

  type BFCacheReasonMap = {
    [key in LH.Crdp.Page.BackForwardCacheNotRestoredReason]?: string[];
  };

  type BFCacheNotRestoredReasonsTree = Record<LH.Crdp.Page.BackForwardCacheNotRestoredReasonType, BFCacheReasonMap>;

  interface BFCacheFailure {
    notRestoredReasonsTree: BFCacheNotRestoredReasonsTree;
  }

  interface Font {
    display: string;
    family: string;
    featureSettings: string;
    stretch: string;
    style: string;
    unicodeRange: string;
    variant: string;
    weight: string;
    src?: string[];
  }

  interface FontSize {
    totalTextLength: number;
    failingTextLength: number;
    analyzedFailingTextLength: number;
    /** Elements that contain a text node that failed size criteria. */
    analyzedFailingNodesData: Array<{
      /* nodeId of the failing TextNode. */
      nodeId: number;
      fontSize: number;
      textLength: number;
      parentNode: {
        backendNodeId: number;
        attributes: string[];
        nodeName: string;
        parentNode?: {
          backendNodeId: number;
          attributes: string[];
          nodeName: string;
        };
      };
      cssRule?: {
        type: 'Regular' | 'Inline' | 'Attributes';
        range?: {startLine: number, startColumn: number};
        parentRule?: {origin: LH.Crdp.CSS.StyleSheetOrigin, selectors: {text: string}[]};
        styleSheetId?: string;
        stylesheet?: LH.Crdp.CSS.CSSStyleSheetHeader;
        cssProperties?: Array<LH.Crdp.CSS.CSSProperty>;
      }
    }>
  }

  // TODO(bckenny): real type for parsed manifest.
  type Manifest = ReturnType<typeof parseManifest>;

  interface InstallabilityErrors {
    errors: LH.Crdp.Page.InstallabilityError[];
  }

  interface ImageElement {
    /** The resolved source URL of the image. Similar to `currentSrc`, but resolved for CSS images as well. */
    src: string;
    /** The srcset attribute value. @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/srcset */
    srcset: string;
    /** The displayed width of the image, uses img.width when available falling back to clientWidth. See https://codepen.io/patrickhulce/pen/PXvQbM for examples. */
    displayedWidth: number;
    /** The displayed height of the image, uses img.height when available falling back to clientHeight. See https://codepen.io/patrickhulce/pen/PXvQbM for examples. */
    displayedHeight: number;
    /** The raw width attribute of the image element. CSS images will be set to null. */
    attributeWidth: string | null;
    /** The raw height attribute of the image element. CSS images will be set to null. */
    attributeHeight: string | null;
    /**
     * The natural width and height of the underlying image resource, uses img.naturalHeight/img.naturalWidth. See https://codepen.io/patrickhulce/pen/PXvQbM for examples.
     * Set to `undefined` if the data could not be collected.
     */
    naturalDimensions?: {
      width: number;
      height: number;
    };
    /**
     * The width/height of the element as defined by matching CSS rules.
     * These are distinct from the `computedStyles` properties in that they are the raw property value.
     * e.g. `width` would be `"100vw"`, not the computed width in pixels.
     * Set to `undefined` if the data was not collected.
     */
    cssEffectiveRules?: {
      /** The width of the image as expressed by CSS rules. Set to `null` if there was no width set in CSS. */
      width: string | null;
      /** The height of the image as expressed by CSS rules. Set to `null` if there was no height set in CSS. */
      height: string | null;
      /** The aspect ratio of the image as expressed by CSS rules. Set to `null` if there was no aspect ratio set in CSS. */
      aspectRatio: string | null;
    };
    /** The computed styles as determined by `getComputedStyle`. */
    computedStyles: {
      /** CSS `position` property. */
      position: string;
      /** CSS `object-fit` property. */
      objectFit: string;
      /** CSS `image-rendering` propertry. */
      imageRendering: string;
    };
    /** The BoundingClientRect of the element. */
    clientRect: {
      top: number;
      bottom: number;
      left: number;
      right: number;
    };
    /** Flags whether this element was an image via CSS background-image rather than <img> tag. */
    isCss: boolean;
    /** Flags whether this element was contained within a <picture> tag. */
    isPicture: boolean;
    /** Flags whether this element was contained within a ShadowRoot */
    isInShadowDOM: boolean;
    /** Details for node in DOM for the image element */
    node: NodeDetails;
    /** The loading attribute of the image. */
    loading?: string;
  }

  interface OptimizedImage {
    failed: false;
    originalSize: number;
    jpegSize?: number;
    webpSize?: number;

    requestId: string;
    url: string;
    mimeType: string;
    resourceSize: number;
  }

  interface OptimizedImageError {
    failed: true;
    errMsg: string;

    requestId: string;
    url: string;
    mimeType: string;
    resourceSize: number;
  }

  interface TagBlockingFirstPaint {
    startTime: number;
    endTime: number;
    transferSize: number;
    tag: {
      tagName: 'LINK'|'SCRIPT';
      /** The value of `HTMLLinkElement.href` or `HTMLScriptElement.src`. */
      url: string;
      /** A record of when changes to the `HTMLLinkElement.media` attribute occurred and if the new media type matched the page. */
      mediaChanges?: Array<{href: string, media: string, msSinceHTMLEnd: number, matches: boolean}>;
    };
  }

  type Rect = AuditDetails.Rect;

  interface TapTarget {
    node: NodeDetails;
    href: string;
    clientRects: Rect[];
  }

  interface TraceElement {
    traceEventType: 'largest-contentful-paint'|'layout-shift'|'animation'|'responsiveness';
    score?: number;
    node: NodeDetails;
    nodeId?: number;
    animations?: {name?: string, failureReasonsMask?: number, unsupportedProperties?: string[]}[];
    type?: string;
  }

  interface ViewportDimensions {
    innerWidth: number;
    innerHeight: number;
    outerWidth: number;
    outerHeight: number;
    devicePixelRatio: number;
  }

  interface InspectorIssues {
    attributionReportingIssue: LH.Crdp.Audits.AttributionReportingIssueDetails[];
    blockedByResponseIssue: LH.Crdp.Audits.BlockedByResponseIssueDetails[];
    clientHintIssue: LH.Crdp.Audits.ClientHintIssueDetails[];
    contentSecurityPolicyIssue: LH.Crdp.Audits.ContentSecurityPolicyIssueDetails[];
    corsIssue: LH.Crdp.Audits.CorsIssueDetails[];
    deprecationIssue: LH.Crdp.Audits.DeprecationIssueDetails[];
    federatedAuthRequestIssue: LH.Crdp.Audits.FederatedAuthRequestIssueDetails[],
    genericIssue: LH.Crdp.Audits.GenericIssueDetails[];
    heavyAdIssue: LH.Crdp.Audits.HeavyAdIssueDetails[];
    lowTextContrastIssue: LH.Crdp.Audits.LowTextContrastIssueDetails[];
    mixedContentIssue: LH.Crdp.Audits.MixedContentIssueDetails[];
    navigatorUserAgentIssue: LH.Crdp.Audits.NavigatorUserAgentIssueDetails[];
    quirksModeIssue: LH.Crdp.Audits.QuirksModeIssueDetails[];
    cookieIssue: LH.Crdp.Audits.CookieIssueDetails[];
    sharedArrayBufferIssue: LH.Crdp.Audits.SharedArrayBufferIssueDetails[];
    twaQualityEnforcement: LH.Crdp.Audits.TrustedWebActivityIssueDetails[];
  }

  // Computed artifact types below.
  type CriticalRequestNode = {
    [id: string]: {
      request: Artifacts.NetworkRequest;
      children: CriticalRequestNode;
    }
  }

  type ManifestValueCheckID = 'hasStartUrl'|'hasIconsAtLeast144px'|'hasIconsAtLeast512px'|'fetchesIcon'|'hasPWADisplayValue'|'hasBackgroundColor'|'hasThemeColor'|'hasShortName'|'hasName'|'shortNameLength'|'hasMaskableIcon';

  type ManifestValues = {
    isParseFailure: false;
    allChecks: {
      id: ManifestValueCheckID;
      failureText: string;
      passing: boolean;
    }[];
  } | {
    isParseFailure: true;
    parseFailureReason: string;
    allChecks: {
      id: ManifestValueCheckID;
      failureText: string;
      passing: boolean;
    }[];
  }

  type MeasureEntry = LHResult.MeasureEntry;

  interface MetricComputationDataInput {
    devtoolsLog: DevtoolsLog;
    trace: Trace;
    settings: Audit.Context['settings'];
    gatherContext: Artifacts['GatherContext'];
    simulator?: InstanceType<typeof Simulator>;
    URL: Artifacts['URL'];
  }

  interface MetricComputationData extends MetricComputationDataInput {
    networkRecords: Array<Artifacts.NetworkRequest>;
    processedTrace: ProcessedTrace;
    processedNavigation?: ProcessedNavigation;
  }

  interface NavigationMetricComputationData extends MetricComputationData {
    processedNavigation: ProcessedNavigation;
  }

  interface Metric {
    timing: number;
    timestamp?: number;
  }

  interface NetworkAnalysis {
    rtt: number;
    additionalRttByOrigin: Map<string, number>;
    serverResponseTimeByOrigin: Map<string, number>;
    throughput: number;
  }

  interface LanternMetric {
    timing: number;
    timestamp?: never;
    optimisticEstimate: Gatherer.Simulation.Result
    pessimisticEstimate: Gatherer.Simulation.Result;
    optimisticGraph: Gatherer.Simulation.GraphNode;
    pessimisticGraph: Gatherer.Simulation.GraphNode;
  }

  type Speedline = speedline.Output<'speedIndex'>;

  interface TraceTimes {
    timeOrigin: number;
    traceEnd: number;
  }

  interface NavigationTraceTimes {
    timeOrigin: number;
    firstPaint?: number;
    firstContentfulPaint: number;
    firstContentfulPaintAllFrames: number;
    firstMeaningfulPaint?: number;
    largestContentfulPaint?: number;
    largestContentfulPaintAllFrames?: number;
    traceEnd: number;
    load?: number;
    domContentLoaded?: number;
  }

  interface ProcessedTrace {
    /** The raw timestamps of key events, in microseconds. */
    timestamps: TraceTimes;
    /** The relative times from timeOrigin to key events, in milliseconds. */
    timings: TraceTimes;
    /** The subset of trace events from the page's process, sorted by timestamp. */
    processEvents: Array<TraceEvent>;
    /** The subset of trace events from the page's main thread, sorted by timestamp. */
    mainThreadEvents: Array<TraceEvent>;
    /** The subset of trace events from the main frame, sorted by timestamp. */
    frameEvents: Array<TraceEvent>;
    /** The subset of trace events from the main frame and any child frames, sorted by timestamp. */
    frameTreeEvents: Array<TraceEvent>;
    /** IDs for the trace's main frame, process, and thread. */
    mainFrameIds: {pid: number, tid: number, frameId: string};
    /** The list of frames committed in the trace. */
    frames: Array<{id: string, url: string}>;
    /** The trace event marking the time at which the run should consider to have begun. Typically the same as the navigationStart but might differ due to SPA navigations, client-side redirects, etc. In the FR timespan case, this event is injected by Lighthouse itself. */
    timeOriginEvt: TraceEvent;
  }

  interface ProcessedNavigation {
    /** The raw timestamps of key metric events, in microseconds. */
    timestamps: NavigationTraceTimes;
    /** The relative times from navigationStart to key metric events, in milliseconds. */
    timings: NavigationTraceTimes;
    /** The trace event marking firstPaint, if it was found. */
    firstPaintEvt?: TraceEvent;
    /** The trace event marking firstContentfulPaint, if it was found. */
    firstContentfulPaintEvt: TraceEvent;
    /** The trace event marking firstContentfulPaint from all frames, if it was found. */
    firstContentfulPaintAllFramesEvt: TraceEvent;
    /** The trace event marking firstMeaningfulPaint, if it was found. */
    firstMeaningfulPaintEvt?: TraceEvent;
    /** The trace event marking largestContentfulPaint, if it was found. */
    largestContentfulPaintEvt?: TraceEvent;
    /** The trace event marking largestContentfulPaint from all frames, if it was found. */
    largestContentfulPaintAllFramesEvt?: TraceEvent;
    /** The trace event marking loadEventEnd, if it was found. */
    loadEvt?: TraceEvent;
    /** The trace event marking domContentLoadedEventEnd, if it was found. */
    domContentLoadedEvt?: TraceEvent;
    /**
     * Whether the firstMeaningfulPaintEvt was the definitive event or a fallback to
     * firstMeaningfulPaintCandidate events had to be attempted.
     */
    fmpFellBack: boolean;
    /** Whether LCP was invalidated without a new candidate. */
    lcpInvalidated: boolean;
  }

  /** Information on a tech stack (e.g. a JS library) used by the page. */
  interface DetectedStack {
    /** The identifier for how this stack was detected. */
    detector: 'js';
    /** The unique string ID for the stack. */
    id: string;
    /** The name of the stack. */
    name: string;
    /** The version of the stack, if it could be detected. */
    version?: string;
    /** The package name on NPM, if it exists. */
    npm?: string;
  }

  interface FullPageScreenshot {
    screenshot: {
      /** Base64 image data URL. */
      data: string;
      width: number;
      height: number;
    };
    nodes: Record<string, Rect>;
  }

  interface TimingSummary {
    firstContentfulPaint: number | undefined;
    firstContentfulPaintTs: number | undefined;
    firstContentfulPaintAllFrames: number | undefined;
    firstContentfulPaintAllFramesTs: number | undefined;
    firstMeaningfulPaint: number | undefined;
    firstMeaningfulPaintTs: number | undefined;
    largestContentfulPaint: number | undefined;
    largestContentfulPaintTs: number | undefined;
    largestContentfulPaintAllFrames: number | undefined;
    largestContentfulPaintAllFramesTs: number | undefined;
    interactive: number | undefined;
    interactiveTs: number | undefined;
    speedIndex: number | undefined;
    speedIndexTs: number | undefined;
    maxPotentialFID: number | undefined;
    cumulativeLayoutShift: number | undefined;
    cumulativeLayoutShiftMainFrame: number | undefined;
    totalCumulativeLayoutShift: number | undefined;
    totalBlockingTime: number | undefined;
    observedTimeOrigin: number;
    observedTimeOriginTs: number;
    observedNavigationStart: number | undefined;
    observedNavigationStartTs: number | undefined;
    observedCumulativeLayoutShift: number | undefined;
    observedCumulativeLayoutShiftMainFrame: number | undefined;
    observedTotalCumulativeLayoutShift: number | undefined;
    observedFirstPaint: number | undefined;
    observedFirstPaintTs: number | undefined;
    observedFirstContentfulPaint: number | undefined;
    observedFirstContentfulPaintTs: number | undefined;
    observedFirstContentfulPaintAllFrames: number | undefined;
    observedFirstContentfulPaintAllFramesTs: number | undefined;
    observedFirstMeaningfulPaint: number | undefined;
    observedFirstMeaningfulPaintTs: number | undefined;
    observedLargestContentfulPaint: number | undefined;
    observedLargestContentfulPaintTs: number | undefined;
    observedLargestContentfulPaintAllFrames: number | undefined;
    observedLargestContentfulPaintAllFramesTs: number | undefined;
    observedTraceEnd: number | undefined;
    observedTraceEndTs: number | undefined;
    observedLoad: number | undefined;
    observedLoadTs: number | undefined;
    observedDomContentLoaded: number | undefined;
    observedDomContentLoadedTs: number | undefined;
    observedFirstVisualChange: number;
    observedFirstVisualChangeTs: number;
    observedLastVisualChange: number;
    observedLastVisualChangeTs: number;
    observedSpeedIndex: number;
    observedSpeedIndexTs: number;
  }

  interface FormElement {
    id: string;
    name: string;
    autocomplete: string;
    node: NodeDetails;
  }

  /** Attributes collected for every input element in the inputs array from the forms interface. */
  interface InputElement {
    /** If set, the parent form is the index into the associated FormElement array. Otherwise, the input element has no parent form. */
    parentFormIndex?: number;
    /** Array of indices into associated LabelElement array. */
    labelIndices: number[];
    id: string;
    name: string;
    type: string;
    placeholder?: string;
    autocomplete: {
      property: string;
      attribute: string | null;
      prediction: string | null;
    }
    node: NodeDetails;
  }

  /** Attributes collected for every label element in the labels array from the forms interface */
  interface LabelElement {
    for: string;
    node: NodeDetails;
  }

  /** Information about an event listener registered on the global object. */
  interface GlobalListener {
    /** Event listener type, limited to those events currently of interest. */
    type: 'pagehide'|'unload'|'visibilitychange';
    /** The DevTools protocol script identifier. */
    scriptId: string;
    /** Line number in the script (0-based). */
    lineNumber: number;
    /** Column number in the script (0-based). */
    columnNumber: number;
  }

  /** Describes a generic console message. */
  interface BaseConsoleMessage {
    /**
     * The text printed to the console, as shown on the browser console.
     *
     * For console API calls, all values are formatted into the text. Primitive values and
     * function will be printed as-is while objects will be formatted as if the object were
     * passed to String(). For example, a div will be formatted as "[object HTMLDivElement]".
     *
     * For exceptions the text will be the same as err.message at runtime.
     */
    text: string;
    /** Time of the console log in milliseconds since epoch. */
    timestamp: number;
    /** The stack trace of the log/exception, if known. */
    stackTrace?: LH.Crdp.Runtime.StackTrace;
    /** The URL of the log/exception, if known. */
    url?: string;
    /** The script id of the log/exception, if known. */
    scriptId?: string;
    /** Line number in the script (0-indexed), if known. */
    lineNumber?: number;
    /** Column number in the script (0-indexed), if known. */
    columnNumber?: number;
  }

  /** Describes a console message logged by a script using the console API. */
  interface ConsoleAPICall extends BaseConsoleMessage {
    eventType: 'consoleAPI';
    /** The console API invoked. Only the following console API calls are gathered. */
    source: 'console.warn' | 'console.error';
    /** Corresponds to the API call. */
    level: 'warning' | 'error';
  }

  interface ConsoleException extends BaseConsoleMessage {
    eventType: 'exception';
    source: 'exception';
    level: 'error';
  }

  /**
   * Describes a report logged to the console by the browser regarding interventions,
   * deprecations, violations, and more.
   */
  interface ConsoleProtocolLog extends BaseConsoleMessage {
    source: LH.Crdp.Log.LogEntry['source'],
    level: LH.Crdp.Log.LogEntry['level'],
    eventType: 'protocolLog';
  }

  type ConsoleMessage = ConsoleAPICall | ConsoleException | ConsoleProtocolLog;

  interface ImageElementRecord extends ImageElement {
    /** The MIME type of the underlying image file. */
    mimeType?: string;
  }
}

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
        url: string;
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
      /** Responsiveness data. */
      interactionType?: 'drag'|'keyboard'|'tapOrClick';
      maxDuration?: number;
      type?: string;
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

declare module Trace {
  /**
   * Base event of a `ph: 'X'` 'complete' event. Extend with `name` and `args` as
   * needed.
   */
  interface CompleteEvent {
    ph: 'X';
    cat: string;
    pid: number;
    tid: number;
    dur: number;
    ts: number;
    tdur: number;
    tts: number;
  }

  /**
   * Base event of a `ph: 'b'|'e'|'n'` async event. Extend with `name`, `args`, and
   * more specific `ph` (if needed).
   */
  interface AsyncEvent {
    ph: 'b'|'e'|'n';
    cat: string;
    pid: number;
    tid: number;
    ts: number;
    id: string;
    scope?: string;
    // TODO(bckenny): No dur on these. Sort out optional `dur` on trace events.
    /** @deprecated there is no `dur` on async events. */
    dur: number;
  }
}

/**
 * A record of DevTools Debugging Protocol events.
 */
export type DevtoolsLog = Array<Protocol.RawEventMessage>;
