/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
'use strict';

/**
 * eslint does not support ESM rc files, so this must be a .cjs file.
 * @see https://eslint.org/docs/user-guide/configuring/configuration-files#configuration-file-formats
 * @see https://github.com/eslint/eslint/issues/13481
 */

module.exports = {
  env: {
    browser: false,
  },
  parserOptions: {
    sourceType: 'script',
  },
};
