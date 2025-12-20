#!/usr/bin/env node
/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-disable no-console, max-len */

const fs = require('fs');
const glob = require('glob');
const path = require('path');
const assert = require('assert').strict;
const tsc = require('typescript');
const Util = require('../../report/html/renderer/util.js');
const {collectAndBakeCtcStrings} = require('./bake-ctc-to-lhl.js');
const {pruneObsoleteLhlMessages} = require('./prune-obsolete-lhl-messages.js');

const LH_ROOT = path.join(__dirname, '../../../');
const UISTRINGS_REGEX = /UIStrings = .*?\};\n/s;

/** @typedef {import('./bake-ctc-to-lhl.js').CtcMessage} CtcMessage */
/** @typedef {Required<Pick<CtcMessage, 'message'|'placeholders'>>} IncrementalCtc */
/** @typedef {{message: string, description: string, examples: Record<string, string>}} ParsedUIString */

const ignoredPathComponents = [
  '**/.git/**',
  '**/scripts/**',
  '**/node_modules/**',
  '**/test/**',
  '**/*-test.js',
  '**/*-renderer.js',
];

/**
 * Extract the description and examples (if any) from a jsDoc annotation.
 * @param {import('typescript').JSDoc|undefined} ast
 * @param {string} message
 * @return {{description: string, examples: Record<string, string>}}
 */
function computeDescription(ast, message) {
  if (!ast) {
    throw Error(`Missing description comment for message "${message}"`);
  }

  if (ast.tags) {
    // This is a complex description with description and examples.
    let description = '';
    /** @type {Record<string, string>} */
    const examples = {};

    for (const tag of ast.tags) {
      const comment = coerceToSingleLineAndTrim(tag.comment);

      if (tag.tagName.text === 'description') {
        description = comment;
      } else if (tag.tagName.text === 'example') {
        const {placeholderName, exampleValue} = parseExampleJsDoc(comment);
        examples[placeholderName] = exampleValue;
      } else {
        // Until a compelling use case for supporting more @tags, throw to catch typos, etc.
        throw new Error(`Unexpected tagName "@${tag.tagName.text}"`);
      }
    }

    if (description.length === 0) throw Error(`Empty @description for message "${message}"`);
    return {description, examples};
  }

  if (ast.comment) {
    // The entire comment is the description, so return everything.
    return {description: coerceToSingleLineAndTrim(ast.comment), examples: {}};
  }

  throw Error(`Missing description comment for message "${message}"`);
}

/**
 * Collapses a jsdoc comment into a single line and trims whitespace.
 * @param {string=} comment
 * @return {string}
 */
function coerceToSingleLineAndTrim(comment = '') {
  // Line breaks within a jsdoc comment should always be replaceable with a space.
  return comment.replace(/\n+/g, ' ').trim();
}

/**
 * Parses a string of the form `{exampleValue} placeholderName`, parsed by tsc
 * as the content of an `@example` tag.
 * @param {string} rawExample
 * @return {{placeholderName: string, exampleValue: string}}
 */
function parseExampleJsDoc(rawExample) {
  const match = rawExample.match(/^{(?<exampleValue>[^}]+)} (?<placeholderName>.+)$/);
  if (!match || !match.groups) throw new Error(`Incorrectly formatted @example: "${rawExample}"`);
  const {placeholderName, exampleValue} = match.groups;
  return {placeholderName, exampleValue};
}

/**
 * Take a series of LHL format ICU messages and converts them
 * to CTC format by replacing {ICU} and `markdown` with
 * $placeholders$. Functional opposite of `bakePlaceholders`. This is commonly
 * called as one of the first steps in translation, via collect-strings.js.
 *
 * Converts this:
 * messages: {
 *  "lighthouse-core/audits/seo/canonical.js | explanationDifferentDomain" {
 *    "message": "Points to a different domain ({url})",
 *    },
 *  },
 * }
 *
 * Into this:
 * messages: {
 *  "lighthouse-core/audits/seo/canonical.js | explanationDifferentDomain" {
 *    "message": "Points to a different domain ($ICU_0$)",
 *    "placeholders": {
 *      "ICU_0": {
 *        "content": "{url}",
 *        "example": "https://example.com/"
 *      },
 *    },
 *  },
 * }
 *
 * Throws if the message violates some basic sanity checking.
 *
 * @param {string} message
 * @param {Record<string, string>} examples
 * @return {IncrementalCtc}
 */
