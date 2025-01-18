/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';
import fs from 'fs';
import path from 'path';

import * as acorn from 'acorn';
import MagicString from 'magic-string';
import resolve from 'resolve';
import * as terser from 'terser';

import {LH_ROOT} from '../../shared/root.js';

// ESTree provides much better types for AST nodes. See https://github.com/acornjs/acorn/issues/946
/** @typedef {import('estree').Node} Node */
/** @typedef {import('estree').SimpleCallExpression} SimpleCallExpression */

/** @typedef {{text: string, location: {file: string, line: number, column: number}}} Warning */

/** An error associated with a particular AST node. */
class AstError extends Error {
  /** @param {string} message @param {Node} node */
  constructor(message, node) {
    super(message);
    this.node = node;
  }
}

/**
 * Inlines the values of selected `fs` methods if their targets can be
 * statically determined. Currently `readFileSync` and `readdirSync` are
 * supported.
 * Returns `null` as code if no changes were made.
 * @param {string} code
 * @param {string} filepath
 * @return {Promise<{code: string|null, warnings: Array<Warning>}>}
 */
async function inlineFs(code, filepath) {
  // Approach:
  // - scan `code` for fs methods
  // - parse only the expression at each found index
  // - statically evaluate arguments to fs method, collapsing to single string
  // - execute fs method with computed argument
  // - replace original expression with result of fs call
  // - if an expression cannot be parsed or statically evaluated, warn and skip
  // - if no expressions found or all are skipped, return null

  const fsSearch = /fs\.(?:readFileSync|readdirSync)\(/g;
  const foundIndices = [...code.matchAll(fsSearch)].map(e => e.index);

  // Return null for not-applicable files with as little work as possible.
  if (foundIndices.length === 0) return {code: null, warnings: []};

  const output = new MagicString(code);
  let madeChange = false;
  /** @type {Array<Warning>} */
  const warnings = [];

  // Can iterate forwards in string because MagicString always uses original indices.
  for (const foundIndex of foundIndices) {
    if (foundIndex === undefined) continue; // https://github.com/microsoft/TypeScript/issues/36788

    let parsed;
    try {
      parsed = parseExpressionAt(code, foundIndex, {ecmaVersion: 'latest'});
    } catch (err) {
      // `err.loc` added by acorn.
      warnings.push(createWarning(err, filepath, err.loc));
      continue;
    }

    // If root of expression isn't the fs call, descend down chained methods on
    // the result (e.g. `fs.readdirSync().map(...)`) until reaching the fs call.
    for (;;) {
      assertEqualString(parsed.type, 'CallExpression');
      assertEqualString(parsed.callee.type, 'MemberExpression');
      if (parsed.callee.object.type === 'Identifier' && parsed.callee.object.name === 'fs') {
        break;
      }
      parsed = parsed.callee.object;
    }

    // We've regexed for an fs method, so the property better be an identifier.
    assertEqualString(parsed.callee.property.type, 'Identifier');

    let content;
    try {
      if (parsed.callee.property.name === 'readFileSync') {
        content = await getReadFileReplacement(parsed, filepath);
      } else if (parsed.callee.property.name === 'readdirSync') {
        content = await getReaddirReplacement(parsed, filepath);
      } else {
        throw new AstError(`unexpected fs call 'fs.${parsed.callee.property.name}'`,
            parsed.callee.property);
      }
    } catch (err) {
      // Consider missing files to be a fatal error.
      if (err.code === 'ENOENT') {
        throw err;
      }

      // Use the specific node with the error if available; fallback to fs.method location.
      const offsets = getNodeOffsets(err.node || parsed);
      const location = acorn.getLineInfo(code, offsets.start);

      warnings.push(createWarning(err, filepath, location));
      continue;
    }

    const offsets = getNodeOffsets(parsed);
    // TODO(bckenny): use options to customize `storeName` for source maps.
    output.overwrite(offsets.start, offsets.end, content);
    madeChange = true;
  }

  // Be explicit if no change has been made.
  const outputCode = madeChange ? output.toString() : null;

  return {
    code: outputCode,
    warnings,
  };
}

/**
 * A version of acorn's parseExpressionAt that stops at commas, allowing parsing
 * non-sequence expressions (like inside arrays).
 * @param {string} input
 * @param {number} offset
 * @param {import('acorn').Options} options
 * @return {Node}
 */
function parseExpressionAt(input, offset, options) {
  const parser = new acorn.Parser(options, input, offset);
  parser.nextToken();
  // @ts-expect-error - Not part of the current acorn types.
  return parser.parseMaybeAssign();
}

/**
 * Uses assert.strictEqual, but does not widen the type to generic `string`,
 * preserving string literals (if applicable).
 * @template {string} T
 * @param {string} actual
 * @param {T} expected
 * @param {string=} errorMessage
 * @return {asserts actual is T}
 */
function assertEqualString(actual, expected, errorMessage) {
  assert.equal(actual, expected, errorMessage);
}

/**
 * Convenience method to get the `start` and `end` offsets for `node` provided
 * by acorn on top of ESTree types (keeping the type errors encapsulated).
 * @param {Node} node
 * @return {{start: number, end: number}}
 */
function getNodeOffsets(node) {
  // @ts-expect-error - see https://github.com/acornjs/acorn/issues/946
  return node;
}

/**
 * @param {Error} error
 * @param {string} filepath
 * @param {{line: number, column: number}} location
 * @return {Warning}
 */
function createWarning(error, filepath, location) {
  return {
    text: error.message,
    location: {
      file: filepath,
      line: location.line,
      column: location.column,
    },
  };
}

/**
 * Attempts to statically determine the target of a `fs.readFileSync()` call and
 * returns the already-quoted contents of the file to be loaded.
 * If it's a JS file, it's minified before inlining.
 * @param {SimpleCallExpression} node ESTree node for `fs.readFileSync` call.
 * @param {string} filepath The path of the file containing this node.
 * @return {Promise<string>}
 */
async function getReadFileReplacement(node, filepath) {
  assertEqualString(node.callee.type, 'MemberExpression');
  assertEqualString(node.callee.property.type, 'Identifier');
  assert.equal(node.callee.property.name, 'readFileSync');

  assert.equal(node.arguments.length, 2, 'fs.readFileSync() must have two arguments');
  const constructedPath = collapseToStringLiteral(node.arguments[0], filepath);
  if (!isUtf8Options(node.arguments[1])) {
    throw new AstError('only utf8 readFileSync is supported', node.arguments[1]);
  }

  let readContent = await fs.promises.readFile(constructedPath, 'utf8');

  // Minify inlined javascript.
  if (constructedPath.endsWith('.js')) {
    const result = await terser.minify({[constructedPath]: readContent}, {ecma: 2019});
    if (result.code) {
      readContent = result.code;
    }
  }

  // Escape quotes, new lines, etc so inlined string doesn't break host file.
  return JSON.stringify(readContent);
}

/**
 * Attempts to statically determine the target of a `fs.readdirSync()` call and
 * returns a JSON.stringified array with the contents of the target directory.
 * @param {SimpleCallExpression} node ESTree node for `fs.readdirSync` call.
 * @param {string} filepath The path of the file containing this node.
 * @return {Promise<string>}
 */
async function getReaddirReplacement(node, filepath) {
  assertEqualString(node.callee.type, 'MemberExpression');
  assertEqualString(node.callee.property.type, 'Identifier');
  assert.equal(node.callee.property.name, 'readdirSync');

  // If there's no second argument, fs.readdirSync defaults to 'utf8'.
  if (node.arguments.length === 2) {
    if (!isUtf8Options(node.arguments[1])) {
      throw new AstError('only utf8 readdirSync is supported', node.arguments[1]);
    }
  }

  const constructedPath = collapseToStringLiteral(node.arguments[0], filepath);

  try {
    const contents = await fs.promises.readdir(constructedPath, 'utf8');
    return JSON.stringify(contents);
  } catch (err) {
    throw new Error(`could not inline fs.readdirSync contents: ${err.message}`);
  }
}

/**
 * Returns whether the options object/string specifies the allowed utf8/utf-8
 * encoding.
 * @param {Node} node ESTree node.
 * @return {boolean}
 */
function isUtf8Options(node) {
  // Node allows 'utf-8' as an alias for 'utf8'.
  if (node.type === 'Literal') {
    return node.value === 'utf8' || node.value === 'utf-8';
  } else if (node.type === 'ObjectExpression') {
    // Matches type `{encoding: 'utf8'|'utf-8'}`.
    return node.properties.some(prop => {
      return prop.type === 'Property' &&
          prop.key.type === 'Identifier' && prop.key.name === 'encoding' &&
          prop.value.type === 'Literal' &&
          (prop.value.value === 'utf8' || prop.value.value === 'utf-8');
    });
  }
  return false;
}

/**
 * Recursively walk tree at `node`, collapsing nodes using supported transforms until
 * only a single string literal remains (or an error is thrown for unsupported nodes).
 * @param {Node} node ESTree node.
 * @param {string} filepath The path of the file containing this node.
 * @return {string}
 */
function collapseToStringLiteral(node, filepath) {
  switch (node.type) {
    case 'Literal': {
      // If your literal wasn't a string, sorry, you're getting a string.
      return String(node.value);
    }

    case 'Identifier': {
      if (node.name === '__dirname' || node.name === 'moduleDir') {
        return path.dirname(filepath);
      } else if (node.name === '__filename') {
        return filepath;
      } else if (node.name === 'LH_ROOT') {
        // Note: hardcoded for LH. Could be be set via inline-fs options instead.
        return LH_ROOT;
      }
      throw new AstError(`unsupported identifier '${node.name}'`, node);
    }

    case 'CallExpression': {
      return evaluateCallExpression(node, filepath);
    }

    case 'BinaryExpression': {
      if (node.operator !== '+') throw new AstError('only string `+` operators supported', node);
      const left = collapseToStringLiteral(node.left, filepath);
      const right = collapseToStringLiteral(node.right, filepath);
      return left + right;
    }

    case 'TemplateLiteral': {
      assert.equal(node.expressions.length + 1, node.quasis.length);
      // Parts alternate between quasis and expressions, starting and ending with a quasi.
      const parts = [];
      for (let i = 0; i < node.expressions.length; i++) {
        parts.push(collapseToStringLiteral(node.quasis[i], filepath));
        parts.push(collapseToStringLiteral(node.expressions[i], filepath));
      }
      parts.push(collapseToStringLiteral(node.quasis[node.quasis.length - 1], filepath));
      return parts.join('');
    }

    case 'TemplateElement': {
      // Keep tsc happy: AST generation should have already errored if invalid escape sequence in template literal.
      if (typeof node.value.cooked !== 'string') {
        throw new AstError('template string syntax error', node);
      }
      return node.value.cooked;
    }
  }

  throw new AstError(`unsupported node: ${node.type}`, node);
}

/**
 * Evaluate supported function calls and return the string result. Limited to
 * `require.resolve` and a subset of `path` methods.
 * @param {SimpleCallExpression} node ESTree CallExpression node.
 * @param {string} filepath The path of the file containing this node.
 * @return {string}
 */
function evaluateCallExpression(node, filepath) {
  // eslint-disable-next-line max-len
  const unsupportedMsg = 'only `require.resolve()` and `path` methods are supported as arguments to `fs` function calls';

  if (node.callee.type !== 'MemberExpression') throw new AstError(unsupportedMsg, node);
  if (node.callee.object.type !== 'Identifier') throw new AstError(unsupportedMsg, node);
  if (node.callee.property.type !== 'Identifier') throw new AstError(unsupportedMsg, node);

  if (node.callee.object.name === 'require') {
    if (node.callee.property.name !== 'resolve') {
      throw new AstError(unsupportedMsg, node.callee.property);
    }
    if (node.arguments.length !== 1) {
      throw new AstError('only single-argument `require.resolve` is supported', node);
    }
    const argument = collapseToStringLiteral(node.arguments[0], filepath);
    return resolve.sync(argument, {basedir: path.dirname(filepath)});
  }

  if (node.callee.object.name !== 'path') throw new AstError(unsupportedMsg, node);

  const methodName = node.callee.property.name;
  const args = node.arguments.map(arg => collapseToStringLiteral(arg, filepath));

  // Support path methods that take string argument(s) and return a string.
  const supportedPathMethods = [
    'resolve',
    'normalize',
    'join',
    'relative',
    'dirname',
    'basename',
    'extname',
  ];
  if (!supportedPathMethods.includes(methodName)) {
    throw new AstError(`'path.${methodName}' is not supported with 'fs' function calls`, node);
  }
  // @ts-expect-error: `methodName` established as existing on `path`.
  return path[methodName](...args);
}

export {
  inlineFs,
};
