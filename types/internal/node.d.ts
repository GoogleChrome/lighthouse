/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

declare global {
  var isDevtools: boolean | undefined;
  var isLightrider: boolean | undefined;

  // Some functions defined in node are stringified and run in the browser.
  // Ensure those functions are working with the correct browser environment.
  interface Window {
    // Cached native functions/objects for use in case the page overwrites them.
    // See: `executionContext.cacheNativesOnNewDocument`.
    __nativePromise: PromiseConstructor;
    __nativePerformance: Performance;
    __nativeFetch: typeof fetch,
    __nativeURL: typeof URL;
    __ElementMatches: Element['matches'];
    __HTMLElementBoundingClientRect: HTMLElement['getBoundingClientRect'];

    /** Used for monitoring long tasks in the test page. */
    ____lastLongTask?: number;

    /** Used by FullPageScreenshot gatherer. */
    __lighthouseNodesDontTouchOrAllVarianceGoesAway: Map<Element, string>;
    __lighthouseExecutionContextUniqueIdentifier?: number;

    /** Injected into the page when the `--debug` flag is used. */
    continueLighthouseRun(): void;
  }

  // `fetchPriority` not defined in tsc as of 4.9.4.
  interface HTMLImageElement {
    /**
     * Sets the priority for fetches initiated by the element.
     * @see https://html.spec.whatwg.org/multipage/embedded-content.html#dom-img-fetchpriority
     */
    fetchPriority: string;
  }
  interface HTMLLinkElement {
    /**
     * Sets the priority for fetches initiated by the element.
     * @see https://html.spec.whatwg.org/multipage/semantics.html#dom-link-fetchpriority
     */
    fetchPriority: string;
  }
}

export {};