function convertMessageToCtc(message, examples = {}) {
  /** @type {IncrementalCtc} */
  const ctc = {
    message,
    placeholders: {},
  };

  // Process each placeholder type
  _processPlaceholderMarkdownCode(ctc);

  _processPlaceholderMarkdownLink(ctc);

  _processPlaceholderCustomFormattedIcu(ctc);

  _processPlaceholderDirectIcu(ctc, examples);

  _ctcSanityChecks(ctc);

  return ctc;
}

/**
 * Convert code spans into placeholders with examples.
 *
 * @param {IncrementalCtc} icu
 */
function _processPlaceholderMarkdownCode(icu) {
  const message = icu.message;

  // Check that number of backticks is even.
  const match = message.match(/`/g);
  if (match && match.length % 2 !== 0) {
    throw Error(`Open backtick in message "${message}"`);
  }

  icu.message = '';
  let idx = 0;
  for (const segment of Util.splitMarkdownCodeSpans(message)) {
    if (segment.isCode) {
      const placeholderName = `MARKDOWN_SNIPPET_${idx++}`;
      // Backtick replacement looks unreadable here, so .join() instead.
      icu.message += '$' + placeholderName + '$';
      icu.placeholders[placeholderName] = {
        content: '`' + segment.text + '`',
        example: segment.text,
      };
    } else {
      icu.message += segment.text;
    }
  }
}

/**
 * Convert markdown html links into placeholders.
 *
 * @param {IncrementalCtc} icu
 */
function _processPlaceholderMarkdownLink(icu) {
  const message = icu.message;

  // Check for markdown link common errors, ex:
  // * [extra] (space between brackets and parens)
  if (message.match(/\[.*\] \(.*\)/)) {
    throw Error(`Bad Link spacing in message "${message}"`);
  }
  // * [](empty link text)
  if (message.match(/\[\]\(.*\)/)) {
    throw Error(`markdown link text missing in message "${message}"`);
  }

  icu.message = '';
  let idx = 0;

  for (const segment of Util.splitMarkdownLink(message)) {
    if (!segment.isLink) {
      // Plain text segment.
      icu.message += segment.text;
      continue;
    }

    // Otherwise, append any links found.
    const startPlaceholder = `LINK_START_${idx}`;
    const endPlaceholder = `LINK_END_${idx}`;
    icu.message += '$' + startPlaceholder + '$' + segment.text + '$' + endPlaceholder + '$';
    idx++;
    icu.placeholders[startPlaceholder] = {
      content: '[',
    };
    icu.placeholders[endPlaceholder] = {
      content: `](${segment.linkHref})`,
    };
  }
}

/**
 * Convert custom-formatted ICU syntax into placeholders with examples.
 * Custom formats defined in i18n.js in "format" object.
 *
 * Before:
 *  icu: 'This audit took {timeInMs, number, milliseconds} ms.'
 * After:
 *  icu: 'This audit took $CUSTOM_ICU_0' ms.
 *  placeholders: {
 *    CUSTOM_ICU_0 {
 *      content: {timeInMs, number, milliseconds},
 *      example: 499,
 *    }
 *  }
 *
 * @param {IncrementalCtc} icu
 */
function _processPlaceholderCustomFormattedIcu(icu) {
  // Split on custom-formatted ICU: {var, number, type}
  const parts = icu.message.split(
    /\{(\w+), (\w+), (\w+)\}/g);
  icu.message = '';
  let idx = 0;

  while (parts.length) {
    // Seperate out the match into parts.
    const [preambleText, rawName, format, formatType] = parts.splice(0, 4);
    icu.message += preambleText;

    if (!rawName || !format || !formatType) continue;
    // Check that custom-formatted ICU not using non-supported format ex:
    // * using a second arg anything other than "number"
    // * using a third arg that is not millis, secs, bytes, %, or extended %
    if (!format.match(/^number$/)) {
      throw Error(`Unsupported custom-formatted ICU format var "${format}" in message "${icu.message}"`);
    }
    if (!formatType.match(/milliseconds|seconds|bytes|percent|extendedPercent/)) {
      throw Error(`Unsupported custom-formatted ICU type var "${formatType}" in message "${icu.message}"`);
    }

    // Append ICU replacements if there are any.
    const placeholderName = `CUSTOM_ICU_${idx++}`;
    icu.message += `$${placeholderName}$`;
    let example;

    // Make some good examples.
    switch (formatType) {
      case 'seconds':
        example = '2.4';
        break;
      case 'percent':
        example = '54.6%';
        break;
      case 'extendedPercent':
        example = '37.92%';
        break;
      case 'milliseconds':
      case 'bytes':
        example = '499';
        break;
      default:
        // This shouldn't be possible, but if the above formatType regex fails, this is fallback.
        throw Error('Unknown formatType');
    }

    icu.placeholders[placeholderName] = {
      content: `{${rawName}, number, ${formatType}}`,
      example,
    };
  }
}

/**
 * Add examples for direct ICU replacement.
 *
 * @param {IncrementalCtc} icu
 * @param {Record<string, string>} examples
 */
function _processPlaceholderDirectIcu(icu, examples) {
  let tempMessage = icu.message;
  let idx = 0;
  const findIcu = /\{(\w+)\}/g;

  let matches;
  // Make sure all ICU vars have examples
  while ((matches = findIcu.exec(tempMessage)) !== null) {
    const varName = matches[1];
    if (!examples[varName]) {
      throw Error(`Variable '${varName}' is missing @example comment in message "${tempMessage}"`);
    }
  }

  for (const [key, value] of Object.entries(examples)) {
    // Make sure all examples have ICU vars
    if (!icu.message.includes(`{${key}}`)) {
      throw Error(`Example '${key}' provided, but has not corresponding ICU replacement in message "${icu.message}"`);
    }
    const eName = `ICU_${idx++}`;
    tempMessage = tempMessage.replace(`{${key}}`, `$${eName}$`);

    icu.placeholders[eName] = {
      content: `{${key}}`,
      example: value,
    };
  }
  icu.message = tempMessage;
}

/**
 * Do some basic sanity checks to a ctc object to confirm that it is valid. Future
 * ctc regression catching should go here.
 *
 * @param {IncrementalCtc} icu the ctc output message to verify
 */
function _ctcSanityChecks(icu) {
  // '$$' i.e. "Double Dollar" is always invalid in ctc.
  if (icu.message.match(/\$\$/)) {
    throw new Error(`Ctc messages cannot contain double dollar: ${icu.message}`);
  }
}

/**
 * Take a series of messages and apply ĥât̂ markers to the translatable portions
 * of the text.  Used to generate `en-XL` locale to debug i18n strings. This is
 * done while messages are in `ctc` format, and therefore modifies only the
 * messages themselves while leaving placeholders untouched.
 *
 * @param {Record<string, CtcMessage>} messages
 * @return {Record<string, CtcMessage>}
 */
function createPsuedoLocaleStrings(messages) {
  /** @type {Record<string, CtcMessage>} */
  const psuedoLocalizedStrings = {};
  for (const [key, ctc] of Object.entries(messages)) {
    const message = ctc.message;
    const psuedoLocalizedString = [];
    let braceCount = 0;
    let inPlaceholder = false;
    let useHatForAccentMark = true;
    for (const char of message) {
      psuedoLocalizedString.push(char);
      if (char === '$') {
        inPlaceholder = !inPlaceholder;
        continue;
      }
      if (inPlaceholder) {
        continue;
      }

      if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
      }

      // Hack to not change {plural{ICU}braces} nested an odd number of times.
      // ex: "{itemCount, plural, =1 {1 link found} other {# links found}}"
      // becomes "{itemCount, plural, =1 {1 l̂ín̂ḱ f̂óûńd̂} other {# ĺîńk̂ś f̂óûńd̂}}"
      // ex: "{itemCount, plural, =1 {1 link {nested_replacement} found} other {# links {nested_replacement} found}}"
      // becomes: "{itemCount, plural, =1 {1 l̂ín̂ḱ {nested_replacement} f̂óûńd̂} other {# ĺîńk̂ś {nested_replacement} f̂óûńd̂}}"
      if (braceCount % 2 === 1) continue;

      // Add diacritical marks to the preceding letter, alternating between a hat ( ̂ ) and an acute (´).
      if (/[a-z]/i.test(char)) {
        psuedoLocalizedString.push(useHatForAccentMark ? `\u0302` : `\u0301`);
        useHatForAccentMark = !useHatForAccentMark;
      }
    }
    psuedoLocalizedStrings[key] = {
      message: psuedoLocalizedString.join(''),
      description: ctc.description,
      placeholders: ctc.placeholders,
    };
  }
  return psuedoLocalizedStrings;
}

/**
 * Helper function that retrieves the text identifier of a named node in the tsc AST.
 * @param {import('typescript').NamedDeclaration} node
 * @return {string}
 */
function getIdentifier(node) {
  if (!node.name || !tsc.isIdentifier(node.name)) throw new Error('no Identifier found');

  return node.name.text;
}

/**
 * @param {string} sourceStr String of the form 'const UIStrings = {...}'.
 * @param {Record<string, string>} liveUIStrings The actual imported UIStrings object.
 * @return {Record<string, ParsedUIString>}
 */
function parseUIStrings(sourceStr, liveUIStrings) {
  const tsAst = tsc.createSourceFile('uistrings', sourceStr, tsc.ScriptTarget.ES2019, true, tsc.ScriptKind.JS);

  const extractionError = new Error('UIStrings declaration was not extracted correctly by the collect-strings regex.');
  const uiStringsStatement = tsAst.statements[0];
  if (tsAst.statements.length !== 1) throw extractionError;
  if (!tsc.isVariableStatement(uiStringsStatement)) throw extractionError;

  const uiStringsDeclaration = uiStringsStatement.declarationList.declarations[0];
  if (!tsc.isVariableDeclaration(uiStringsDeclaration)) throw extractionError;
  if (getIdentifier(uiStringsDeclaration) !== 'UIStrings') throw extractionError;

  const uiStringsObject = uiStringsDeclaration.initializer;
  if (!uiStringsObject || !tsc.isObjectLiteralExpression(uiStringsObject)) throw extractionError;

  /** @type {Record<string, ParsedUIString>} */
  const parsedMessages = {};

  for (const property of uiStringsObject.properties) {
    const key = getIdentifier(property);

    // Use live message to avoid having to e.g. concat strings broken into parts.
    const message = liveUIStrings[key];

    // @ts-ignore - Not part of the public tsc interface yet.
    const jsDocComments = tsc.getJSDocCommentsAndTags(property);
    const {description, examples} = computeDescription(jsDocComments[0], message);

    parsedMessages[key] = {
      message,
      description,
      examples,
    };
  }

  return parsedMessages;
}

/** @type {Map<string, string>} */
const seenStrings = new Map();

/** @type {number} */
let collisions = 0;

/** @type {Array<string>} */
const collisionStrings = [];

/**
 * Collects all LHL messsages defined in UIString from Javascript files in dir,
 * and converts them into CTC.
 * @param {string} dir absolute path
 * @return {Record<string, CtcMessage>}
 */
function collectAllStringsInDir(dir) {
  /** @type {Record<string, CtcMessage>} */
  const strings = {};

  const globPattern = path.join(path.relative(LH_ROOT, dir), '/**/*.js');
  const files = glob.sync(globPattern, {
    cwd: LH_ROOT,
    ignore: ignoredPathComponents,
  });
  for (const relativeToRootPath of files) {
    const absolutePath = path.join(LH_ROOT, relativeToRootPath);
    if (!process.env.CI) console.log('Collecting from', relativeToRootPath);

    const content = fs.readFileSync(absolutePath, 'utf8');
    const exportVars = require(absolutePath);
    const regexMatch = content.match(UISTRINGS_REGEX);
    const exportedUIStrings = exportVars.UIStrings;

    if (!regexMatch) {
      // No UIStrings found in the file text or exports, so move to the next.
      if (!exportedUIStrings) continue;

      throw new Error('UIStrings exported but no definition found');
    }

    if (!exportedUIStrings) {
      throw new Error('UIStrings defined in file but not exported');
    }

    // just parse the UIStrings substring to avoid ES version issues, save time, etc
    const justUIStrings = 'const ' + regexMatch[0];
    const parsedMessages = parseUIStrings(justUIStrings, exportedUIStrings);

    for (const [key, parsed] of Object.entries(parsedMessages)) {
      const {message, description, examples} = parsed;
      const converted = convertMessageToCtc(message, examples);

      // Don't include placeholders if there are none.
      const placeholders = Object.keys(converted.placeholders).length === 0 ?
          undefined :
          converted.placeholders;

      /** @type {CtcMessage} */
      const ctc = {
        message: converted.message,
        description,
        placeholders,
      };

      const messageKey = `${relativeToRootPath} | ${key}`;
      strings[messageKey] = ctc;

      // check for duplicates, if duplicate, add @description as @meaning to both
      if (seenStrings.has(ctc.message)) {
        ctc.meaning = ctc.description;
        const seenId = seenStrings.get(ctc.message);
        if (seenId) {
          if (!strings[seenId].meaning) {
            strings[seenId].meaning = strings[seenId].description;
            collisions++;
          }
          collisionStrings.push(ctc.message);
          collisions++;
        }
      }
      seenStrings.set(ctc.message, messageKey);
    }
  }

  return strings;
}

/**
 * @param {string} locale
 * @param {Record<string, CtcMessage>} strings
 */
function writeStringsToCtcFiles(locale, strings) {
  const fullPath = path.join(LH_ROOT, `lighthouse-core/lib/i18n/locales/${locale}.ctc.json`);
  /** @type {Record<string, CtcMessage>} */
  const output = {};
  const sortedEntries = Object.entries(strings).sort(([keyA], [keyB]) => keyA.localeCompare(keyB));
  for (const [key, defn] of sortedEntries) {
    output[key] = defn;
  }

  fs.writeFileSync(fullPath, JSON.stringify(output, null, 2) + '\n');
}

// @ts-ignore Test if called from the CLI or as a module.
if (require.main === module) {
  const coreStrings = collectAllStringsInDir(path.join(LH_ROOT, 'lighthouse-core'));
  console.log('Collected from LH core!');

  const stackPackStrings = collectAllStringsInDir(path.join(LH_ROOT, 'stack-packs/packs'));
  console.log('Collected from Stack Packs!');

  if ((collisions) > 0) {
    console.log(`MEANING COLLISION: ${collisions} string(s) have the same content.`);
    assert.equal(collisions, 16, `The number of duplicate strings have changed, update this assertion if that is expected, or reword strings. Collisions: ${collisionStrings}`);
  }

  const strings = {...coreStrings, ...stackPackStrings};
  writeStringsToCtcFiles('en-US', strings);
  console.log('Written to disk!', 'en-US.ctc.json');
  // Generate local pseudolocalized files for debugging while translating
  writeStringsToCtcFiles('en-XL', createPsuedoLocaleStrings(strings));
  console.log('Written to disk!', 'en-XL.ctc.json');

  // Bake the ctc en-US and en-XL files into en-US and en-XL LHL format
  const lhl = collectAndBakeCtcStrings(path.join(LH_ROOT, 'lighthouse-core/lib/i18n/locales/'),
      path.join(LH_ROOT, 'lighthouse-core/lib/i18n/locales/'));
  lhl.forEach(function(locale) {
    console.log(`Baked ${locale} into LHL format.`);
  });

  // Remove any obsolete strings in existing LHL files.
  console.log('Checking for out-of-date LHL messages...');
  pruneObsoleteLhlMessages();
}

module.exports = {
  parseUIStrings,
  createPsuedoLocaleStrings,
  convertMessageToCtc,
};
