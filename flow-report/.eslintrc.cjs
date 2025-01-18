/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

module.exports = {
  extends: '../.eslintrc.cjs',
  env: {
    node: true,
    browser: true,
  },
  plugins: [
    '@typescript-eslint',
  ],
  overrides: [
    // TS already handles this issue.
    // https://github.com/typescript-eslint/typescript-eslint/blob/main/docs/linting/TROUBLESHOOTING.md#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
    {
      files: ['**/*.ts', '**/*.tsx', '**/*.js'],
      rules: {
        'no-undef': 'off',
      },
    },
  ],
  parserOptions: {
    ecmaVersion: 2019,
    ecmaFeatures: {
      jsx: true,
    },
    sourceType: 'module',
  },
};
