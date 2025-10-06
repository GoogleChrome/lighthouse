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
  ],
  categories: {
    // @ts-ignore: `title` is required in CategoryJson. setting to the same value as the default
    // config is awkward - easier to omit the property here. Will defer to default config.
    'performance': {
      auditRefs: [
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
        {id: 'inp-breakdown-insight', weight: 0, group: 'insights'},
        {id: 'lcp-breakdown-insight', weight: 0, group: 'insights'},
        {id: 'lcp-discovery-insight', weight: 0, group: 'insights'},
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
      ],
    },
  },
};

export default config;
