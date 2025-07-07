/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable max-len */

import * as LH from '../../types/lh.js';
import * as constants from './constants.js';
import * as i18n from '../lib/i18n/i18n.js';

const UIStrings = {
  /** Title of the Performance category of audits. Equivalent to 'Web performance', this term is inclusive of all web page speed and loading optimization topics. Also used as a label of a score gauge; try to limit to 20 characters. */
  performanceCategoryTitle: 'Performance',
  /** Title of the speed metrics section of the Performance category. Within this section are various speed metrics which quantify the pageload performance into values presented in seconds and milliseconds. */
  metricGroupTitle: 'Metrics',
  /** Title of the insights section of the Performance category. Within this section are various insights to give developers tips on how to improve the performance of their page. */
  insightsGroupTitle: 'Insights',
  /** Description of the insights section of the Performance category. Within this section are various insights to give developers tips on how to improve the performance of their page. */
  insightsGroupDescription: 'These insights are also available in the Chrome DevTools Performance Panel - [record a trace](https://developer.chrome.com/docs/devtools/performance/reference) to view more detailed information.',
  /** Title of an opportunity sub-section of the Performance category. Within this section are audits with imperative titles that suggest actions the user can take to improve the time of the first initial render of the webpage. */
  firstPaintImprovementsGroupTitle: 'First Paint Improvements',
  /** Description of an opportunity sub-section of the Performance category. Within this section are audits with imperative titles that suggest actions the user can take to improve the time of the first initial render of the webpage. */
  firstPaintImprovementsGroupDescription: 'The most critical aspect of performance is how quickly pixels are rendered onscreen. Key metrics: First Contentful Paint, First Meaningful Paint',
  /** Title of an opportunity sub-section of the Performance category. Within this section are audits with imperative titles that suggest actions the user can take to improve the overall loading performance of their web page. */
  overallImprovementsGroupTitle: 'Overall Improvements',
  /** Description of an opportunity sub-section of the Performance category. Within this section are audits with imperative titles that suggest actions the user can take to improve the overall loading performance of their web page. */
  overallImprovementsGroupDescription: 'Enhance the overall loading experience, so the page is responsive and ready to use as soon as possible. Key metrics: Time to Interactive, Speed Index',
  /** Title of the diagnostics section of the Performance category. Within this section are audits with non-imperative titles that provide more detail on the page's page load performance characteristics. Whereas the 'Opportunities' suggest an action along with expected time savings, diagnostics do not. Within this section, the user may read the details and deduce additional actions they could take. */
  diagnosticsGroupTitle: 'Diagnostics',
  /** Description of the diagnostics section of the Performance category. Within this section are audits with non-imperative titles that provide more detail on a web page's load performance characteristics. Within this section, the user may read the details and deduce additional actions they could take to improve performance. */
  diagnosticsGroupDescription: 'More information about the performance of your application. These numbers don\'t [directly affect](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring/) the Performance score.',
  /** Title of the Accessibility category of audits. This section contains audits focused on making web content accessible to all users. Also used as a label of a score gauge; try to limit to 20 characters. */
  a11yCategoryTitle: 'Accessibility',
  /** Description of the Accessibility category. This is displayed at the top of a list of audits focused on making web content accessible to all users. No character length limits. 'improve the accessibility of your web app' and 'manual testing' become link texts to additional documentation. */
  a11yCategoryDescription: 'These checks highlight opportunities to [improve the accessibility of your web app](https://developer.chrome.com/docs/lighthouse/accessibility/). Automatic detection can only detect a subset of issues and does not guarantee the accessibility of your web app, so [manual testing](https://web.dev/articles/how-to-review) is also encouraged.',
  /** Description of the Accessibility manual checks category. This description is displayed above a list of accessibility audits that currently have no automated test and so must be verified manually by the user. No character length limits. 'conducting an accessibility review' becomes link text to additional documentation. */
  a11yCategoryManualDescription: 'These items address areas which an automated testing tool cannot cover. Learn more in our guide on [conducting an accessibility review](https://web.dev/articles/how-to-review).',
  /** Title of the best practices section of the Accessibility category. Within this section are audits with descriptive titles that highlight common accessibility best practices. */
  a11yBestPracticesGroupTitle: 'Best practices',
  /** Description of the best practices section within the Accessibility category. Within this section are audits with descriptive titles that highlight common accessibility best practices. */
  a11yBestPracticesGroupDescription: 'These items highlight common accessibility best practices.',
  /** Title of the color contrast section within the Accessibility category. Within this section are audits with descriptive titles that highlight the color and vision aspects of the page's accessibility that are passing or failing. */
  a11yColorContrastGroupTitle: 'Contrast',
  /** Description of the color contrast section within the Accessibility category. Within this section are audits with descriptive titles that highlight the color and vision aspects of the page's accessibility that are passing or failing. */
  a11yColorContrastGroupDescription: 'These are opportunities to improve the legibility of your content.',
  /** Title of the HTML element naming section within the Accessibility category. Within this section are audits with descriptive titles that highlight if the non-textual HTML elements on the page have names discernible by a screen reader. */
  a11yNamesLabelsGroupTitle: 'Names and labels',
  /** Description of the HTML element naming section within the Accessibility category. Within this section are audits with descriptive titles that highlight if the non-textual HTML elements on the page have names discernible by a screen reader. */
  a11yNamesLabelsGroupDescription: 'These are opportunities to improve the semantics of the controls in your application. This may enhance the experience for users of assistive technology, like a screen reader.',
  /** Title of the navigation section within the Accessibility category. Within this section are audits with descriptive titles that highlight opportunities to improve keyboard navigation. */
  a11yNavigationGroupTitle: 'Navigation',
  /** Description of the navigation section within the Accessibility category. Within this section are audits with descriptive titles that highlight opportunities to improve keyboard navigation. */
  a11yNavigationGroupDescription: 'These are opportunities to improve keyboard navigation in your application.',
  /** Title of the ARIA validity section within the Accessibility category. Within this section are audits with descriptive titles that highlight if whether all the aria-* HTML attributes have been used properly. */
  a11yAriaGroupTitle: 'ARIA',
  /** Description of the ARIA validity section within the Accessibility category. Within this section are audits with descriptive titles that highlight if whether all the aria-* HTML attributes have been used properly. */
  a11yAriaGroupDescription: 'These are opportunities to improve the usage of ARIA in your application which may enhance the experience for users of assistive technology, like a screen reader.',
  /** Title of the language section within the Accessibility category. Within this section are audits with descriptive titles that highlight if the language has been annotated in the correct HTML attributes on the page. */
  a11yLanguageGroupTitle: 'Internationalization and localization',
  /** Description of the language section within the Accessibility category. Within this section are audits with descriptive titles that highlight if the language has been annotated in the correct HTML attributes on the page. */
  a11yLanguageGroupDescription: 'These are opportunities to improve the interpretation of your content by users in different locales.',
  /** Title of the navigation section within the Accessibility category. Within this section are audits with descriptive titles that highlight opportunities to provide alternative content for audio and video. */
  a11yAudioVideoGroupTitle: 'Audio and video',
  /** Description of the navigation section within the Accessibility category. Within this section are audits with descriptive titles that highlight opportunities to provide alternative content for audio and video. */
  a11yAudioVideoGroupDescription: 'These are opportunities to provide alternative content for audio and video. This may improve the experience for users with hearing or vision impairments.',
  /** Title of the navigation section within the Accessibility category. Within this section are audits with descriptive titles that highlight opportunities to improve the experience of reading tabular or list data using assistive technology. */
  a11yTablesListsVideoGroupTitle: 'Tables and lists',
  /** Description of the navigation section within the Accessibility category. Within this section are audits with descriptive titles that highlight opportunities to improve the experience of reading tabular or list data using assistive technology. */
  a11yTablesListsVideoGroupDescription: 'These are opportunities to improve the experience of reading tabular or list data using assistive technology, like a screen reader.',
  /** Title of the Search Engine Optimization (SEO) category of audits. This is displayed at the top of a list of audits focused on topics related to optimizing a website for indexing by search engines. Also used as a label of a score gauge; try to limit to 20 characters. */
  seoCategoryTitle: 'SEO',
  /** Description of the Search Engine Optimization (SEO) category. This is displayed at the top of a list of audits focused on optimizing a website for indexing by search engines. No character length limits. The last sentence starting with 'Learn' becomes link text to additional documentation. */
  seoCategoryDescription: 'These checks ensure that your page is following basic search engine optimization advice. ' +
  'There are many additional factors Lighthouse does not score here that may affect your search ranking, ' +
  'including performance on [Core Web Vitals](https://web.dev/explore/vitals). [Learn more about Google Search Essentials](https://support.google.com/webmasters/answer/35769).',
  /** Description of the Search Engine Optimization (SEO) manual checks category, the additional validators must be run by hand in order to check all SEO best practices. This is displayed at the top of a list of manually run audits focused on optimizing a website for indexing by search engines. No character length limits. */
  seoCategoryManualDescription: 'Run these additional validators on your site to check additional SEO best practices.',
  /** Title of the navigation section within the Search Engine Optimization (SEO) category. Within this section are audits with descriptive titles that highlight opportunities to make a page more usable on mobile devices. */
  seoMobileGroupTitle: 'Mobile Friendly',
  /** Description of the navigation section within the Search Engine Optimization (SEO) category. Within this section are audits with descriptive titles that highlight opportunities to make a page more usable on mobile devices. */
  seoMobileGroupDescription: 'Make sure your pages are mobile friendly so users don’t have to pinch or zoom ' +
  'in order to read the content pages. [Learn how to make pages mobile-friendly](https://developers.google.com/search/mobile-sites/).',
  /** Title of the navigation section within the Search Engine Optimization (SEO) category. Within this section are audits with descriptive titles that highlight ways to make a website content more easily understood by search engine crawler bots. */
  seoContentGroupTitle: 'Content Best Practices',
  /** Description of the navigation section within the Search Engine Optimization (SEO) category. Within this section are audits with descriptive titles that highlight ways to make a website content more easily understood by search engine crawler bots. */
  seoContentGroupDescription: 'Format your HTML in a way that enables crawlers to better understand your app’s content.',
  /** Title of the navigation section within the Search Engine Optimization (SEO) category. Within this section are audits with descriptive titles that highlight ways to make a website accessible to search engine crawlers. */
  seoCrawlingGroupTitle: 'Crawling and Indexing',
  /** Description of the navigation section within the Search Engine Optimization (SEO) category. Within this section are audits with descriptive titles that highlight ways to make a website accessible to search engine crawlers. */
  seoCrawlingGroupDescription: 'To appear in search results, crawlers need access to your app.',
  /** Title of the Best Practices category of audits. This is displayed at the top of a list of audits focused on topics related to following web development best practices and accepted guidelines. Also used as a label of a score gauge; try to limit to 20 characters. */
  bestPracticesCategoryTitle: 'Best Practices',
  /** Title of the Trust & Safety group of audits. This is displayed at the top of a list of audits focused on maintaining user trust and protecting security in web development. */
  bestPracticesTrustSafetyGroupTitle: 'Trust and Safety',
  /** Title of the User Experience group of the Best Practices category. Within this section are the audits related to the end user's experience of the webpage. */
  bestPracticesUXGroupTitle: 'User Experience',
  /** Title of the Browser Compatibility group of the Best Practices category. Within this section are the audits related to whether the page is interpreted consistently by browsers. */
  bestPracticesBrowserCompatGroupTitle: 'Browser Compatibility',
  /** Title of the General group of the Best Practices category. Within this section are the audits that don't belong to a specific group but are of general interest. */
  bestPracticesGeneralGroupTitle: 'General',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

/** @type {LH.Config} */
const defaultConfig = {
  settings: constants.defaultSettings,
  artifacts: [
    // Artifacts which can be depended on come first.
    {id: 'DevtoolsLog', gatherer: 'devtools-log'},
    {id: 'Trace', gatherer: 'trace'},

    {id: 'Accessibility', gatherer: 'accessibility'},
    {id: 'AnchorElements', gatherer: 'anchor-elements'},
    {id: 'CacheContents', gatherer: 'cache-contents'},
    {id: 'ConsoleMessages', gatherer: 'console-messages'},
    {id: 'CSSUsage', gatherer: 'css-usage'},
    {id: 'Doctype', gatherer: 'dobetterweb/doctype'},
    {id: 'DOMStats', gatherer: 'dobetterweb/domstats'},
    {id: 'FontSize', gatherer: 'seo/font-size'},
    {id: 'Inputs', gatherer: 'inputs'},
    {id: 'IFrameElements', gatherer: 'iframe-elements'},
    {id: 'ImageElements', gatherer: 'image-elements'},
    {id: 'InspectorIssues', gatherer: 'inspector-issues'},
    {id: 'JsUsage', gatherer: 'js-usage'},
    {id: 'LinkElements', gatherer: 'link-elements'},
    {id: 'MainDocumentContent', gatherer: 'main-document-content'},
    {id: 'MetaElements', gatherer: 'meta-elements'},
    {id: 'NetworkUserAgent', gatherer: 'network-user-agent'},
    {id: 'OptimizedImages', gatherer: 'dobetterweb/optimized-images'},
    {id: 'ResponseCompression', gatherer: 'dobetterweb/response-compression'},
    {id: 'RobotsTxt', gatherer: 'seo/robots-txt'},
    {id: 'Scripts', gatherer: 'scripts'},
    {id: 'SourceMaps', gatherer: 'source-maps'},
    {id: 'Stacks', gatherer: 'stacks'},
    {id: 'Stylesheets', gatherer: 'stylesheets'},
    {id: 'TraceElements', gatherer: 'trace-elements'},
    {id: 'ViewportDimensions', gatherer: 'viewport-dimensions'},

    // Artifact copies are renamed for compatibility with legacy artifacts.
    {id: 'devtoolsLogs', gatherer: 'devtools-log-compat'},
    {id: 'traces', gatherer: 'trace-compat'},

    // FullPageScreenshot comes at the end so all other node analysis is captured.
    {id: 'FullPageScreenshot', gatherer: 'full-page-screenshot'},

    // BFCacheFailures comes at the very end because it can perform a page navigation.
    {id: 'BFCacheFailures', gatherer: 'bf-cache-failures'},
  ],
  audits: [
    'is-on-https',
    'redirects-http',
    'viewport',
    'metrics/first-contentful-paint',
    'metrics/largest-contentful-paint',
    'metrics/first-meaningful-paint',
    'metrics/speed-index',
    'screenshot-thumbnails',
    'final-screenshot',
    'metrics/total-blocking-time',
    'metrics/max-potential-fid',
    'metrics/cumulative-layout-shift',
    'metrics/interaction-to-next-paint',
    'errors-in-console',
    'server-response-time',
    'metrics/interactive',
    'user-timings',
    'critical-request-chains',
    'redirects',
    'image-aspect-ratio',
    'image-size-responsive',
    'deprecations',
    'third-party-cookies',
    'mainthread-work-breakdown',
    'bootup-time',
    'uses-rel-preconnect',
    'font-display',
    'diagnostics',
    'network-requests',
    'network-rtt',
    'network-server-latency',
    'main-thread-tasks',
    'metrics',
    'resource-summary',
    'third-party-summary',
    'third-party-facades',
    'largest-contentful-paint-element',
    'lcp-lazy-loaded',
    'layout-shifts',
    'long-tasks',
    'non-composited-animations',
    'unsized-images',
    'valid-source-maps',
    'prioritize-lcp-image',
    'csp-xss',
    'has-hsts',
    'origin-isolation',
    'clickjacking-mitigation',
    'trusted-types-xss',
    'script-treemap-data',
    'accessibility/accesskeys',
    'accessibility/aria-allowed-attr',
    'accessibility/aria-allowed-role',
    'accessibility/aria-command-name',
    'accessibility/aria-conditional-attr',
    'accessibility/aria-deprecated-role',
    'accessibility/aria-dialog-name',
    'accessibility/aria-hidden-body',
    'accessibility/aria-hidden-focus',
    'accessibility/aria-input-field-name',
    'accessibility/aria-meter-name',
    'accessibility/aria-progressbar-name',
    'accessibility/aria-prohibited-attr',
    'accessibility/aria-required-attr',
    'accessibility/aria-required-children',
    'accessibility/aria-required-parent',
    'accessibility/aria-roles',
    'accessibility/aria-text',
    'accessibility/aria-toggle-field-name',
    'accessibility/aria-tooltip-name',
    'accessibility/aria-treeitem-name',
    'accessibility/aria-valid-attr-value',
    'accessibility/aria-valid-attr',
    'accessibility/button-name',
    'accessibility/bypass',
    'accessibility/color-contrast',
    'accessibility/definition-list',
    'accessibility/dlitem',
    'accessibility/document-title',
    'accessibility/duplicate-id-aria',
    'accessibility/empty-heading',
    'accessibility/form-field-multiple-labels',
    'accessibility/frame-title',
    'accessibility/heading-order',
    'accessibility/html-has-lang',
    'accessibility/html-lang-valid',
    'accessibility/html-xml-lang-mismatch',
    'accessibility/identical-links-same-purpose',
    'accessibility/image-alt',
    'accessibility/image-redundant-alt',
    'accessibility/input-button-name',
    'accessibility/input-image-alt',
    'accessibility/label-content-name-mismatch',
    'accessibility/label',
    'accessibility/landmark-one-main',
    'accessibility/link-name',
    'accessibility/link-in-text-block',
    'accessibility/list',
    'accessibility/listitem',
    'accessibility/meta-refresh',
    'accessibility/meta-viewport',
    'accessibility/object-alt',
    'accessibility/select-name',
    'accessibility/skip-link',
    'accessibility/tabindex',
    'accessibility/table-duplicate-name',
    'accessibility/table-fake-caption',
    'accessibility/target-size',
    'accessibility/td-has-header',
    'accessibility/td-headers-attr',
    'accessibility/th-has-data-cells',
    'accessibility/valid-lang',
    'accessibility/video-caption',
    'accessibility/manual/custom-controls-labels',
    'accessibility/manual/custom-controls-roles',
    'accessibility/manual/focus-traps',
    'accessibility/manual/focusable-controls',
    'accessibility/manual/interactive-element-affordance',
    'accessibility/manual/logical-tab-order',
    'accessibility/manual/managed-focus',
    'accessibility/manual/offscreen-content-hidden',
    'accessibility/manual/use-landmarks',
    'accessibility/manual/visual-order-follows-dom',
    'byte-efficiency/uses-long-cache-ttl',
    'byte-efficiency/total-byte-weight',
    'byte-efficiency/offscreen-images',
    'byte-efficiency/render-blocking-resources',
    'byte-efficiency/unminified-css',
    'byte-efficiency/unminified-javascript',
    'byte-efficiency/unused-css-rules',
    'byte-efficiency/unused-javascript',
    'byte-efficiency/modern-image-formats',
    'byte-efficiency/uses-optimized-images',
    'byte-efficiency/uses-text-compression',
    'byte-efficiency/uses-responsive-images',
    'byte-efficiency/efficient-animated-content',
    'byte-efficiency/duplicated-javascript',
    'byte-efficiency/legacy-javascript',
    'byte-efficiency/uses-responsive-images-snapshot',
    'dobetterweb/doctype',
    'dobetterweb/charset',
    'dobetterweb/dom-size',
    'dobetterweb/geolocation-on-start',
    'dobetterweb/inspector-issues',
    'dobetterweb/no-document-write',
    'dobetterweb/js-libraries',
    'dobetterweb/notification-on-start',
    'dobetterweb/paste-preventing-inputs',
    'dobetterweb/uses-http2',
    'dobetterweb/uses-passive-event-listeners',
    'seo/meta-description',
    'seo/http-status-code',
    'seo/font-size',
    'seo/link-text',
    'seo/crawlable-anchors',
    'seo/is-crawlable',
    'seo/robots-txt',
    'seo/hreflang',
    'seo/canonical',
    'seo/manual/structured-data',
    'work-during-interaction',
    'bf-cache',
    'insights/cache-insight',
    'insights/cls-culprits-insight',
    'insights/document-latency-insight',
    'insights/dom-size-insight',
    'insights/duplicated-javascript-insight',
    'insights/font-display-insight',
    'insights/forced-reflow-insight',
    'insights/image-delivery-insight',
    'insights/inp-breakdown-insight',
    'insights/lcp-breakdown-insight',
    'insights/lcp-discovery-insight',
    'insights/legacy-javascript-insight',
    'insights/modern-http-insight',
    'insights/network-dependency-tree-insight',
    'insights/render-blocking-insight',
    'insights/third-parties-insight',
    'insights/viewport-insight',
  ],
  groups: {
    'metrics': {
      title: str_(UIStrings.metricGroupTitle),
    },
    'insights': {
      title: str_(UIStrings.insightsGroupTitle),
      description: str_(UIStrings.insightsGroupDescription),
    },
    'diagnostics': {
      title: str_(UIStrings.diagnosticsGroupTitle),
      description: str_(UIStrings.diagnosticsGroupDescription),
    },
    'a11y-best-practices': {
      title: str_(UIStrings.a11yBestPracticesGroupTitle),
      description: str_(UIStrings.a11yBestPracticesGroupDescription),
    },
    'a11y-color-contrast': {
      title: str_(UIStrings.a11yColorContrastGroupTitle),
      description: str_(UIStrings.a11yColorContrastGroupDescription),
    },
    'a11y-names-labels': {
      title: str_(UIStrings.a11yNamesLabelsGroupTitle),
      description: str_(UIStrings.a11yNamesLabelsGroupDescription),
    },
    'a11y-navigation': {
      title: str_(UIStrings.a11yNavigationGroupTitle),
      description: str_(UIStrings.a11yNavigationGroupDescription),
    },
    'a11y-aria': {
      title: str_(UIStrings.a11yAriaGroupTitle),
      description: str_(UIStrings.a11yAriaGroupDescription),
    },
    'a11y-language': {
      title: str_(UIStrings.a11yLanguageGroupTitle),
      description: str_(UIStrings.a11yLanguageGroupDescription),
    },
    'a11y-audio-video': {
      title: str_(UIStrings.a11yAudioVideoGroupTitle),
      description: str_(UIStrings.a11yAudioVideoGroupDescription),
    },
    'a11y-tables-lists': {
      title: str_(UIStrings.a11yTablesListsVideoGroupTitle),
      description: str_(UIStrings.a11yTablesListsVideoGroupDescription),
    },
    'seo-mobile': {
      title: str_(UIStrings.seoMobileGroupTitle),
      description: str_(UIStrings.seoMobileGroupDescription),
    },
    'seo-content': {
      title: str_(UIStrings.seoContentGroupTitle),
      description: str_(UIStrings.seoContentGroupDescription),
    },
    'seo-crawl': {
      title: str_(UIStrings.seoCrawlingGroupTitle),
      description: str_(UIStrings.seoCrawlingGroupDescription),
    },
    'best-practices-trust-safety': {
      title: str_(UIStrings.bestPracticesTrustSafetyGroupTitle),
    },
    'best-practices-ux': {
      title: str_(UIStrings.bestPracticesUXGroupTitle),
    },
    'best-practices-browser-compat': {
      title: str_(UIStrings.bestPracticesBrowserCompatGroupTitle),
    },
    'best-practices-general': {
      title: str_(UIStrings.bestPracticesGeneralGroupTitle),
    },
    // Group for audits that should not be displayed.
    'hidden': {title: ''},
  },
  categories: {
    'performance': {
      title: str_(UIStrings.performanceCategoryTitle),
      supportedModes: ['navigation', 'timespan', 'snapshot'],
      auditRefs: [
        {id: 'first-contentful-paint', weight: 10, group: 'metrics', acronym: 'FCP'},
        {id: 'largest-contentful-paint', weight: 25, group: 'metrics', acronym: 'LCP'},
        {id: 'total-blocking-time', weight: 30, group: 'metrics', acronym: 'TBT'},
        {id: 'cumulative-layout-shift', weight: 25, group: 'metrics', acronym: 'CLS'},
        {id: 'speed-index', weight: 10, group: 'metrics', acronym: 'SI'},
        {id: 'interaction-to-next-paint', weight: 0, group: 'metrics', acronym: 'INP'},

        // Insight audits.
        {id: 'cache-insight', weight: 0, group: 'hidden'},
        {id: 'cls-culprits-insight', weight: 0, group: 'hidden'},
        {id: 'document-latency-insight', weight: 0, group: 'hidden'},
        {id: 'dom-size-insight', weight: 0, group: 'hidden'},
        {id: 'duplicated-javascript-insight', weight: 0, group: 'hidden'},
        {id: 'font-display-insight', weight: 0, group: 'hidden'},
        {id: 'forced-reflow-insight', weight: 0, group: 'hidden'},
        {id: 'image-delivery-insight', weight: 0, group: 'hidden'},
        {id: 'inp-breakdown-insight', weight: 0, group: 'hidden'},
        {id: 'lcp-breakdown-insight', weight: 0, group: 'hidden'},
        {id: 'lcp-discovery-insight', weight: 0, group: 'hidden'},
        {id: 'legacy-javascript-insight', weight: 0, group: 'hidden'},
        {id: 'modern-http-insight', weight: 0, group: 'hidden'},
        {id: 'network-dependency-tree-insight', weight: 0, group: 'hidden'},
        {id: 'render-blocking-insight', weight: 0, group: 'hidden'},
        {id: 'third-parties-insight', weight: 0, group: 'hidden'},
        {id: 'viewport-insight', weight: 0, group: 'hidden'},

        // These are our "invisible" metrics. Not displayed, but still in the LHR.
        {id: 'interactive', weight: 0, group: 'hidden', acronym: 'TTI'},
        {id: 'max-potential-fid', weight: 0, group: 'hidden'},
        {id: 'first-meaningful-paint', weight: 0, acronym: 'FMP', group: 'hidden'},

        {id: 'render-blocking-resources', weight: 0, group: 'diagnostics'},
        {id: 'uses-responsive-images', weight: 0, group: 'diagnostics'},
        {id: 'offscreen-images', weight: 0, group: 'diagnostics'},
        {id: 'unminified-css', weight: 0, group: 'diagnostics'},
        {id: 'unminified-javascript', weight: 0, group: 'diagnostics'},
        {id: 'unused-css-rules', weight: 0, group: 'diagnostics'},
        {id: 'unused-javascript', weight: 0, group: 'diagnostics'},
        {id: 'uses-optimized-images', weight: 0, group: 'diagnostics'},
        {id: 'modern-image-formats', weight: 0, group: 'diagnostics'},
        {id: 'uses-text-compression', weight: 0, group: 'diagnostics'},
        {id: 'uses-rel-preconnect', weight: 0, group: 'diagnostics'},
        {id: 'server-response-time', weight: 0, group: 'diagnostics'},
        {id: 'redirects', weight: 0, group: 'diagnostics'},
        {id: 'uses-http2', weight: 0, group: 'diagnostics'},
        {id: 'efficient-animated-content', weight: 0, group: 'diagnostics'},
        {id: 'duplicated-javascript', weight: 0, group: 'diagnostics'},
        {id: 'legacy-javascript', weight: 0, group: 'diagnostics'},
        {id: 'prioritize-lcp-image', weight: 0, group: 'diagnostics'},
        {id: 'total-byte-weight', weight: 0, group: 'diagnostics'},
        {id: 'uses-long-cache-ttl', weight: 0, group: 'diagnostics'},
        {id: 'dom-size', weight: 0, group: 'diagnostics'},
        {id: 'critical-request-chains', weight: 0, group: 'diagnostics'},
        {id: 'user-timings', weight: 0, group: 'diagnostics'},
        {id: 'bootup-time', weight: 0, group: 'diagnostics'},
        {id: 'mainthread-work-breakdown', weight: 0, group: 'diagnostics'},
        {id: 'font-display', weight: 0, group: 'diagnostics'},
        {id: 'third-party-summary', weight: 0, group: 'diagnostics'},
        {id: 'third-party-facades', weight: 0, group: 'diagnostics'},
        {id: 'largest-contentful-paint-element', weight: 0, group: 'diagnostics'},
        {id: 'lcp-lazy-loaded', weight: 0, group: 'diagnostics'},
        {id: 'layout-shifts', weight: 0, group: 'diagnostics'},
        {id: 'uses-passive-event-listeners', weight: 0, group: 'diagnostics'},
        {id: 'no-document-write', weight: 0, group: 'diagnostics'},
        {id: 'long-tasks', weight: 0, group: 'diagnostics'},
        {id: 'non-composited-animations', weight: 0, group: 'diagnostics'},
        {id: 'unsized-images', weight: 0, group: 'diagnostics'},
        {id: 'viewport', weight: 0, group: 'diagnostics'},
        {id: 'uses-responsive-images-snapshot', weight: 0, group: 'diagnostics'},
        {id: 'work-during-interaction', weight: 0, group: 'diagnostics'},
        {id: 'bf-cache', weight: 0, group: 'diagnostics'},

        // Audits past this point contain useful data but are not displayed with other audits.
        {id: 'network-requests', weight: 0, group: 'hidden'},
        {id: 'network-rtt', weight: 0, group: 'hidden'},
        {id: 'network-server-latency', weight: 0, group: 'hidden'},
        {id: 'main-thread-tasks', weight: 0, group: 'hidden'},
        {id: 'diagnostics', weight: 0, group: 'hidden'},
        {id: 'metrics', weight: 0, group: 'hidden'},
        {id: 'screenshot-thumbnails', weight: 0, group: 'hidden'},
        {id: 'final-screenshot', weight: 0, group: 'hidden'},
        {id: 'script-treemap-data', weight: 0, group: 'hidden'},
        {id: 'resource-summary', weight: 0, group: 'hidden'},
      ],
    },
    'accessibility': {
      title: str_(UIStrings.a11yCategoryTitle),
      description: str_(UIStrings.a11yCategoryDescription),
      manualDescription: str_(UIStrings.a11yCategoryManualDescription),
      supportedModes: ['navigation', 'snapshot'],
      // Audit weights are meant to match the aXe scoring system of
      // minor, moderate, serious, and critical.
      // See the audits listed at dequeuniversity.com/rules/axe/4.7.
      // Click on an audit and check the right hand column to see its severity.
      auditRefs: [
        {id: 'accesskeys', weight: 7, group: 'a11y-navigation'},
        {id: 'aria-allowed-attr', weight: 10, group: 'a11y-aria'},
        {id: 'aria-allowed-role', weight: 1, group: 'a11y-aria'},
        {id: 'aria-command-name', weight: 7, group: 'a11y-aria'},
        {id: 'aria-conditional-attr', weight: 7, group: 'a11y-aria'},
        {id: 'aria-deprecated-role', weight: 1, group: 'a11y-aria'},
        {id: 'aria-dialog-name', weight: 7, group: 'a11y-aria'},
        {id: 'aria-hidden-body', weight: 10, group: 'a11y-aria'},
        {id: 'aria-hidden-focus', weight: 7, group: 'a11y-aria'},
        {id: 'aria-input-field-name', weight: 7, group: 'a11y-aria'},
        {id: 'aria-meter-name', weight: 7, group: 'a11y-aria'},
        {id: 'aria-progressbar-name', weight: 7, group: 'a11y-aria'},
        {id: 'aria-prohibited-attr', weight: 7, group: 'a11y-aria'},
        {id: 'aria-required-attr', weight: 10, group: 'a11y-aria'},
        {id: 'aria-required-children', weight: 10, group: 'a11y-aria'},
        {id: 'aria-required-parent', weight: 10, group: 'a11y-aria'},
        {id: 'aria-roles', weight: 7, group: 'a11y-aria'},
        {id: 'aria-text', weight: 7, group: 'a11y-aria'},
        {id: 'aria-toggle-field-name', weight: 7, group: 'a11y-aria'},
        {id: 'aria-tooltip-name', weight: 7, group: 'a11y-aria'},
        {id: 'aria-treeitem-name', weight: 7, group: 'a11y-aria'},
        {id: 'aria-valid-attr-value', weight: 10, group: 'a11y-aria'},
        {id: 'aria-valid-attr', weight: 10, group: 'a11y-aria'},
        {id: 'button-name', weight: 10, group: 'a11y-names-labels'},
        {id: 'bypass', weight: 7, group: 'a11y-navigation'},
        {id: 'color-contrast', weight: 7, group: 'a11y-color-contrast'},
        {id: 'definition-list', weight: 7, group: 'a11y-tables-lists'},
        {id: 'dlitem', weight: 7, group: 'a11y-tables-lists'},
        {id: 'document-title', weight: 7, group: 'a11y-names-labels'},
        {id: 'duplicate-id-aria', weight: 10, group: 'a11y-aria'},
        {id: 'form-field-multiple-labels', weight: 3, group: 'a11y-names-labels'},
        {id: 'frame-title', weight: 7, group: 'a11y-names-labels'},
        {id: 'heading-order', weight: 3, group: 'a11y-navigation'},
        {id: 'html-has-lang', weight: 7, group: 'a11y-language'},
        {id: 'html-lang-valid', weight: 7, group: 'a11y-language'},
        {id: 'html-xml-lang-mismatch', weight: 3, group: 'a11y-language'},
        {id: 'image-alt', weight: 10, group: 'a11y-names-labels'},
        {id: 'image-redundant-alt', weight: 1, group: 'a11y-names-labels'},
        {id: 'input-button-name', weight: 10, group: 'a11y-names-labels'},
        {id: 'input-image-alt', weight: 10, group: 'a11y-names-labels'},
        {id: 'label', weight: 7, group: 'a11y-names-labels'},
        {id: 'link-in-text-block', weight: 7, group: 'a11y-color-contrast'},
        {id: 'link-name', weight: 7, group: 'a11y-names-labels'},
        {id: 'list', weight: 7, group: 'a11y-tables-lists'},
        {id: 'listitem', weight: 7, group: 'a11y-tables-lists'},
        {id: 'meta-refresh', weight: 10, group: 'a11y-best-practices'},
        {id: 'meta-viewport', weight: 10, group: 'a11y-best-practices'},
        {id: 'object-alt', weight: 7, group: 'a11y-names-labels'},
        {id: 'select-name', weight: 7, group: 'a11y-names-labels'},
        {id: 'skip-link', weight: 3, group: 'a11y-names-labels'},
        {id: 'tabindex', weight: 7, group: 'a11y-navigation'},
        {id: 'table-duplicate-name', weight: 1, group: 'a11y-tables-lists'},
        {id: 'target-size', weight: 7, group: 'a11y-best-practices'},
        {id: 'td-headers-attr', weight: 7, group: 'a11y-tables-lists'},
        {id: 'th-has-data-cells', weight: 7, group: 'a11y-tables-lists'},
        {id: 'valid-lang', weight: 7, group: 'a11y-language'},
        {id: 'video-caption', weight: 10, group: 'a11y-audio-video'},
        // Manual audits
        {id: 'focusable-controls', weight: 0},
        {id: 'interactive-element-affordance', weight: 0},
        {id: 'logical-tab-order', weight: 0},
        {id: 'visual-order-follows-dom', weight: 0},
        {id: 'focus-traps', weight: 0},
        {id: 'managed-focus', weight: 0},
        {id: 'use-landmarks', weight: 0},
        {id: 'offscreen-content-hidden', weight: 0},
        {id: 'custom-controls-labels', weight: 0},
        {id: 'custom-controls-roles', weight: 0},
        // Hidden audits
        {id: 'empty-heading', weight: 0, group: 'hidden'},
        {id: 'identical-links-same-purpose', weight: 0, group: 'hidden'},
        {id: 'landmark-one-main', weight: 0, group: 'hidden'},
        {id: 'label-content-name-mismatch', weight: 0, group: 'hidden'},
        {id: 'table-fake-caption', weight: 0, group: 'hidden'},
        {id: 'td-has-header', weight: 0, group: 'hidden'},
      ],
    },
    'best-practices': {
      title: str_(UIStrings.bestPracticesCategoryTitle),
      supportedModes: ['navigation', 'timespan', 'snapshot'],
      auditRefs: [
        // Trust & Safety
        {id: 'is-on-https', weight: 5, group: 'best-practices-trust-safety'},
        {id: 'redirects-http', weight: 1, group: 'best-practices-trust-safety'},
        {id: 'geolocation-on-start', weight: 1, group: 'best-practices-trust-safety'},
        {id: 'notification-on-start', weight: 1, group: 'best-practices-trust-safety'},
        {id: 'csp-xss', weight: 0, group: 'best-practices-trust-safety'},
        {id: 'has-hsts', weight: 0, group: 'best-practices-trust-safety'},
        {id: 'origin-isolation', weight: 0, group: 'best-practices-trust-safety'},
        {id: 'clickjacking-mitigation', weight: 0, group: 'best-practices-trust-safety'},
        {id: 'trusted-types-xss', weight: 0, group: 'best-practices-trust-safety'},
        // User Experience
        {id: 'paste-preventing-inputs', weight: 3, group: 'best-practices-ux'},
        {id: 'image-aspect-ratio', weight: 1, group: 'best-practices-ux'},
        {id: 'image-size-responsive', weight: 1, group: 'best-practices-ux'},
        {id: 'viewport', weight: 1, group: 'best-practices-ux'},
        {id: 'font-size', weight: 1, group: 'best-practices-ux'},
        // Browser Compatibility
        {id: 'doctype', weight: 1, group: 'best-practices-browser-compat'},
        {id: 'charset', weight: 1, group: 'best-practices-browser-compat'},
        // General Group
        {id: 'js-libraries', weight: 0, group: 'best-practices-general'},
        {id: 'deprecations', weight: 5, group: 'best-practices-general'},
        {id: 'third-party-cookies', weight: 5, group: 'best-practices-general'},
        {id: 'errors-in-console', weight: 1, group: 'best-practices-general'},
        {id: 'valid-source-maps', weight: 0, group: 'best-practices-general'},
        {id: 'inspector-issues', weight: 1, group: 'best-practices-general'},
      ],
    },
    'seo': {
      title: str_(UIStrings.seoCategoryTitle),
      description: str_(UIStrings.seoCategoryDescription),
      manualDescription: str_(UIStrings.seoCategoryManualDescription),
      supportedModes: ['navigation', 'snapshot'],
      auditRefs: [
        // Should be at least 31% of the score, such that this audit failing
        // results in the SEO category failing.
        // Solve for w:
        //    w / (w + T) >= 0.31
        // where T is the sum of all the other weights.
        {id: 'is-crawlable', weight: 93 / 23, group: 'seo-crawl'},
        {id: 'document-title', weight: 1, group: 'seo-content'},
        {id: 'meta-description', weight: 1, group: 'seo-content'},
        {id: 'http-status-code', weight: 1, group: 'seo-crawl'},
        {id: 'link-text', weight: 1, group: 'seo-content'},
        {id: 'crawlable-anchors', weight: 1, group: 'seo-crawl'},
        {id: 'robots-txt', weight: 1, group: 'seo-crawl'},
        {id: 'image-alt', weight: 1, group: 'seo-content'},
        {id: 'hreflang', weight: 1, group: 'seo-content'},
        {id: 'canonical', weight: 1, group: 'seo-content'},
        // Manual audits
        {id: 'structured-data', weight: 0},
      ],
    },
  },
};

// Use `defineProperty` so that the strings are accesible from original but ignored when we copy it
Object.defineProperty(defaultConfig, 'UIStrings', {
  enumerable: false,
  get: () => UIStrings,
});

export default defaultConfig;
