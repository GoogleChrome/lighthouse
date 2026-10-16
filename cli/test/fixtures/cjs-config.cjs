/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/** @type {import('../../../types/lh.js').Config} */
module.exports = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: [
      'accessibility',
    ],
  },
};
