/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

module.exports = {
  // start with google standard style
  //     https://github.com/google/eslint-config-google/blob/master/index.js
  extends: ['eslint:recommended', 'google'],
  plugins: ['eslint-plugin-local-rules'], // include custom rules
  env: {
    node: true,
    es6: true,
  },
  rules: {
    // 2 == error, 1 == warning, 0 == off
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
      varsIgnorePattern: '(^_$)',
    }],
    'space-infix-ops': 2,
    'strict': [2, 'global'],
    'prefer-const': 2,
    'curly': [2, 'multi-line'],
    'comma-dangle': [2, {
      arrays: 'always-multiline',
      objects: 'always-multiline',
      imports: 'never',
      exports: 'never',
      functions: 'never',
    }],

    // Custom lighthouse rules
    'local-rules/require-file-extension': 2,

    // Disabled rules
    'require-jsdoc': 0,
    'valid-jsdoc': 0,
    'arrow-parens': 0,
  },
  overrides: [
    {
      files: ['lighthouse-cli/test/smokehouse/**/*expectations.js'],
      rules: {
        'max-len': 0,
      },
    },
  ],
  parserOptions: {
    ecmaVersion: 2018,
    ecmaFeatures: {
      globalReturn: true,
      jsx: false,
    },
    sourceType: 'script',
  },
};
