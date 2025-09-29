/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Result as AuditResult } from "../../types/lhr/audit-result";
import { ReportUIFeatures } from "../renderer/report-ui-features.js";

declare module Renderer {
  function renderReport(lhr: AuditResult, options?: Options): HTMLElement;

  interface Options {
    /**
     * Disables automatically applying dark mode based on `prefers-color-scheme: dark`. Dark mode can still
     * be manually applied by assigning the class `lh-dark` to the report element.
     */
    disableDarkMode?: boolean;
    /** Disables the fireworks animation that plays when all core categories have a 100 score. */
    disableFireworks?: boolean;
    /**
     * Disable dark mode and fireworks.
     * @deprecated Use `disableDarkMode` and `disableFireworks` instead.
     */
    disableAutoDarkModeAndFireworks?: boolean;

    /** Disable the topbar UI component */
    omitTopbar?: boolean;
    /** Prevent injection of report styles. Set to true if these styles are already included by the environment. */
    omitGlobalStyles?: boolean;
    /** Ensure the report occupies the entire viewport. This option should be enabled if the report represents the entire page content (i.e. standalone HTML & viewer app) */
    occupyEntireViewport?: boolean;
    /**
     * Convert report anchor links to a different format.
     * Flow report uses this to convert `#seo` to `#index=0&anchor=seo`.
     */
    onPageAnchorRendered?: (link: HTMLAnchorElement) => void;
    /** If defined, `Save as HTML` option is shown in dropdown menu. */
    getStandaloneReportHTML?: () => string;
    /** If defined, renderer will call this instead of `self.print()` */
    onPrintOverride?: (rootEl: HTMLElement) => Promise<void>;
    /** If defined, renderer will call this instead of using a `<a download>.click()>` to trigger a JSON/HTML download. Blob will be either json or html. */
    onSaveFileOverride?: (blob: Blob, suggestedFilename: string) => Promise<void>;
    /**
     * If defined, adds a `View Trace` button to the report, and calls this callback when clicked.
     * The callback should do something to present the user with a visualization of the trace
     * data, which can be gotten from the artifacts.
     */
    onViewTrace?: () => void;
    /**
     * Called when the performance audits/insights are swapped out.
     * TODO(v13): remove
     */
    _onSwapHook?: () => void;
  }
}

export default Renderer;
