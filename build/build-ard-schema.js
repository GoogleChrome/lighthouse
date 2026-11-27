/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';

import Ajv2020 from 'ajv/dist/2020.js';
import standaloneCode from 'ajv/dist/standalone/index.js';
import addFormats from 'ajv-formats';

import {LH_ROOT} from '../shared/root.js';

const schemaPath = path.join(LH_ROOT, 'third-party/ard/spec/schemas/ard-entry.schema.json');
const outputPath = path.join(LH_ROOT, 'third-party/ard/schema-validator.js');

/**
 * The definitions validated by the upstream conformance test (`as_def(...)` in
 * `conformance/bin/conformance-test`). Each is exported as a named validator.
 */
const EXPORTED_DEFS = ['ArdManifest', 'ArdEntry'];

/** @type {Array<import('ajv-formats').FormatName>} */
const FORMATS = ['uri', 'date-time'];

/**
 * Hand-written port of the `FORMATS` validators from ajv-formats v3.0.1 (full mode), emitted into
 * the generated module so `ajv-formats` (and `ajv`) are not runtime dependencies.
 */
/* eslint-disable max-len */
const FORMATS_CODE = String.raw`/*! uri and date-time format validators ported from ajv-formats v3.0.1 (full mode).
 * https://github.com/ajv-validator/ajv-formats - Copyright (c) 2020 Evgeny Poberezkin - MIT License */
const DATE = /^(\d\d\d\d)-(\d\d)-(\d\d)$/;
const DAYS = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const TIME = /^(\d\d):(\d\d):(\d\d(?:\.\d+)?)(z|([+-])(\d\d)(?::?(\d\d))?)?$/i;
const NOT_URI_FRAGMENT = /\/|:/;
const URI = /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)(?:\?(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i;
function isDate(str) {
  const matches = DATE.exec(str);
  if (!matches) return false;
  const year = +matches[1];
  const month = +matches[2];
  const day = +matches[3];
  const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return month >= 1 && month <= 12 && day >= 1 && day <= (month === 2 && isLeapYear ? 29 : DAYS[month]);
}
function isTimeWithTimeZone(str) {
  const matches = TIME.exec(str);
  if (!matches) return false;
  const hr = +matches[1];
  const min = +matches[2];
  const sec = +matches[3];
  const tzSign = matches[5] === '-' ? -1 : 1;
  const tzH = +(matches[6] || 0);
  const tzM = +(matches[7] || 0);
  if (tzH > 23 || tzM > 59 || !matches[4]) return false;
  if (hr <= 23 && min <= 59 && sec < 60) return true;
  // leap second
  const utcMin = min - tzM * tzSign;
  const utcHr = hr - tzH * tzSign - (utcMin < 0 ? 1 : 0);
  return (utcHr === 23 || utcHr === -1) && (utcMin === 59 || utcMin === -1) && sec < 61;
}
const fullFormats = {
  'uri': (str) => NOT_URI_FRAGMENT.test(str) && URI.test(str),
  'date-time': {
    validate(str) {
      const dateTime = str.split(/t|\s/i);
      return dateTime.length === 2 && isDate(dateTime[0]) && isTimeWithTimeZone(dateTime[1]);
    },
  },
};
`;
/* eslint-enable max-len */

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
  // schema (`formatsN`). Point them at the hand-written `fullFormats` in FORMATS_CODE instead.
  const formatsRequireRe = new RegExp(
    'const (formats\\d+) = require\\("ajv-formats/dist/formats"\\)\\.fullFormats' +
    '(?:\\.([\\w$]+)|\\["([^"]+)"\\]);', 'g');
  moduleCode = moduleCode.replace(formatsRequireRe, (_, varName, dotName, bracketName) => {
    const name = dotName ?? bracketName;
    if (!/** @type {string[]} */ (FORMATS).includes(name)) {
      throw new Error(`Standalone validator references unsupported format '${name}'`);
    }
    return `const ${varName} = fullFormats[${JSON.stringify(name)}];`;
  });
  if (moduleCode.includes('require(') || moduleCode.includes('ajv-formats')) {
    throw new Error('Standalone validator still references a CommonJS require() or ajv-formats.');
  }

  const formattedModuleCode = formatCode(moduleCode);

  const banner = `/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// auto-generated by build/build-ard-schema.js
/* eslint-disable */
// @ts-nocheck

${FORMATS_CODE}
`;

  fs.writeFileSync(outputPath, banner + formattedModuleCode);
  console.log(`Generated ${outputPath}`);
}

build();
