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
