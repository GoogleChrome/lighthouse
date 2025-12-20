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

type _TaskNode = import('../lighthouse-core/lib/tracehouse/main-thread-tasks.js').TaskNode;

type LanternSimulator = InstanceType<typeof _LanternSimulator>;

declare global {
  module LH {
    export interface Artifacts extends BaseArtifacts, GathererArtifacts {}

    /**
     * Artifacts always created by GatherRunner. These artifacts are available to Lighthouse plugins.
     * NOTE: any breaking changes here are considered breaking Lighthouse changes that must be done
     * on a major version bump.
     */
    export interface BaseArtifacts {
      /** The ISO-8601 timestamp of when the test page was fetched and artifacts collected. */
      fetchTime: string;
      /** A set of warnings about unexpected things encountered while loading and testing the page. */
      LighthouseRunWarnings: string[];
      /** Whether the page was loaded on either a real or emulated mobile device. */
      TestedAsMobileDevice: boolean;
      /** Device which Chrome is running on. */
      HostFormFactor: 'desktop'|'mobile';
      /** The user agent string of the version of Chrome used. */
      HostUserAgent: string;
      /** The user agent string that Lighthouse used to load the page. */
      NetworkUserAgent: string;
      /** The benchmark index that indicates rough device class. */
      BenchmarkIndex: number;
      /** Parsed version of the page's Web App Manifest, or null if none found. */
      WebAppManifest: Artifacts.Manifest | null;
      /** Errors preventing page being installable as PWA. */
      InstallabilityErrors: Artifacts.InstallabilityErrors;
      /** Information on detected tech stacks (e.g. JS libraries) used by the page. */
      Stacks: Artifacts.DetectedStack[];
      /** A set of page-load traces, keyed by passName. */
      traces: {[passName: string]: Trace};
      /** A set of DevTools debugger protocol records, keyed by passName. */
      devtoolsLogs: {[passName: string]: DevtoolsLog};
      /** An object containing information about the testing configuration used by Lighthouse. */
      settings: Config.Settings;
      /** The URL initially requested and the post-redirects URL that was actually loaded. */
      URL: {requestedUrl: string, finalUrl: string};
      /** The timing instrumentation of the gather portion of a run. */
      Timing: Artifacts.MeasureEntry[];
      /** If loading the page failed, value is the error that caused it. Otherwise null. */
      PageLoadError: LighthouseError | null;
    }

    /**
     * Artifacts provided by the default gatherers that are exposed to plugins with a hardended API.
     * NOTE: any breaking changes here are considered breaking Lighthouse changes that must be done
     * on a major version bump.
     */
    export interface PublicGathererArtifacts {
      /** Console deprecation and intervention warnings logged by Chrome during page load. */
      ConsoleMessages: Crdp.Log.EntryAddedEvent[];
      /** All the iframe elements in the page.*/
      IFrameElements: Artifacts.IFrameElement[];
      /** The contents of the main HTML document network resource. */
      MainDocumentContent: string;
      /** Information on size and loading for all the images in the page. Natural size information for `picture` and CSS images is only available if the image was one of the largest 50 images. */
      ImageElements: Artifacts.ImageElement[];
      /** All the link elements on the page or equivalently declared in `Link` headers. @see https://html.spec.whatwg.org/multipage/links.html */
      LinkElements: Artifacts.LinkElement[];
      /** The values of the <meta> elements in the head. */
      MetaElements: Array<{name?: string, content?: string, property?: string, httpEquiv?: string, charset?: string}>;
      /** Set of exceptions thrown during page load. */
      RuntimeExceptions: Crdp.Runtime.ExceptionThrownEvent[];
      /** Information on all script elements in the page. Also contains the content of all requested scripts and the networkRecord requestId that contained their content. Note, HTML documents will have one entry per script tag, all with the same requestId. */
      ScriptElements: Array<Artifacts.ScriptElement>;
      /** The dimensions and devicePixelRatio of the loaded viewport. */
      ViewportDimensions: Artifacts.ViewportDimensions;
    }

    /**
     * Artifacts provided by the default gatherers. Augment this interface when adding additional
     * gatherers. Changes to these artifacts are not considered a breaking Lighthouse change.
     */
    export interface GathererArtifacts extends PublicGathererArtifacts {
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
      /** The issues surfaced in the devtools Issues panel */
      InspectorIssues: Artifacts.InspectorIssues;
      /** The page's document body innerText if loaded with JavaScript disabled. */
      HTMLWithoutJavaScript: {bodyText: string, hasNoScript: boolean};
      /** Whether the page ended up on an HTTPS page after attempting to load the HTTP version. */
      HTTPRedirect: {value: boolean};
      /** JS coverage information for code used during page load. Keyed by URL. */
      JsUsage: Record<string, Crdp.Profiler.ScriptCoverage[]>;
      /** Parsed version of the page's Web App Manifest, or null if none found. */
      Manifest: Artifacts.Manifest | null;
      /** The URL loaded with interception */
      MixedContent: {url: string};
      /** The status code of the attempted load of the page while network access is disabled. */
      Offline: number;
      /** Size and compression opportunity information for all the images in the page. */
      OptimizedImages: Array<Artifacts.OptimizedImage | Artifacts.OptimizedImageError>;
      /** HTML snippets from any password inputs that prevent pasting. */
      PasswordInputsWithPreventedPaste: {snippet: string}[];
      /** Size info of all network records sent without compression and their size after gzipping. */
      ResponseCompression: {requestId: string, url: string, mimeType: string, transferSize: number, resourceSize: number, gzipSize?: number}[];
      /** Information on fetching and the content of the /robots.txt file. */
      RobotsTxt: {status: number|null, content: string|null};
      /** Version information for all ServiceWorkers active after the first page load. */
      ServiceWorker: {versions: Crdp.ServiceWorker.ServiceWorkerVersion[], registrations: Crdp.ServiceWorker.ServiceWorkerRegistration[]};
      /** Source maps of scripts executed in the page. */
      SourceMaps: Array<Artifacts.SourceMap>;
      /** The status of an offline fetch of the page's start_url. -1 and a explanation if missing or there was an error. */
      StartUrl: {url?: string, statusCode: number, explanation?: string};
      /** Information on <script> and <link> tags blocking first paint. */
      TagsBlockingFirstPaint: Artifacts.TagBlockingFirstPaint[];
      /** Information about tap targets including their position and size. */
      TapTargets: Artifacts.TapTarget[];
      /** Elements associated with metrics (ie: Largest Contentful Paint element). */
      TraceElements: Artifacts.TraceElement[];
    }

    module Artifacts {
      export type NetworkRequest = _NetworkRequest;
      export type TaskNode = _TaskNode;
      export type MetaElement = LH.Artifacts['MetaElements'][0];

      export interface RuleExecutionError {
        name: string;
        message: string;
      }

      export interface AxeResult {
        id: string;
        impact: string;
        tags: Array<string>;
        nodes: Array<{
          path: string;
          html: string;
          snippet: string;
          target: Array<string>;
          failureSummary?: string;
          nodeLabel?: string;
        }>;
        // When rules error they set these properties
        // https://github.com/dequelabs/axe-core/blob/eeff122c2de11dd690fbad0e50ba2fdb244b50e8/lib/core/base/audit.js#L684-L693
        error?: RuleExecutionError;
      }

      export interface Accessibility {
        violations: Array<AxeResult>;
        notApplicable: Array<Pick<AxeResult, 'id'>>;
        incomplete: Array<AxeResult>;
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
        width: {max: number, pathToElement: Array<string>, snippet: string};
        depth: {max: number, pathToElement: Array<string>, snippet: string};
      }

      export interface EmbeddedContentInfo {
        tagName: string;
        type: string | null;
        src: string | null;
        data: string | null;
        code: string | null;
        params: {name: string; value: string}[];
      }

      export interface IFrameElement {
        /** The `id` attribute of the iframe. */
        id: string,
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
        /** The raw value of the `href` attribute. Only different from `href` when source is 'header' */
        hrefRaw: string
        /** The `hreflang` attribute of the link */
        hreflang: string
        /** The `as` attribute of the link */
        as: string
        /** The `crossOrigin` attribute of the link */
        crossOrigin: string | null
        /** Where the link was found, either in the DOM or in the headers of the main document */
        source: 'head'|'body'|'headers'
      }

      export interface ScriptElement {
        type: string | null
        src: string | null
        /** The `id` property of the script element; null if it had no `id` or if `source` is 'network'. */
        id: string | null
        async: boolean
        defer: boolean
        /** Path that uniquely identifies the node in the DOM */
        devtoolsNodePath: string;
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
        };
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
        devtoolsNodePath: string
        selector: string
        nodeLabel: string
        outerHTML: string
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
          fontSize: number;
          textLength: number;
          node: FontSize.DomNodeWithParent;
          cssRule?: {
            type: 'Regular' | 'Inline' | 'Attributes';
            range?: {startLine: number, startColumn: number};
            parentRule?: {origin: Crdp.CSS.StyleSheetOrigin, selectors: {text: string}[]};
            styleSheetId?: string;
            stylesheet?: Crdp.CSS.CSSStyleSheetHeader;
          }
        }>
      }

      export module FontSize {
        export interface DomNodeWithParent extends Crdp.DOM.Node {
          parentId: number;
          parentNode: DomNodeWithParent;
        }

        export interface DomNodeMaybeWithParent extends Crdp.DOM.Node {
          parentNode?: DomNodeMaybeWithParent;
        }
      }

      // TODO(bckenny): real type for parsed manifest.
      export type Manifest = ReturnType<typeof parseManifest>;

      export interface InstallabilityErrors {
        errors: Crdp.Page.InstallabilityError[];
      }

      export interface ImageElement {
        src: string;
        /** The displayed width of the image, uses img.width when available falling back to clientWidth. See https://codepen.io/patrickhulce/pen/PXvQbM for examples. */
        displayedWidth: number;
        /** The displayed height of the image, uses img.height when available falling back to clientHeight. See https://codepen.io/patrickhulce/pen/PXvQbM for examples. */
        displayedHeight: number;
        /** The natural width of the underlying image, uses img.naturalWidth. See https://codepen.io/patrickhulce/pen/PXvQbM for examples. */
        naturalWidth: number;
        /** The natural height of the underlying image, uses img.naturalHeight. See https://codepen.io/patrickhulce/pen/PXvQbM for examples. */
        naturalHeight: number;
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
        /** Flags whether this element was sized using a non-default `object-fit` CSS property. */
        usesObjectFit: boolean;
        /** Flags whether this element was rendered using a pixel art scaling method.
         *  See https://developer.mozilla.org/en-US/docs/Games/Techniques/Crisp_pixel_art_look for
         *  details.
         */
        usesPixelArtScaling: boolean;
        /** Flags whether the image has a srcset with density descriptors.
         *  See https://html.spec.whatwg.org/multipage/images.html#pixel-density-descriptor
         */
        usesSrcSetDensityDescriptor: boolean;
        /** The size of the underlying image file in bytes. 0 if the file could not be identified. */
        resourceSize: number;
        /** The MIME type of the underlying image file. */
        mimeType?: string;
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
          tagName: string;
          url: string;
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
        snippet: string;
        selector: string;
        nodeLabel?: string;
        path: string;
        href: string;
        clientRects: Rect[];
      }

      export interface TraceElement {
        metricName: string;
        selector: string;
        nodeLabel?: string;
        devtoolsNodePath: string;
        snippet?: string;
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
        simulator?: LanternSimulator;
      }

      export interface MetricComputationData extends MetricComputationDataInput {
        networkRecords: Array<Artifacts.NetworkRequest>;
        traceOfTab: TraceOfTab;
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
        navigationStart: number;
        firstPaint?: number;
        firstContentfulPaint: number;
        firstMeaningfulPaint?: number;
        largestContentfulPaint?: number;
        traceEnd: number;
        load?: number;
        domContentLoaded?: number;
      }

      export interface TraceOfTab {
        /** The raw timestamps of key metric events, in microseconds. */
        timestamps: TraceTimes;
        /** The relative times from navigationStart to key metric events, in milliseconds. */
        timings: TraceTimes;
        /** The subset of trace events from the page's process, sorted by timestamp. */
        processEvents: Array<TraceEvent>;
        /** The subset of trace events from the page's main thread, sorted by timestamp. */
        mainThreadEvents: Array<TraceEvent>;
        /** IDs for the trace's main frame, process, and thread. */
        mainFrameIds: {pid: number, tid: number, frameId: string};
        /** The list of frames committed in the trace. */
        frames: Array<{frame: string, url: string}>;
        /** The trace event marking navigationStart. */
        navigationStartEvt: TraceEvent;
        /** The trace event marking firstPaint, if it was found. */
        firstPaintEvt?: TraceEvent;
        /** The trace event marking firstContentfulPaint, if it was found. */
        firstContentfulPaintEvt: TraceEvent;
        /** The trace event marking firstMeaningfulPaint, if it was found. */
        firstMeaningfulPaintEvt?: TraceEvent;
        /** The trace event marking largestContentfulPaint, if it was found. */
        largestContentfulPaintEvt?: TraceEvent;
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

      export interface TimingSummary {
        firstContentfulPaint: number;
        firstContentfulPaintTs: number | undefined;
        firstMeaningfulPaint: number;
        firstMeaningfulPaintTs: number | undefined;
        largestContentfulPaint: number | undefined;
        largestContentfulPaintTs: number | undefined;
        firstCPUIdle: number | undefined;
        firstCPUIdleTs: number | undefined;
        interactive: number | undefined;
        interactiveTs: number | undefined;
        speedIndex: number | undefined;
        speedIndexTs: number | undefined;
        estimatedInputLatency: number;
        estimatedInputLatencyTs: number | undefined;
        maxPotentialFID: number | undefined;
        cumulativeLayoutShift: number | undefined;
        totalBlockingTime: number;
        observedNavigationStart: number;
        observedNavigationStartTs: number;
        observedCumulativeLayoutShift: number | undefined;
        observedFirstPaint: number | undefined;
        observedFirstPaintTs: number | undefined;
        observedFirstContentfulPaint: number;
        observedFirstContentfulPaintTs: number;
        observedFirstMeaningfulPaint: number | undefined;
        observedFirstMeaningfulPaintTs: number | undefined;
        observedLargestContentfulPaint: number | undefined;
        observedLargestContentfulPaintTs: number | undefined;
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
    }
  }
}

// empty export to keep file a module
export {}
