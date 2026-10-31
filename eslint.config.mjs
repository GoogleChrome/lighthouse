import _import from 'eslint-plugin-import';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import js from '@eslint/js';

/**
 * Rules inlined from `eslint-config-google` v0.14.0 (excluding `valid-jsdoc`
 * and `require-jsdoc`, which were removed in ESLint v9).
 * @type {import('eslint').Linter.RulesRecord}
 */
const googleRules = {
  // Possible Errors
  'no-cond-assign': 0,
  'no-irregular-whitespace': 2,
  'no-unexpected-multiline': 2,

  // Best Practices
  'curly': [2, 'multi-line'],
  'guard-for-in': 2,
  'no-caller': 2,
  'no-extend-native': 2,
  'no-extra-bind': 2,
  'no-invalid-this': 2,
  'no-multi-spaces': 2,
  'no-multi-str': 2,
  'no-new-wrappers': 2,
  'no-throw-literal': 2,
  'no-with': 2,
  'prefer-promise-reject-errors': 2,

  // Variables
  'no-unused-vars': [2, {args: 'none'}],

  // Stylistic Issues
  'array-bracket-newline': 0,
  'array-bracket-spacing': [2, 'never'],
  'array-element-newline': 0,
  'block-spacing': [2, 'never'],
  'brace-style': 2,
  'camelcase': [2, {properties: 'never'}],
  'comma-dangle': [2, 'always-multiline'],
  'comma-spacing': 2,
  'comma-style': 2,
  'computed-property-spacing': 2,
  'eol-last': 2,
  'func-call-spacing': 2,
  'indent': [
    2, 2, {
      CallExpression: {arguments: 2},
      FunctionDeclaration: {body: 1, parameters: 2},
      FunctionExpression: {body: 1, parameters: 2},
      MemberExpression: 2,
      ObjectExpression: 1,
      SwitchCase: 1,
      ignoredNodes: ['ConditionalExpression'],
    },
  ],
  'key-spacing': 2,
  'keyword-spacing': 2,
  'linebreak-style': 2,
  'max-len': [2, {
    code: 80,
    tabWidth: 2,
    ignoreUrls: true,
    ignorePattern: 'goog\\.(module|require)',
  }],
  'new-cap': 2,
  'no-array-constructor': 2,
  'no-mixed-spaces-and-tabs': 2,
  'no-multiple-empty-lines': [2, {max: 2}],
  'no-new-object': 2,
  'no-tabs': 2,
  'no-trailing-spaces': 2,
  'object-curly-spacing': 2,
  'one-var': [2, {
    var: 'never',
    let: 'never',
    const: 'never',
  }],
  'operator-linebreak': [2, 'after'],
  'padded-blocks': [2, 'never'],
  'quote-props': [2, 'consistent'],
  'quotes': [2, 'single', {allowTemplateLiterals: true}],
  'semi': 2,
  'semi-spacing': 2,
  'space-before-blocks': 2,
  'space-before-function-paren': [2, {
    asyncArrow: 'always',
    anonymous: 'never',
    named: 'never',
  }],
  'spaced-comment': [2, 'always'],
  'switch-colon-spacing': 2,

  // ECMAScript 6
  'arrow-parens': [2, 'always'],
  'constructor-super': 2,
  'generator-star-spacing': [2, 'after'],
  'no-new-symbol': 2,
  'no-this-before-super': 2,
  'no-var': 2,
  'prefer-const': [2, {destructuring: 'all'}],
  'prefer-rest-params': 2,
  'prefer-spread': 2,
  'rest-spread-spacing': 2,
  'yield-star-spacing': [2, 'after'],
};

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
}, js.configs.recommended, {
  rules: googleRules,
}, {
  plugins: {
    'import': _import,
  },

  languageOptions: {
    globals: {
      ...globals.node,
    },

    parser: tseslint.parser,
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
