/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Config for new audits that aren't quite ready for
 * being enabled by default.
 */

/** @type {LH.Config} */
const config = {
  extends: 'lighthouse:default',
  audits: [
    'autocomplete',
    // Preload advice is on hold until https://github.com/GoogleChrome/lighthouse/issues/11960
    'preload-fonts',
    'uses-rel-preload',
  ],
  categories: {
    // @ts-ignore: `title` is required in CategoryJson. setting to the same value as the default
    // config is awkward - easier to omit the property here. Will defer to default config.
    'performance': {
      auditRefs: [
        {id: 'uses-rel-preload', weight: 0, group: 'diagnostics'},

        // TODO: Remove this when insights aren't hidden by default
        // Insight audits.
        {id: 'cache-insight', weight: 0, group: 'insights'},
        {id: 'cls-culprits-insight', weight: 0, group: 'insights'},
        {id: 'document-latency-insight', weight: 0, group: 'insights'},
        {id: 'dom-size-insight', weight: 0, group: 'insights'},
        {id: 'duplicated-javascript-insight', weight: 0, group: 'insights'},
        {id: 'font-display-insight', weight: 0, group: 'insights'},
        {id: 'forced-reflow-insight', weight: 0, group: 'insights'},
        {id: 'image-delivery-insight', weight: 0, group: 'insights'},
        {id: 'interaction-to-next-paint-insight', weight: 0, group: 'insights'},
        {id: 'lcp-discovery-insight', weight: 0, group: 'insights'},
        {id: 'lcp-phases-insight', weight: 0, group: 'insights'},
        {id: 'legacy-javascript-insight', weight: 0, group: 'insights'},
        {id: 'modern-http-insight', weight: 0, group: 'insights'},
        {id: 'network-dependency-tree-insight', weight: 0, group: 'insights'},
        {id: 'render-blocking-insight', weight: 0, group: 'insights'},
        {id: 'third-parties-insight', weight: 0, group: 'insights'},
        {id: 'viewport-insight', weight: 0, group: 'insights'},
      ],
    },
    // @ts-ignore: `title` is required in CategoryJson. setting to the same value as the default
    // config is awkward - easier to omit the property here. Will defer to default config.
    'best-practices': {
      auditRefs: [
        {id: 'autocomplete', weight: 0, group: 'best-practices-ux'},
        {id: 'preload-fonts', weight: 0, group: 'best-practices-ux'},
      ],
    },
  },
};

export default config;
