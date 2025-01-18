/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable no-console */

import fs from 'fs';

import ts from 'typescript';

import {LH_ROOT} from '../shared/root.js';

/**
 * @typedef Modification
 * @property {string} input
 * @property {string} output
 * @property {string} template
 * @property {Record<string, string>} rawCodeToReplace Complicated expressions are hard detect with the TS lib, so instead use this to work with the raw code.
 * @property {string[]} classesToRemove
 * @property {string[]} methodsToRemove
 * @property {string[]} variablesToRemove
 */

const outDir = `${LH_ROOT}/core/lib/cdt/generated`;

/** @type {Modification[]} */
const modifications = [
  {
    input: 'node_modules/chrome-devtools-frontend/front_end/core/sdk/SourceMap.ts',
    output: `${outDir}/SourceMap.js`,
    template: [
      'const Common = require(\'../Common.js\');',
      'const Platform = require(\'../Platform.js\');',
      '%sourceFilePrinted%',
      'module.exports = SourceMap;',
      'SourceMap.parseSourceMap = parseSourceMap;',
    ].join('\n'),
    rawCodeToReplace: {
      // Use normal console.warn so we don't need to import CDT's logger.
      'Common.Console.Console.instance().warn': 'console.warn',
      // The entries in `.mappings` should not have their url property modified.
      // The sizing function uses `entry.sourceURL` to index the byte
      // counts, and is further used in the details to specify a file within a source map.
      'Common.ParsedURL.ParsedURL.completeURL(this.#baseURL, href)': `''`,
      // Add some types.
      // eslint-disable-next-line max-len
      'mappings(): SourceMapEntry[] {': '/** @return {Array<{lineNumber: number, columnNumber: number, sourceURL?: string, sourceLineNumber: number, sourceColumnNumber: number, name?: string, lastColumnNumber?: number}>} */\nmappings(): SourceMapEntry[] {',
    },
    classesToRemove: [],
    methodsToRemove: [
      // Not needed.
      'compatibleForURL',
      'load',
      'reverseMapTextRanges',
    ],
    variablesToRemove: [
      'Common',
      'Platform',
      'TextUtils',
    ],
  },
  {
    input: 'node_modules/chrome-devtools-frontend/front_end/core/common/ParsedURL.ts',
    output: `${outDir}/ParsedURL.js`,
    template: '%sourceFilePrinted%',
    rawCodeToReplace: {},
    classesToRemove: [],
    methodsToRemove: [
      // TODO: look into removing the `Common.ParsedURL.ParsedURL.completeURL` replacement above,
      // which will also mean including all/most of these methods.
      'completeURL',
      'dataURLDisplayName',
      'domain',
      'encodedFromParentPathAndName',
      'encodedPathToRawPathString',
      'extractExtension',
      'extractName',
      'extractOrigin',
      'extractPath',
      'fromString',
      'isAboutBlank',
      'isBlobURL',
      'isDataURL',
      'isHttpOrHttps',
      'isValidUrlString',
      'join',
      'lastPathComponentWithFragment',
      'preEncodeSpecialCharactersInPath',
      'prepend',
      'rawPathToEncodedPathString',
      'rawPathToUrlString',
      'relativePathToUrlString',
      'removeWasmFunctionInfoFromURL',
      'securityOrigin',
      'slice',
      'sliceUrlToEncodedPathString',
      'split',
      'splitLineAndColumn',
      'substr',
      'substring',
      'toLowerCase',
      'trim',
      'urlFromParentUrlAndName',
      'urlRegex',
      'urlRegexInstance',
      'urlToRawPathString',
      'urlWithoutHash',
      'urlWithoutScheme',
    ],
    variablesToRemove: [
      'Platform',
    ],
  },
];

/**
 * @param {string} code
 * @param {string[]} codeFragments
 */
function assertPresence(code, codeFragments) {
  for (const codeFragment of codeFragments) {
    if (!code.includes(codeFragment)) {
      throw new Error(`did not find expected code fragment: ${codeFragment}`);
    }
  }
}

/**
 * @param {Modification} modification
 */
function doModification(modification) {
  const {rawCodeToReplace, classesToRemove, methodsToRemove, variablesToRemove} = modification;

  const code = fs.readFileSync(modification.input, 'utf-8');
  assertPresence(code, Object.keys(rawCodeToReplace));

  // First pass - do raw string replacements.
  let modifiedCode = code;
  for (const [code, replacement] of Object.entries(rawCodeToReplace)) {
    modifiedCode = modifiedCode.replace(code, replacement);
  }

  const codeTranspiledToCommonJS = ts.transpileModule(modifiedCode, {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
  }).outputText.replace(`"use strict";`, '');

  const sourceFile = ts.createSourceFile('', codeTranspiledToCommonJS,
    ts.ScriptTarget.ES2022, true, ts.ScriptKind.JS);
  const simplePrinter = ts.createPrinter({newLine: ts.NewLineKind.LineFeed});

  // Second pass - use tsc to remove all references to certain variables.
  assertPresence(codeTranspiledToCommonJS, [
    ...classesToRemove,
    ...methodsToRemove,
    ...variablesToRemove,
  ]);

  const printer = ts.createPrinter({newLine: ts.NewLineKind.LineFeed}, {
    substituteNode(hint, node) {
      let removeNode = false;

      if (ts.isMethodDeclaration(node) &&
          // Make typescript happy.
          !ts.isComputedPropertyName(node.name) &&
          methodsToRemove.includes(node.name.text)) {
        removeNode = true;
      }

      if (ts.isClassDeclaration(node) && node.name && classesToRemove.includes(node.name.text)) {
        removeNode = true;
      }

      if (ts.isExpressionStatement(node)) {
        const asString = simplePrinter.printNode(ts.EmitHint.Unspecified, node, sourceFile);
        if (classesToRemove.some(className => asString.includes(className))) {
          removeNode = true;
        }
      }

      if (ts.isVariableDeclarationList(node) && node.declarations.length === 1) {
        // @ts-expect-error: is read-only, but whatever.
        node.declarations =
          node.declarations.filter(d => !variablesToRemove.includes(d.name.getText()));
        if (node.declarations.length === 0) removeNode = true;
      }

      if (removeNode) {
        return ts.factory.createNotEmittedStatement(node);
      }

      return node;
    },
  });

  let sourceFilePrinted = '';
  sourceFile.forEachChild(node => {
    sourceFilePrinted += printer.printNode(ts.EmitHint.Unspecified, node, sourceFile) + '\n';
  });

  const content = modification.template.replace('%sourceFilePrinted%', () => sourceFilePrinted);
  writeGeneratedFile(modification.output, content);
}

/**
 * @param {string} outputPath
 * @param {string} contents
 */
function writeGeneratedFile(outputPath, contents) {
  const modifiedFile = [
    '// @ts-nocheck\n',
    '// generated by yarn build-cdt-lib\n',
    '/* eslint-disable */\n',
    '"use strict";\n',
    contents,
  ].join('');

  fs.writeFileSync(outputPath, modifiedFile);
}

modifications.forEach(doModification);
