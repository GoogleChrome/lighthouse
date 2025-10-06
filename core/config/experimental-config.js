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
    // @ts-expect-error: `title` is required in CategoryJson. setting to the same value as the default
    // config is awkward - easier to omit the property here. Will defer to default config.
    'best-practices': {
      auditRefs: [
        {id: 'autocomplete', weight: 0, group: 'best-practices-ux'},
      ],
    },
  },
};

export default config;
