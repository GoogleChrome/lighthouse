/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview A collection of eslint rules written specifically for
 * Lighthouse. These are included by the eslint-plugin-local-rules plugin.
 */

const path = require('path');

/** @typedef {import('eslint').Rule.RuleModule} RuleModule */

/**
 * Use `require.resolve()` to resolve the location of `path` from a location of
 * `baseDir` and return it. Returns null if unable to resolve a path.
 * @param {string} path
 * @param {string} baseDir
 * @return {string|null}
 */
function requireResolveOrNull(path, baseDir) {
  try {
    return require.resolve(path, {
      paths: [baseDir],
    });
  } catch (err) {
    return null;
  }
}

/**
 * An eslint rule ensuring that any require() of a local path (aka not a core
 * module or a module dependency) includes a file extension (.js' or '.json').
 * @type {RuleModule}
 */
const requireFileExtension = {
  meta: {
    docs: {
      description: 'disallow require() without a file extension',
      category: 'Best Practices',
      recommended: false,
    },
    schema: [],
    fixable: 'code',
  },

  create(context) {
    return {
      CallExpression(node) {
        // Only look at instances of `require(moduleName: string)`.
        if (node.type !== 'CallExpression') return;
        if (node.callee.type !== 'Identifier' || node.callee.name !== 'require') return;
        if (!node.arguments.length) return;
        const arg0 = node.arguments[0];
        if (arg0.type !== 'Literal' || typeof arg0.value !== 'string') return;

        const requiredPath = arg0.value;

        // If it's not a local file, we don't care.
        if (!requiredPath.startsWith('.')) return;

        // Check that `requiredPath` is resolvable from the source file.
        const contextDirname = path.dirname(context.getFilename());
        const resolvedRequiredPath = requireResolveOrNull(requiredPath, contextDirname);
        if (!resolvedRequiredPath) {
          return context.report({
            node: node,
            message: `Cannot resolve module '${requiredPath}'.`,
          });
        }

        // If it has a file extension, it's good to go.
        if (requiredPath.endsWith('.js')) return;
        if (requiredPath.endsWith('.json')) return;

        context.report({
          node: node,
          message: 'Local require path must have a file extension.',
          fix(fixer) {
            // Find the correct file extension/filename ending of the requiredPath.
            let fixedPath = path.relative(contextDirname, resolvedRequiredPath);
            if (!fixedPath.startsWith('.')) fixedPath = `./${fixedPath}`;

            // Usually `fixedPath.startsWith(requiredPath)` and this will just add
            // a suffix to the existing path, but sometimes humans write confusing
            // paths, e.g. './lighthouse-core/lib/../lib/lh-error.js'. To cover both
            // cases, double check that the paths resolve to the same file.
            const resolvedFixedPath = requireResolveOrNull(fixedPath, contextDirname);

            // If somehow they don't point to the same file, don't try to fix.
            if (resolvedFixedPath !== resolvedRequiredPath) return null;

            return fixer.replaceText(arg0, `'${fixedPath}'`);
          },
        });
      },
    };
  },
};

module.exports = {
  'require-file-extension': requireFileExtension,
};
