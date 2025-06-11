/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import globals from 'globals';

export default [{
  languageOptions: {
    globals: {
      ...globals.jest,
      ...globals.mocha,
    }
  },
}];
