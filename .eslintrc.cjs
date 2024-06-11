/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
'use strict';

/**
 * eslint does not support ESM rc files, so this must be a .cjs file.
 * @see https://eslint.org/docs/user-guide/configuring/configuration-files#configuration-file-formats
 * @see https://github.com/eslint/eslint/issues/13481
 */

module.exports = {
  // All subdirectory eslintrcs extend from this one.
  root: true,
  // start with google standard style
  //     https://github.com/google/eslint-config-google/blob/master/index.js
  extends: ['eslint:recommended', 'google'],
  plugins: [
    'eslint-plugin-local-rules',
    'eslint-plugin-import',
  ],
  env: {
    node: true,
    es6: true,
  },
  rules: {
    // 2 == error, 1 == warning, 0 == off
    'import/order': [2, {
      'groups': [
        'builtin',
        'external',
        ['sibling', 'parent'],
        'index',
        'object',
        'type',
      ],
      'newlines-between': 'always',
    }],
    'import/group-exports': 2,
    'import/exports-last': 2,
    'eqeqeq': 2,
    'indent': [2, 2, {
      SwitchCase: 1,
      VariableDeclarator: 2,
      CallExpression: {arguments: 'off'},
      MemberExpression: 'off',
      FunctionExpression: {body: 1, parameters: 2},
      ignoredNodes: [
        'ConditionalExpression > :matches(.consequent, .alternate)',
        'VariableDeclarator > ArrowFunctionExpression > :expression.body',
        'CallExpression > ArrowFunctionExpression > :expression.body',
      ],
    }],
    'no-floating-decimal': 2,
    'max-len': [2, 100, {
      ignorePattern: 'readJson\\(|^import ',
      ignoreComments: true,
      ignoreUrls: true,
      tabWidth: 2,
    }],
    'no-empty': [2, {
      allowEmptyCatch: true,
    }],
    'no-implicit-coercion': [2, {
      boolean: false,
      number: true,
      string: true,
    }],
    'no-unused-expressions': [2, {
      allowShortCircuit: true,
      allowTernary: false,
    }],
    'no-unused-vars': [2, {
      vars: 'all',
      args: 'after-used',
      argsIgnorePattern: '(^reject$|^_+$)',
      varsIgnorePattern: '(^_$|^LH$|^Lantern$|^TraceEngine$|^Protocol$)',
    }],
    'no-cond-assign': 2,
    'space-infix-ops': 2,
    'strict': [2, 'global'],
    'prefer-const': 2,
    'curly': [2, 'multi-line'],
    'comma-dangle': [2, {
      arrays: 'always-multiline',
      objects: 'always-multiline',
      imports: 'always-multiline',
      exports: 'always-multiline',
      functions: 'never',
    }],
    'operator-linebreak': ['error', 'after', {'overrides': {'?': 'ignore', ':': 'ignore'}}],

    // Custom lighthouse rules
    'local-rules/require-file-extension': 2,

    // Disabled rules
    'require-jsdoc': 0,
    'valid-jsdoc': 0,
    'arrow-parens': 0,
  },
  overrides: [
    {
      files: ['cli/test/smokehouse/test-definitions/*.js'],
      rules: {
        'max-len': 0,
      },
    },
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    ecmaFeatures: {
      globalReturn: true,
      jsx: false,
    },
    sourceType: 'module',
  },
};
