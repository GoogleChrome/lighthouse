/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import {createRequire} from 'module';

import * as acorn from 'acorn';
import Ajv2020 from 'ajv/dist/2020.js';
import standaloneCode from 'ajv/dist/standalone/index.js';
import addFormats from 'ajv-formats';
import {fullFormats} from 'ajv-formats/dist/formats.js';

import {LH_ROOT} from '../shared/root.js';

const schemaPath = path.join(LH_ROOT, 'third-party/ard/spec/schemas/ard-entry.schema.json');
const outputPath = path.join(LH_ROOT, 'third-party/ard/schema-validator.js');

/**
 * The definitions validated by the upstream conformance test (`as_def(...)` in
 * `conformance/bin/conformance-test`). Each is exported as a named validator.
 */
const EXPORTED_DEFS = ['ArdManifest', 'ArdEntry'];

/**
 * The ajv-formats formats the schema is validated with. Their implementations are inlined into
 * the generated module so `ajv-formats` (and its `ajv` dependency) are not needed at runtime.
 * @type {Array<import('ajv-formats').FormatName>}
 */
const FORMATS = ['uri', 'date-time'];

const require = createRequire(import.meta.url);
const ajvFormatsDir = path.dirname(require.resolve('ajv-formats/package.json'));

/**
 * @param {acorn.Node} node
 * @param {Set<string>} names
 */
function collectIdentifiers(node, names) {
  if (node.type === 'Identifier') names.add(/** @type {acorn.Identifier} */ (node).name);
  for (const value of Object.values(node)) {
    const children = Array.isArray(value) ? value : [value];
    for (const child of children) {
      if (child && typeof child === 'object' && typeof child.type === 'string') {
        collectIdentifiers(child, names);
      }
    }
  }
}

/**
 * Extracts the source of the given `fullFormats` entries from ajv-formats' `dist/formats.js`,
 * along with every top-level declaration they (transitively) depend on, so the exact upstream
 * implementation is used. Returns an expression evaluating to an object with those formats.
 * @param {string[]} formatNames
 * @return {string}
 */
function buildInlinedFormats(formatNames) {
  const formatsPath = path.join(ajvFormatsDir, 'dist/formats.js');
  const src = fs.readFileSync(formatsPath, 'utf8');
  const program = acorn.parse(src, {ecmaVersion: 'latest', sourceType: 'script'});

  /** @type {Map<string, acorn.Node>} */
  const declarations = new Map();
  /** @type {acorn.ObjectExpression|undefined} */
  let fullFormatsNode;
  for (const statement of program.body) {
    if (statement.type === 'FunctionDeclaration' && statement.id) {
      declarations.set(statement.id.name, statement);
    } else if (statement.type === 'VariableDeclaration') {
      for (const declarator of statement.declarations) {
        if (declarator.id.type !== 'Identifier') continue;
        if (statement.declarations.length !== 1) {
          throw new Error(`Unexpected multi-variable declaration in ${formatsPath}`);
        }
        declarations.set(declarator.id.name, statement);
      }
    } else if (
      statement.type === 'ExpressionStatement' &&
      statement.expression.type === 'AssignmentExpression' &&
      statement.expression.left.type === 'MemberExpression' &&
      statement.expression.left.property.type === 'Identifier' &&
      statement.expression.left.property.name === 'fullFormats' &&
      statement.expression.right.type === 'ObjectExpression'
    ) {
      fullFormatsNode = statement.expression.right;
    }
  }
  if (!fullFormatsNode) throw new Error(`Could not find fullFormats in ${formatsPath}`);

  /** @type {Map<string, acorn.Node>} */
  const formatValues = new Map();
  for (const prop of fullFormatsNode.properties) {
    if (prop.type !== 'Property') continue;
    let key;
    if (prop.key.type === 'Identifier' && !prop.computed) key = prop.key.name;
    else if (prop.key.type === 'Literal') key = String(prop.key.value);
    if (key !== undefined) formatValues.set(key, prop.value);
  }

  /** @type {Set<string>} */
  const pending = new Set();
  const properties = formatNames.map(name => {
    const value = formatValues.get(name);
    if (!value) throw new Error(`ajv-formats fullFormats has no '${name}' format`);
    collectIdentifiers(value, pending);
    return `${JSON.stringify(name)}: ${src.slice(value.start, value.end)},`;
  });

  // Transitive closure over top-level declarations. Identifiers that aren't top-level
  // declarations (locals, globals, property names) are simply ignored.
  /** @type {Set<acorn.Node>} */
  const needed = new Set();
  for (const name of pending) {
    const declaration = declarations.get(name);
    if (!declaration || needed.has(declaration)) continue;
    needed.add(declaration);
    collectIdentifiers(declaration, pending);
  }

  const body = [...needed]
    .sort((a, b) => a.start - b.start)
    .map(node => src.slice(node.start, node.end))
    .concat(['return {', ...properties.map(p => `  ${p}`), '};'])
    .join('\n');
  // Copied verbatim (not re-indented) so the sanity check below can compare sources exactly.
  // Wrapped in an IIFE so the helpers can't collide with names in Ajv's generated code.
  const code = `(() => {\n${body}\n})()`;

  // Sanity check that the inlined code reproduces the ajv-formats implementations.
  const inlined = vm.runInNewContext(code);
  for (const name of formatNames) {
    /** @type {any} */
    const expected = fullFormats[/** @type {keyof typeof fullFormats} */ (name)];
    const actual = inlined[name];
    const describe = (/** @type {any} */ f) => typeof f === 'object' && !(f instanceof RegExp) ?
      {validate: String(f.validate), compare: String(f.compare)} :
      String(f);
    if (JSON.stringify(describe(actual)) !== JSON.stringify(describe(expected))) {
      throw new Error(`Inlined '${name}' format does not match ajv-formats`);
    }
  }

  return code;
}

