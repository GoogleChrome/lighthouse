import path from 'node:path';
import {fileURLToPath} from 'node:url';

import localRules from 'eslint-plugin-local-rules';
import _import from 'eslint-plugin-import';
import {fixupPluginRules} from '@eslint/compat';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import js from '@eslint/js';
import {FlatCompat} from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

// See https://eslint.org/docs/latest/use/configure/configuration-files
export default [{
  files: [
    '**/*.cjs',
    '**/*.js',
    '**/*.mjs',
    '**/*.ts',
    '**/*.tsx',
  ],
}, {
  // Global ignores.
  ignores: [
    '.cz-config.js',
    '**/.tmp',
    '**/*.d.cts', // ignore d.ts files until we can properly lint them
    '**/*.d.ts',
    '**/dist',
    '**/fixtures/**',
    '**/node_modules/**',
    '**/source-maps/**',
    '**/third_party/**',
    '**/third-party/**',
    'build/test/page-functions-test-case*out*.js',
    'core/scripts/legacy-javascript/variants/**',
    'coverage/**',
  ],
}, ...compat.extends('eslint:recommended', 'google'), {
  plugins: {
    'local-rules': localRules,
    'import': fixupPluginRules(_import),
  },

  languageOptions: {
    globals: {
      ...globals.node,
    },

    parser: tsParser,
    ecmaVersion: 2020,
    sourceType: 'module',

    parserOptions: {
      ecmaFeatures: {
        globalReturn: true,
        jsx: false,
      },
    },
  },

  rules: {
    'import/order': [2, {
      'groups': ['builtin', 'external', ['sibling', 'parent'], 'index', 'object', 'type'],
      'newlines-between': 'always',
    }],

    'import/group-exports': 2,
    'import/exports-last': 2,
    'eqeqeq': 2,
    'no-console': 2,

    'indent': [2, 2, {
      SwitchCase: 1,
      VariableDeclarator: 2,

      CallExpression: {
        arguments: 'off',
      },

      MemberExpression: 'off',

      FunctionExpression: {
        body: 1,
        parameters: 2,
      },

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
      caughtErrors: 'none', // TODO: remove for new "all" default.
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

    'operator-linebreak': ['error', 'after', {
      overrides: {
        '?': 'ignore',
        ':': 'ignore',
      },
    }],

    'local-rules/require-file-extension': 2,
    'require-jsdoc': 0,
    'valid-jsdoc': 0,
    'arrow-parens': 0,
  },
}, {
  files: ['cli/test/smokehouse/test-definitions/**'],

  rules: {
    'max-len': 0,
  },
}, {
  files: [
    '**/build/**',
    '**/scripts/**',
    '**/test/**',
  ],

  rules: {
    'no-console': 0,
  },
}, {
  files: [
    'docs/recipes/auth/**',
  ],

  rules: {
    'new-cap': 0,
    'no-console': 0,
    'no-unused-vars': 0,
  },
}, {
  files: [
    '**/test/**',
    'docs/recipes/**',
  ],

  languageOptions: {
    globals: {
      ...globals.jest,
      ...globals.mocha,
    },
  },
}, {
  files: [
    'clients/**',
    'core/gather/gatherers/**',
    'docs/recipes/auth/**',
    'flow-report/**',
    'report/**',
    'treemap/**',
    'viewer/**',
  ],
  ignores: [
    'report/generator/**',
    'report/test/generator/**',
  ],

  languageOptions: {
    globals: {
      ...globals.browser,
    },
  },
}, {
  files: [
    'clients/**',
  ],

  languageOptions: {
    globals: {
      chrome: true,
      __lighthouse: true,
    },
  },
}, {
  files: ['flow-report/**'],

  languageOptions: {
    globals: {
      ...globals.browser,
      ...globals.node,
    },
  },

  rules: {
    'no-undef': 'off',
  },
}];
