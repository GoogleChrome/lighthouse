/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/** @type {LH.Config.Plugin} */
module.exports = {
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
    title: 'Config',
    auditRefs: [
      {id: 'redirects', weight: 1, group: 'new-group'},
    ],
  },
};

throw new Error('This file is never actually used. If that changes, just delete this line.');