/**
 * Format standalone code with proper 2-space indentation and formatted schema objects.
 * @param {string} src
 * @return {string}
 */
function formatCode(src) {
  // Format embedded JSON schemas into multi-line indented objects
  const code = src.replace(/const schema(\d+) = (\{.+?\});/g, (match, id, jsonStr) => {
    try {
      const obj = JSON.parse(jsonStr);
      return `const schema${id} = ${JSON.stringify(obj, null, 2)};`;
    } catch {
      return match;
    }
  });

  const lines = code.split('\n');
  let indent = 0;
  const out = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      out.push('');
      continue;
    }

    // Determine leading closing brackets on this line
    let leadingCloses = 0;
    for (const char of line) {
      if (char === '}' || char === ']' || char === ')') {
        leadingCloses++;
      } else if (char === ' ' || char === ';') {
        continue;
      } else {
        break;
      }
    }

    const lineIndent = Math.max(0, indent - leadingCloses);

    // Format keywords and spacing around braces
    const formattedLine = line
      .replace(/^if\(/, 'if (')
      .replace(/^for\(/, 'for (')
      .replace(/^while\(/, 'while (')
      .replace(/\)\{/g, ') {')
      .replace(/^else\{/, 'else {')
      .replace(/^}else/, '} else');

    out.push('  '.repeat(lineIndent) + formattedLine);

    // Calculate indent for subsequent lines
    const openCount = (line.match(/[{[(]/g) || []).length;
    const closeCount = (line.match(/[}\])]/g) || []).length;
    indent = Math.max(0, indent + openCount - closeCount);
  }

  return out.join('\n');
}

function build() {
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  if (!schema.$id) throw new Error(`Expected ${schemaPath} to declare an $id`);

  const ajv = new Ajv2020({
    allErrors: true,
    allowUnionTypes: true,
    // The upstream schema is authoritative and uses `required` in `allOf`/`oneOf` branches
    // without restating `type: object`, which is valid but trips Ajv's strictTypes warning.
    strictTypes: false,
    code: {
      source: true,
      esm: true,
      lines: true,
    },
  });
  addFormats(ajv, FORMATS);
  ajv.addSchema(schema);

  /** @type {Record<string, string>} */
  const refs = {};
  for (const def of EXPORTED_DEFS) {
    const ref = `${schema.$id}#/$defs/${def}`;
    if (!ajv.getSchema(ref)) throw new Error(`Could not compile ${ref}`);
    refs[def] = ref;
  }
  let moduleCode = standaloneCode(ajv, refs);

  // Ajv's standalone code `require`s each format from ajv-formats, numbering the variables per
  // schema (`formatsN`). Point them at the inlined `fullFormats` object instead.
  /** @type {Set<string>} */
  const referencedFormats = new Set();
  const formatsRequireRe = new RegExp(
    'const (formats\\d+) = require\\("ajv-formats/dist/formats"\\)\\.fullFormats' +
    '(?:\\.([\\w$]+)|\\["([^"]+)"\\]);', 'g');
  moduleCode = moduleCode.replace(formatsRequireRe, (_, varName, dotName, bracketName) => {
    const name = dotName ?? bracketName;
    if (!/** @type {string[]} */ (FORMATS).includes(name)) {
      throw new Error(`Standalone validator references unexpected format '${name}'`);
    }
    referencedFormats.add(name);
    return `const ${varName} = fullFormats[${JSON.stringify(name)}];`;
  });
  if (moduleCode.includes('require(') || moduleCode.includes('ajv-formats')) {
    throw new Error('Standalone validator still references a CommonJS require() or ajv-formats.');
  }

  const usedFormats = FORMATS.filter(name => referencedFormats.has(name));
  const formatsVersion =
    JSON.parse(fs.readFileSync(path.join(ajvFormatsDir, 'package.json'), 'utf8')).version;
  const formatsLicense = fs.readFileSync(path.join(ajvFormatsDir, 'LICENSE'), 'utf8')
    .replaceAll('\r', '').trim().split('\n').map(line => ` * ${line}`.trimEnd()).join('\n');
  const inlinedFormatsCode = buildInlinedFormats(usedFormats);
  const usedFormatsList = usedFormats.map(name => `\`${name}\``).join(' and ');

  const formattedModuleCode = formatCode(moduleCode);

  const banner = `/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// auto-generated by build/build-ard-schema.js
/* eslint-disable */
// @ts-nocheck

/**
 * @license
 * The ${usedFormatsList} format validators below are copied from
 * ajv-formats v${formatsVersion} (https://github.com/ajv-validator/ajv-formats, dist/formats.js).
 *
${formatsLicense}
 */
const fullFormats = ${inlinedFormatsCode};

`;

  fs.writeFileSync(outputPath, banner + formattedModuleCode);
  console.log(`Generated ${outputPath}`);
}

build();
