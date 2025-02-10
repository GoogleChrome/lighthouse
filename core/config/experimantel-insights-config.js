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
  categories: {
    // @ts-ignore: `title` is required in CategoryJson. setting to the same value as the default
    // config is awkward - easier to omit the property here. Will defer to default config.
    'performance': {
      auditRefs: [
        {id: 'cls-culprits-insight', weight: 0, group: 'insights'},
        {id: 'document-latency-insight', weight: 0, group: 'insights'},
        {id: 'dom-size-insight', weight: 0, group: 'insights'},
        {id: 'font-display-insight', weight: 0, group: 'insights'},
        {id: 'forced-reflow-insight', weight: 0, group: 'insights'},
        {id: 'image-delivery-insight', weight: 0, group: 'insights'},
        {id: 'interaction-to-next-paint-insight', weight: 0, group: 'insights'},
        {id: 'lcp-discovery-insight', weight: 0, group: 'insights'},
        {id: 'lcp-phases-insight', weight: 0, group: 'insights'},
        {id: 'long-critical-network-tree-insight', weight: 0, group: 'insights'},
        {id: 'render-blocking-insight', weight: 0, group: 'insights'},
        {id: 'slow-css-selector-insight', weight: 0, group: 'insights'},
        {id: 'third-parties-insight', weight: 0, group: 'insights'},
        {id: 'viewport-insight', weight: 0, group: 'insights'},
      ],
    },
  },
};

export default config;
