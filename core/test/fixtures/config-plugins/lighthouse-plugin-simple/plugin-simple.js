/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as i18n from '../../../../lib/i18n/i18n.js';

const UIStrings = {
  /** Title of a test group. */
  groupTitle: 'New Group',
};
const str_ = i18n.createIcuMessageFn('lighthouse-plugin-simple/plugin-simple.js', UIStrings);

/** @type {LH.Config.Plugin} */
export default {
  groups: {
    'new-group': {
      title: str_(UIStrings.groupTitle),
    },
  },
  audits: [
    {path: 'redirects'},
    {path: 'user-timings'},
  ],
  category: {
    title: 'Simple',
    auditRefs: [
      {id: 'redirects', weight: 1, group: 'new-group'},
    ],
  },
  locales: {
    es: {
      'lighthouse-plugin-simple/plugin-simple.js | groupTitle': {
        message: 'Nuevo grupo',
      },
    },
  },
};
