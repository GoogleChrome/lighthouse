/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/** @type {LH.Config.Plugin} */
const pluginSimple = {
  groups: {
    'new-group': {
      title: 'New Group',
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
};

export default pluginSimple;
