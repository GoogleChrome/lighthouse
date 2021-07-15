/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import parseManifest = require('../lighthouse-core/lib/manifest-parser.js');
import _LanternSimulator = require('../lighthouse-core/lib/dependency-graph/simulator/simulator.js');
import _NetworkRequest = require('../lighthouse-core/lib/network-request.js');
import speedline = require('speedline-core');
import TextSourceMap = require('../lighthouse-core/lib/cdt/generated/SourceMap.js');
import _ArbitraryEqualityMap = require('../lighthouse-core/lib/arbitrary-equality-map.js');

type _TaskNode = import('../lighthouse-core/lib/tracehouse/main-thread-tasks.js').TaskNode;

type LanternSimulator = InstanceType<typeof _LanternSimulator>;

declare global {
  module LH {
    export interface Artifacts extends BaseArtifacts, GathererArtifacts {}

    export type FRArtifacts = StrictOmit<Artifacts,
      | 'Fonts'
      | 'HTTPRedirect'
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
    export interface UniversalBaseArtifacts {
      /** The ISO-8601 timestamp of when the test page was fetched and artifacts collected. */
      fetchTime: string;
      /** A set of warnings about unexpected things encountered while loading and testing the page. */
      LighthouseRunWarnings: Array<string | IcuMessage>;
      /** The benchmark index that indicates rough device class. */
      BenchmarkIndex: number;
      /** An object containing information about the testing configuration used by Lighthouse. */
      settings: Config.Settings;
      /** The timing instrumentation of the gather portion of a run. */
      Timing: Artifacts.MeasureEntry[];
    }

    /**
     * The set of base artifacts whose semantics differ or may be valueless in certain Lighthouse gather modes.
     */
    export interface ContextualBaseArtifacts {
      /** The URL initially requested and the post-redirects URL that was actually loaded. */
      URL: {requestedUrl: string, finalUrl: string};
      /** If loading the page failed, value is the error that caused it. Otherwise null. */
      PageLoadError: LighthouseError | null;
    }

    /**
     * The set of base artifacts that were replaced by standard gatherers in Fraggle Rock.
     */
    export interface LegacyBaseArtifacts {
      /** Device which Chrome is running on. */
      HostFormFactor: 'desktop'|'mobile';
      /** The user agent string of the version of Chrome used. */
      HostUserAgent: string;
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
    export interface PublicGathererArtifacts {
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
      MetaElements: Array<{name?: string, content?: string, property?: string, httpEquiv?: string, charset?: string, node: LH.Artifacts.NodeDetails}>;
      /** Information on all script elements in the page. Also contains the content of all requested scripts and the networkRecord requestId that contained their content. Note, HTML documents will have one entry per script tag, all with the same requestId. */
      ScriptElements: Array<Artifacts.ScriptElement>;
      ScriptElementsSnapshot: Array<Artifacts.ScriptElement>;
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
      /** The value of the page's <html> manifest attribute, or null if not defined */
      AppCacheManifest: string | null;
      /** Array of all URLs cached in CacheStorage. */
      CacheContents: string[];
      /** CSS coverage information for styles used by page's final state. */
      CSSUsage: {rules: Crdp.CSS.RuleUsage[], stylesheets: Artifacts.CSSStyleSheetInfo[]};
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
      /** All the form elements in the page and formless inputs. */
      FormElements: Artifacts.Form[];
      /** Screenshot of the entire page (rather than just the above the fold content). */
      FullPageScreenshot: Artifacts.FullPageScreenshot | null;
      /** Information about how Lighthouse artifacts were gathered. */
      GatherContext: {gatherMode: LH.Gatherer.GatherMode};
      /** Information about event listeners registered on the global object. */
      GlobalListeners: Array<Artifacts.GlobalListener>;
      /** Whether the page ended up on an HTTPS page after attempting to load the HTTP version. */
      HTTPRedirect: {value: boolean};
      /** The issues surfaced in the devtools Issues panel */
      InspectorIssues: Artifacts.InspectorIssues;
      /** JS coverage information for code used during page load. Keyed by network URL. */
      JsUsage: Record<string, Array<Omit<Crdp.Profiler.ScriptCoverage, 'url'>>>;
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
      RobotsTxt: {status: number|null, content: string|null};
      /** Version information for all ServiceWorkers active after the first page load. */
      ServiceWorker: {versions: Crdp.ServiceWorker.ServiceWorkerVersion[], registrations: Crdp.ServiceWorker.ServiceWorkerRegistration[]};
      /** Source maps of scripts executed in the page. */
      SourceMaps: Array<Artifacts.SourceMap>;
      /** Information on <script> and <link> tags blocking first paint. */
      TagsBlockingFirstPaint: Artifacts.TagBlockingFirstPaint[];
      /** Information about tap targets including their position and size. */
      TapTargets: Artifacts.TapTarget[];
      /** The primary log of devtools protocol activity. Used in Fraggle Rock gathering. */
      Trace: LH.Trace;
      /** Elements associated with metrics (ie: Largest Contentful Paint element). */
      TraceElements: Artifacts.TraceElement[];
    }

    export type ArbitraryEqualityMap = _ArbitraryEqualityMap;

    module Artifacts {
      export type ComputedContext = Immutable<{
        computedCache: Map<string, ArbitraryEqualityMap>;
      }>;

      export type NetworkRequest = _NetworkRequest;
      export type TaskNode = _TaskNode;
      export type MetaElement = LH.Artifacts['MetaElements'][0];

      export interface NodeDetails {
        lhId: string,
        devtoolsNodePath: string,
        selector: string,
        boundingRect: Rect,
        snippet: string,
        nodeLabel: string,
      }

      export interface RuleExecutionError {
        name: string;
        message: string;
      }

      export interface AxeRuleResult {
        id: string;
        impact?: string;
        tags: Array<string>;
        nodes: Array<{
          target: Array<string>;
          failureSummary?: string;
          node: NodeDetails;
        }>;
        error?: RuleExecutionError;
      }

      export interface Accessibility {
        violations: Array<AxeRuleResult>;
        notApplicable: Array<Pick<AxeRuleResult, 'id'>>;
        incomplete: Array<AxeRuleResult>;
        version: string;
      }

      export interface CSSStyleSheetInfo {
        header: Crdp.CSS.CSSStyleSheetHeader;
        content: string;
      }

      export interface Doctype {
        name: string;
        publicId: string;
        systemId: string;
      }

      export interface DOMStats {
        /** The total number of elements found within the page's body. */
        totalBodyElements: number;
        width: NodeDetails & {max: number;};
        depth: NodeDetails & {max: number;};
      }

      export interface EmbeddedContentInfo {
        tagName: string;
        type: string | null;
        src: string | null;
        data: string | null;
        code: string | null;
        params: Array<{name: string; value: string}>;
        node: LH.Artifacts.NodeDetails;
      }

      export interface IFrameElement {
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
      export interface LinkElement {
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

      export interface PasswordInputsWithPreventedPaste {node: NodeDetails}

      export interface ScriptElement {
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
        /** The content of the inline script or the network record with the matching URL, null if the script had a src and no network record could be found. */
        content: string | null
        /** The ID of the network request that matched the URL of the src or the main document if inline, null if no request could be found. */
        requestId: string | null
      }

      /** @see https://sourcemaps.info/spec.html#h.qz3o9nc69um5 */
      export type RawSourceMap = {
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
      export type SourceMap = {
        /** URL of code that source map applies to. */
        scriptUrl: string
        /** URL of the source map. undefined if from data URL. */
        sourceMapUrl?: string
        /** Source map data structure. */
        map: RawSourceMap
      } | {
        /** URL of code that source map applies to. */
        scriptUrl: string
        /** URL of the source map. undefined if from data URL. */
        sourceMapUrl?: string
        /** Error that occurred during fetching or parsing of source map. */
        errorMessage: string
        /** No map on account of error. */
        map?: undefined;
      }

      export interface Bundle {
        rawMap: RawSourceMap;
        script: ScriptElement;
        map: TextSourceMap;
        sizes: {
          // TODO(cjamcl): Rename to `sources`.
          files: Record<string, number>;
          unmappedBytes: number;
          totalBytes: number;
        } | {errorMessage: string};
      }

      /** @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#Attributes */
      export interface AnchorElement {
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
          type: Crdp.DOMDebugger.EventListener['type']
        }>
      }

      export interface Font {
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

      export interface FontSize {
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
            parentRule?: {origin: Crdp.CSS.StyleSheetOrigin, selectors: {text: string}[]};
            styleSheetId?: string;
            stylesheet?: Crdp.CSS.CSSStyleSheetHeader;
            cssProperties?: Array<Crdp.CSS.CSSProperty>;
          }
        }>
      }

      // TODO(bckenny): real type for parsed manifest.
      export type Manifest = ReturnType<typeof parseManifest>;

      export interface InstallabilityErrors {
        errors: Crdp.Page.InstallabilityError[];
      }

      export interface ImageElement {
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
        /** The MIME type of the underlying image file. */
        mimeType?: string;
        /** Details for node in DOM for the image element */
        node: NodeDetails;
        /** The loading attribute of the image. */
        loading?: string;
      }

      export interface OptimizedImage {
        failed: false;
        originalSize: number;
        jpegSize?: number;
        webpSize?: number;

        requestId: string;
        url: string;
        mimeType: string;
        resourceSize: number;
      }

      export interface OptimizedImageError {
        failed: true;
        errMsg: string;

        requestId: string;
        url: string;
        mimeType: string;
        resourceSize: number;
      }

      export interface TagBlockingFirstPaint {
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

      export interface Rect {
        width: number;
        height: number;
        top: number;
        right: number;
        bottom: number;
        left: number;
      }

      export interface TapTarget {
        node: NodeDetails;
        href: string;
        clientRects: Rect[];
      }

      export interface TraceElement {
        traceEventType: 'largest-contentful-paint'|'layout-shift'|'animation';
        score?: number;
        node: NodeDetails;
        nodeId?: number;
        animations?: {name?: string, failureReasonsMask?: number, unsupportedProperties?: string[]}[];
      }

      export interface ViewportDimensions {
        innerWidth: number;
        innerHeight: number;
        outerWidth: number;
        outerHeight: number;
        devicePixelRatio: number;
      }

      export interface InspectorIssues {
        mixedContent: Crdp.Audits.MixedContentIssueDetails[];
        sameSiteCookies: Crdp.Audits.SameSiteCookieIssueDetails[];
        blockedByResponse: Crdp.Audits.BlockedByResponseIssueDetails[];
        heavyAds: Crdp.Audits.HeavyAdIssueDetails[];
        contentSecurityPolicy: Crdp.Audits.ContentSecurityPolicyIssueDetails[];
      }

      // Computed artifact types below.
      export type CriticalRequestNode = {
        [id: string]: {
          request: Artifacts.NetworkRequest;
          children: CriticalRequestNode;
        }
      }

      export type ManifestValueCheckID = 'hasStartUrl'|'hasIconsAtLeast144px'|'hasIconsAtLeast512px'|'fetchesIcon'|'hasPWADisplayValue'|'hasBackgroundColor'|'hasThemeColor'|'hasShortName'|'hasName'|'shortNameLength'|'hasMaskableIcon';

      export type ManifestValues = {
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

      export interface MeasureEntry {
        // From PerformanceEntry
        readonly duration: number;
        readonly entryType: string;
        readonly name: string;
        readonly startTime: number;
        /** Whether timing entry was collected during artifact gathering. */
        gather?: boolean;
      }

      export interface MetricComputationDataInput {
        devtoolsLog: DevtoolsLog;
        trace: Trace;
        settings: Immutable<Config.Settings>;
        gatherContext: Artifacts['GatherContext'];
        simulator?: LanternSimulator;
      }

      export interface MetricComputationData extends MetricComputationDataInput {
        networkRecords: Array<Artifacts.NetworkRequest>;
        processedTrace: ProcessedTrace;
        processedNavigation?: ProcessedNavigation;
      }

      export interface NavigationMetricComputationData extends MetricComputationData {
        processedNavigation: ProcessedNavigation;
      }

      export interface Metric {
        timing: number;
        timestamp?: number;
      }

      export interface NetworkAnalysis {
        rtt: number;
        additionalRttByOrigin: Map<string, number>;
        serverResponseTimeByOrigin: Map<string, number>;
        throughput: number;
      }

      export interface LanternMetric {
        timing: number;
        timestamp?: never;
        optimisticEstimate: Gatherer.Simulation.Result
        pessimisticEstimate: Gatherer.Simulation.Result;
        optimisticGraph: Gatherer.Simulation.GraphNode;
        pessimisticGraph: Gatherer.Simulation.GraphNode;
      }

      export type Speedline = speedline.Output<'speedIndex'>;

      export interface TraceTimes {
        timeOrigin: number;
        traceEnd: number;
      }

      export interface NavigationTraceTimes {
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

      export interface ProcessedTrace {
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

      export interface ProcessedNavigation {
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
      export interface DetectedStack {
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

      export interface FullPageScreenshot {
        screenshot: {
          /** Base64 image data URL. */
          data: string;
          width: number;
          height: number;
        };
        nodes: Record<string, Rect>;
      }

      export interface TimingSummary {
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

      export interface Form {
        /** If attributes is missing that means this is a formless set of elements. */
        attributes?: {
          id: string;
          name: string;
          autocomplete: string;
        };
        node: NodeDetails | null;
        inputs: Array<FormInput>;
        labels: Array<FormLabel>;
      }

      /** Attributes collected for every input element in the inputs array from the forms interface. */
      export interface FormInput {
        id: string;
        name: string;
        placeholder?: string;
        autocomplete: {
          property: string;
          attribute: string | null;
          prediction: string | null;
        }
        node: NodeDetails;
      }

      /** Attributes collected for every label element in the labels array from the forms interface */
      export interface FormLabel {
        for: string;
        node: NodeDetails;
      }

      /** Information about an event listener registered on the global object. */
      export interface GlobalListener {
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
        stackTrace?: Crdp.Runtime.StackTrace;
        /** The URL of the log/exception, if known. */
        url?: string;
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
        source: Crdp.Log.LogEntry['source'],
        level: Crdp.Log.LogEntry['level'],
        eventType: 'protocolLog';
      }

      export type ConsoleMessage = ConsoleAPICall | ConsoleException | ConsoleProtocolLog;
    }
  }
}

// empty export to keep file a module
export {}
