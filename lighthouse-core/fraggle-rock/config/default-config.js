/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const legacyDefaultConfig = require('../../config/default-config.js');

/** @type {LH.Config.AuditJson[]} */
const frAudits = [
  'byte-efficiency/uses-responsive-images-snapshot',
];

/** @type {Record<string, LH.Config.AuditRefJson[]>} */
const frCategoryAuditRefExtensions = {
  'performance': [
    {id: 'uses-responsive-images-snapshot', weight: 0, group: 'diagnostics'},
  ],
};

/** @return {LH.Config.Json['categories']} */
function mergeCategories() {
  if (!legacyDefaultConfig.categories) return {};
  const categories = legacyDefaultConfig.categories;
  for (const key of Object.keys(frCategoryAuditRefExtensions)) {
    if (!categories[key]) continue;
    categories[key].auditRefs.push(...frCategoryAuditRefExtensions[key]);
  }
  return categories;
}

// Ensure all artifact IDs match the typedefs.
/** @type {Record<keyof LH.FRArtifacts, string>} */
const artifacts = {
  DevtoolsLog: '',
  Trace: '',
  Accessibility: '',
  AnchorElements: '',
  AppCacheManifest: '',
  CacheContents: '',
  ConsoleMessages: '',
  CSSUsage: '',
  Doctype: '',
  DOMStats: '',
  EmbeddedContent: '',
  FontSize: '',
  FormElements: '',
  FullPageScreenshot: '',
  GatherContext: '',
  GlobalListeners: '',
  HostFormFactor: '',
  HostUserAgent: '',
  IFrameElements: '',
  ImageElements: '',
  InstallabilityErrors: '',
  InspectorIssues: '',
  JsUsage: '',
  LinkElements: '',
  MainDocumentContent: '',
  MetaElements: '',
  NetworkUserAgent: '',
  OptimizedImages: '',
  PasswordInputsWithPreventedPaste: '',
  ResponseCompression: '',
  RobotsTxt: '',
  ServiceWorker: '',
  ScriptElements: '',
  ScriptElementsSnapshot: '',
  SourceMaps: '',
  Stacks: '',
  TagsBlockingFirstPaint: '',
  TapTargets: '',
  TraceElements: '',
  ViewportDimensions: '',
  WebAppManifest: '',
  devtoolsLogs: '',
  traces: '',
};

for (const key of Object.keys(artifacts)) {
  artifacts[/** @type {keyof typeof artifacts} */ (key)] = key;
}

