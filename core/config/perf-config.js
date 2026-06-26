/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as LH from '../../types/lh.js';

/** @type {LH.Config} */
const perfConfig = {
  extends: 'lighthouse:default',
  settings: {
    throttlingMethod: 'devtools',
    onlyCategories: ['performance'],
  },
};

export default perfConfig;
