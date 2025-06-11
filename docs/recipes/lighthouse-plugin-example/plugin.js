/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/** @type {LH.Config.Plugin} */
export default {
  // Additional audit to run on information Lighthouse gathered.
  audits: [{
    path: 'lighthouse-plugin-example/audits/preload-as.js',
  }],

  // A new category in the report for the new audit's output.
  category: {
    title: 'My Plugin Category',
    description: 'Results for our new plugin category.',
    auditRefs: [
      {id: 'preload-as', weight: 1},
      {id: 'meta-description', weight: 1}, // Can also reference default Lighthouse audits.
    ],
  },
};