/** @type {LH.Config.Json} */
const defaultConfig = {
  artifacts: [
    // Artifacts which can be depended on come first.
    {id: artifacts.HostUserAgent, gatherer: 'host-user-agent'},
    {id: artifacts.HostFormFactor, gatherer: 'host-form-factor'},
    {id: artifacts.DevtoolsLog, gatherer: 'devtools-log'},
    {id: artifacts.Trace, gatherer: 'trace'},

    /* eslint-disable max-len */
    {id: artifacts.Accessibility, gatherer: 'accessibility'},
    {id: artifacts.AnchorElements, gatherer: 'anchor-elements'},
    {id: artifacts.AppCacheManifest, gatherer: 'dobetterweb/appcache'},
    {id: artifacts.CacheContents, gatherer: 'cache-contents'},
    {id: artifacts.ConsoleMessages, gatherer: 'console-messages'},
    {id: artifacts.CSSUsage, gatherer: 'css-usage'},
    {id: artifacts.Doctype, gatherer: 'dobetterweb/doctype'},
    {id: artifacts.DOMStats, gatherer: 'dobetterweb/domstats'},
    {id: artifacts.EmbeddedContent, gatherer: 'seo/embedded-content'},
    {id: artifacts.FontSize, gatherer: 'seo/font-size'},
    {id: artifacts.FormElements, gatherer: 'form-elements'},
    {id: artifacts.FullPageScreenshot, gatherer: 'full-page-screenshot'},
    {id: artifacts.GatherContext, gatherer: 'gather-context'},
    {id: artifacts.GlobalListeners, gatherer: 'global-listeners'},
    {id: artifacts.IFrameElements, gatherer: 'iframe-elements'},
    {id: artifacts.ImageElements, gatherer: 'image-elements'},
    {id: artifacts.InstallabilityErrors, gatherer: 'installability-errors'},
    {id: artifacts.InspectorIssues, gatherer: 'inspector-issues'},
    {id: artifacts.JsUsage, gatherer: 'js-usage'},
    {id: artifacts.LinkElements, gatherer: 'link-elements'},
    {id: artifacts.MainDocumentContent, gatherer: 'main-document-content'},
    {id: artifacts.MetaElements, gatherer: 'meta-elements'},
    {id: artifacts.NetworkUserAgent, gatherer: 'network-user-agent'},
    {id: artifacts.OptimizedImages, gatherer: 'dobetterweb/optimized-images'},
    {id: artifacts.PasswordInputsWithPreventedPaste, gatherer: 'dobetterweb/password-inputs-with-prevented-paste'},
    {id: artifacts.ResponseCompression, gatherer: 'dobetterweb/response-compression'},
    {id: artifacts.RobotsTxt, gatherer: 'seo/robots-txt'},
    {id: artifacts.ServiceWorker, gatherer: 'service-worker'},
    {id: artifacts.ScriptElements, gatherer: 'script-elements'},
    {id: artifacts.ScriptElementsSnapshot, gatherer: 'script-elements-snapshot'},
    {id: artifacts.SourceMaps, gatherer: 'source-maps'},
    {id: artifacts.Stacks, gatherer: 'stacks'},
    {id: artifacts.TagsBlockingFirstPaint, gatherer: 'dobetterweb/tags-blocking-first-paint'},
    {id: artifacts.TapTargets, gatherer: 'seo/tap-targets'},
    {id: artifacts.TraceElements, gatherer: 'trace-elements'},
    {id: artifacts.ViewportDimensions, gatherer: 'viewport-dimensions'},
    {id: artifacts.WebAppManifest, gatherer: 'web-app-manifest'},
    /* eslint-enable max-len */

    // Artifact copies are renamed for compatibility with legacy artifacts.
    {id: artifacts.devtoolsLogs, gatherer: 'devtools-log-compat'},
    {id: artifacts.traces, gatherer: 'trace-compat'},
  ],
  navigations: [
    {
      id: 'default',
      pauseAfterFcpMs: 1000,
      pauseAfterLoadMs: 1000,
      networkQuietThresholdMs: 1000,
      cpuQuietThresholdMs: 1000,
      artifacts: [
        // Artifacts which can be depended on come first.
        artifacts.HostUserAgent,
        artifacts.HostFormFactor,
        artifacts.DevtoolsLog,
        artifacts.Trace,

        artifacts.Accessibility,
        artifacts.AnchorElements,
        artifacts.AppCacheManifest,
        artifacts.CacheContents,
        artifacts.ConsoleMessages,
        artifacts.CSSUsage,
        artifacts.Doctype,
        artifacts.DOMStats,
        artifacts.EmbeddedContent,
        artifacts.FontSize,
        artifacts.FormElements,
        artifacts.FullPageScreenshot,
        artifacts.GatherContext,
        artifacts.GlobalListeners,
        artifacts.IFrameElements,
        artifacts.ImageElements,
        artifacts.InstallabilityErrors,
        artifacts.InspectorIssues,
        artifacts.JsUsage,
        artifacts.LinkElements,
        artifacts.MainDocumentContent,
        artifacts.MetaElements,
        artifacts.NetworkUserAgent,
        artifacts.OptimizedImages,
        artifacts.PasswordInputsWithPreventedPaste,
        artifacts.ResponseCompression,
        artifacts.RobotsTxt,
        artifacts.ServiceWorker,
        artifacts.ScriptElements,
        artifacts.SourceMaps,
        artifacts.Stacks,
        artifacts.TagsBlockingFirstPaint,
        artifacts.TapTargets,
        artifacts.TraceElements,
        artifacts.ViewportDimensions,
        artifacts.WebAppManifest,

        // Compat artifacts come last.
        artifacts.devtoolsLogs,
        artifacts.traces,
      ],
    },
  ],
  settings: legacyDefaultConfig.settings,
  audits: [...(legacyDefaultConfig.audits || []), ...frAudits],
  categories: mergeCategories(),
  groups: legacyDefaultConfig.groups,
};

module.exports = defaultConfig;
