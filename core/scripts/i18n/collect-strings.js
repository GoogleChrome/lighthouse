#!/usr/bin/env node
/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable no-console, max-len */

import fs from 'fs';
import path from 'path';
import {pathToFileURL} from 'url';

import glob from 'glob';
import {expect} from 'expect';
import tsc from 'typescript';
import MessageParser from '@formatjs/icu-messageformat-parser';
import esMain from 'es-main';
import {isEqual} from 'lodash-es';

import {Util} from '../../../shared/util.js';
import {collectAndBakeCtcStrings} from './bake-ctc-to-lhl.js';
import {pruneObsoleteLhlMessages} from './prune-obsolete-lhl-messages.js';
import {countTranslatedMessages} from './count-translated.js';
import {LH_ROOT} from '../../../shared/root.js';
import {resolveModulePath} from '../../../shared/esm-utils.js';
import {escapeIcuMessage} from '../../../shared/localization/format.js';

// Match declarations of UIStrings, terminating in either a `};\n` (very likely to always be right)
// or `}\n\n` (allowing semicolon to be optional, but insisting on a double newline so that an
// closing brace in the middle of the declaration does not prematurely end the pattern)
const UISTRINGS_REGEX = /UIStrings = .*?\}(;|\n)\n/s;

/** @typedef {import('./bake-ctc-to-lhl.js').CtcMessage} CtcMessage */
/** @typedef {Required<Pick<CtcMessage, 'message'|'placeholders'>>} IncrementalCtc */
/** @typedef {{message: string, description: string, examples: Record<string, string>}} ParsedUIString */

const foldersWithStrings = [
  `${LH_ROOT}/core`,
  `${LH_ROOT}/report/renderer`,
  `${LH_ROOT}/treemap`,
  `${LH_ROOT}/flow-report`,
  path.dirname(resolveModulePath('lighthouse-stack-packs')) + '/packs',
];

const ignoredPathComponents = [
  '**/.git/**',
  '**/scripts/**',
  '**/node_modules/!(lighthouse-stack-packs)/**', // ignore all node modules *except* stack packs
  '**/core/lib/stack-packs.js',
  '**/test/**',
  '**/*-test.js',
  '**/*.test.js',
  '**/*-renderer.js',
  '**/util-commonjs.js',
  'treemap/app/src/main.js',
];

/**
 * Extract the description and examples (if any) from a jsDoc annotation.
 * @param {import('typescript').JSDoc|import('typescript').JSDocTag|undefined} ast
 * @param {string} message
 * @return {{description: string, examples: Record<string, string>}}
 */
function computeDescription(ast, message) {
  if (!ast) {
    throw Error(`Missing description comment for message "${message}"`);
  }

  if ('tags' in ast && ast.tags) {
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
 * @param {import('typescript').JSDoc['comment']} comment
 * @return {string}
 */
function coerceToSingleLineAndTrim(comment = '') {
  // The non-string types were introduced in https://github.com/microsoft/TypeScript/pull/41877
  // Not currently used, but utility `getTextOfJSDocComment` will convert if the types switch over.
  if (typeof comment !== 'string') {
    throw new Error(`unsupported JSDoc comment: ${JSON.stringify(comment)}`);
  }

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
 *  "core/audits/seo/canonical.js | explanationDifferentDomain" {
 *    "message": "Points to a different domain ({url})",
 *    },
 *  },
 * }
 *
 * Into this:
 * messages: {
 *  "core/audits/seo/canonical.js | explanationDifferentDomain" {
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
 * Throws if the message violates some basic validity checking.
 *
 * @param {string} lhlMessage
 * @param {Record<string, string>} examples
 * @return {IncrementalCtc}
 */
function convertMessageToCtc(lhlMessage, examples = {}) {
  _lhlValidityChecks(lhlMessage);

  /** @type {IncrementalCtc} */
  const ctc = {
    message: lhlMessage,
    placeholders: {},
  };

  // Process each placeholder type
  _processPlaceholderMarkdownCode(ctc);

  _processPlaceholderMarkdownLink(ctc);

  _processPlaceholderCustomFormattedIcu(ctc);

  _processPlaceholderDirectIcu(ctc, examples);

  _ctcValidityChecks(ctc);

  return ctc;
}

/**
 * Do some basic checks on an lhl message to confirm that it is valid. Future
 * lhl regression catching should go here.
 *
 * @param {string} lhlMessage
 */
function _lhlValidityChecks(lhlMessage) {
  let parsedMessageElements;
  try {
    parsedMessageElements = MessageParser.parse(escapeIcuMessage(lhlMessage), {ignoreTag: true});
  } catch (err) {
    if (err.name !== 'SyntaxError') throw err;
    throw new Error(`[${err.message}] Did not find the expected syntax in message: ${err.originalMessage}`);
  }

  /**
   * @param {MessageParser.MessageFormatElement[]} elements
   */
  function validate(elements) {
    for (const element of elements) {
      if (element.type === MessageParser.TYPE.plural || element.type === MessageParser.TYPE.select) {
        // `plural`/`select` arguments can't have content before or after them.
        // See http://userguide.icu-project.org/formatparse/messages#TOC-Complex-Argument-Types
        // e.g. https://github.com/GoogleChrome/lighthouse/pull/11068#discussion_r451682796
        if (elements.length > 1) {
          throw new Error(`Content cannot appear outside plural or select ICU messages. Instead, repeat that content in each option (message: '${lhlMessage}')`);
        }

        for (const option of Object.values(element.options)) {
          validate(option.value);
        }
      }
    }
  }

  validate(parsedMessageElements);
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

  const rawNameCache = new Map();

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

    let index;
    const previousRawName = rawNameCache.get(rawName);
    if (previousRawName) {
      const [prevFormat, prevFormatType, prevIndex] = previousRawName;
      if (prevFormat !== format || prevFormatType !== formatType) {
        throw new Error(`must use same format and formatType for a given name. Invalid for: ${rawName}`);
      }

      index = prevIndex;
    } else {
      index = idx++;
      rawNameCache.set(rawName, [format, formatType, index]);
    }

    // Append ICU replacements if there are any.
    const placeholderName = `CUSTOM_ICU_${index}`;
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
      throw Error(`Example '${key}' provided, but has no corresponding ICU replacement in message "${icu.message}"`);
    }
    const eName = `ICU_${idx++}`;
    tempMessage = tempMessage.replaceAll(`{${key}}`, `$${eName}$`);

    icu.placeholders[eName] = {
      content: `{${key}}`,
      example: value,
    };
  }
  icu.message = tempMessage;
}

/**
 * Do some basic checks on a ctc object to confirm that it is valid. Future
 * ctc regression catching should go here.
 *
 * @param {IncrementalCtc} icu the ctc output message to verify
 */
function _ctcValidityChecks(icu) {
  // '$$' i.e. "Double Dollar" is always invalid in ctc.
  const regex = /\$([^$]*?)\$/g;
  const matches = regex.exec(icu.message);
  if (Array.isArray(matches)) {
    matches.forEach(function(value) {
      if (!value) {
        throw new Error(`Ctc messages cannot contain double dollar: ${icu.message}`);
      }
    });
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
  if (!node.name || !(tsc.isIdentifier(node.name) || tsc.isStringLiteral(node.name))) {
    throw new Error('no Identifier found');
  }

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
    const message = (liveUIStrings[key]);

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

/**
 * Collects all LHL messsages defined in UIString from Javascript files in dir,
 * and converts them into CTC.
 * @param {string} dir absolute path
 * @return {Promise<Record<string, CtcMessage>>}
 */
async function collectAllStringsInDir(dir) {
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
    const exportVars = await import(pathToFileURL(absolutePath).href);
    const regexMatch = content.match(UISTRINGS_REGEX);
    const exportedUIStrings = exportVars.UIStrings || exportVars.default?.UIStrings;

    if (!regexMatch) {
      // No UIStrings found in the file text or exports, so move to the next.
      if (!exportedUIStrings) continue;

      throw new Error('UIStrings exported but no definition found: ' + relativeToRootPath);
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
    }
  }

  return strings;
}

/**
 * @param {string} locale
 * @param {Record<string, CtcMessage>} strings
 */
function writeStringsToCtcFiles(locale, strings) {
  const fullPath = path.join(LH_ROOT, `shared/localization/locales/${locale}.ctc.json`);
  /** @type {Record<string, CtcMessage>} */
  const output = {};
  const sortedEntries = Object.entries(strings).sort(([keyA], [keyB]) => keyA.localeCompare(keyB));
  for (const [key, defn] of sortedEntries) {
    output[key] = defn;
  }

  fs.writeFileSync(fullPath, JSON.stringify(output, null, 2) + '\n');
}

/**
 * TODO: replace by Array.prototype.groupToMap when available.
 * @template {unknown} T
 * @template {string} U
 * @param {Array<T>} elements
 * @param {(element: T) => U} callback
 * @return {Map<U, Array<T>>}
 */
function arrayGroupToMap(elements, callback) {
  /** @type {Map<U, Array<T>>} */
  const elementsByValue = new Map();

  for (const element of elements) {
    const key = callback(element);
    const group = elementsByValue.get(key) || [];
    group.push(element);
    elementsByValue.set(key, group);
  }

  return elementsByValue;
}

/**
 * Returns whether all the placeholders in the given CtcMessages match.
 * @param {Array<{ctc: CtcMessage}>} strings
 * @return {boolean}
 */
function doPlaceholdersMatch(strings) {
  // Technically placeholder `content` is not required to match by TC, but since
  // `example` must match and any auto-generated `example` is copied from `content`,
  // it would be confusing to let it differ when `example` is explicit.
  return strings.every(val => isEqual(val.ctc.placeholders, strings[0].ctc.placeholders));
}

/**
 * If two or more messages have the same `message`:
 * - if `description`, and `placeholders` are also the same, TC treats them as a
 *   single message, the collision is allowed, and no change is made.
 * - if `description` is unique for the collision members, the `description` is
 *   copied to `meaning` to differentiate them for TC. They must be added to the
 *   `collidingMessages` list for this case as a nudge to not be wasteful.
 * - if `description` is the same but `placeholders` differ, an error is thrown.
 *   Either `placeholders` should be the same, or `message` or `description`
 *   should be changed to explain the need for different `placeholders`.
 *
 * Modifies `strings` in place to fix collisions.
 * @see https://github.com/GoogleChrome/lighthouse/blob/main/core/lib/i18n/README.md#collisions
 * @param {Record<string, CtcMessage>} strings
 */
function resolveMessageCollisions(strings) {
  const entries = Object.entries(strings).map(([key, ctc]) => ({key, ctc}));

  const stringsByMessage = arrayGroupToMap(entries, (entry) => entry.ctc.message);
  for (const messageGroup of stringsByMessage.values()) {
    // If this message didn't collide with anything else, skip it.
    if (messageGroup.length <= 1) continue;

    // For each group of matching message+description, placeholders must also match.
    const stringsByDescription = arrayGroupToMap(messageGroup, (entry) => entry.ctc.description);
    for (const descriptionGroup of stringsByDescription.values()) {
      if (!doPlaceholdersMatch(descriptionGroup)) {
        throw new Error('string collision: `message` and `description` are the same but differ in `placeholders`:\n' +
          descriptionGroup.map(entry => `key: ${entry.key}\n`).join('') +
          'make `placeholders` match or update `message` or `description`s to explain why they don\'t match');
      }
    }

    // If the entire message group has the same description and placeholders,
    // they can be translated as if a single message, no meaning needed.
    if (stringsByDescription.size <= 1) continue;

    // We have duplicate messages with different descriptions. Disambiguate using `meaning` for TC.
    for (const {ctc} of messageGroup) {
      ctc.meaning = ctc.description;
    }
  }
}

/**
 * Check that fixed collisions match our known list.
 * @param {Record<string, CtcMessage>} strings
 */
function checkKnownFixedCollisions(strings) {
  const fixedCollisions = Object.values(strings).filter(string => string.meaning);
  const collidingMessages = fixedCollisions.map(collision => collision.message).sort();

  try {
    expect(collidingMessages).toEqual([
      'ARIA $MARKDOWN_SNIPPET_0$ elements do not have accessible names.',
      'ARIA $MARKDOWN_SNIPPET_0$ elements do not have accessible names.',
      'ARIA $MARKDOWN_SNIPPET_0$ elements do not have accessible names.',
      'ARIA $MARKDOWN_SNIPPET_0$ elements do not have accessible names.',
      'ARIA $MARKDOWN_SNIPPET_0$ elements have accessible names',
      'ARIA $MARKDOWN_SNIPPET_0$ elements have accessible names',
      'ARIA $MARKDOWN_SNIPPET_0$ elements have accessible names',
      'ARIA $MARKDOWN_SNIPPET_0$ elements have accessible names',
      'Back/forward cache is disabled due to a keepalive request.',
      'Back/forward cache is disabled due to a keepalive request.',
      'Consider uploading your GIF to a service which will make it available to embed as an HTML5 video.',
      'Consider uploading your GIF to a service which will make it available to embed as an HTML5 video.',
      'Directive',
      'Directive',
      'Directive',
      'Document contains a $MARKDOWN_SNIPPET_0$ that triggers $MARKDOWN_SNIPPET_1$',
      'Document contains a $MARKDOWN_SNIPPET_0$ that triggers $MARKDOWN_SNIPPET_1$',
      'Document has a valid $MARKDOWN_SNIPPET_0$',
      'Document has a valid $MARKDOWN_SNIPPET_0$',
      'Failing Elements',
      'Failing Elements',
      'Lighthouse was unable to reliably load the page you requested. Make sure you are testing the correct URL and that the server is properly responding to all requests. (Status code: $ICU_0$)',
      'Lighthouse was unable to reliably load the page you requested. Make sure you are testing the correct URL and that the server is properly responding to all requests. (Status code: $ICU_0$)',
      'Name',
      'Name',
      'No $MARKDOWN_SNIPPET_0$ directive found',
      'No $MARKDOWN_SNIPPET_0$ directive found',
      'Pages that use portals are not currently eligible for back/forward cache.',
      'Pages that use portals are not currently eligible for back/forward cache.',
      'Pages with an in-flight network request are not currently eligible for back/forward cache.',
      'Pages with an in-flight network request are not currently eligible for back/forward cache.',
      'Potential Savings',
      'Potential Savings',
      'Severity',
      'Severity',
      'Severity',
      'Severity',
      'The page was evicted from the cache to allow another page to be cached.',
      'The page was evicted from the cache to allow another page to be cached.',
      'Use $MARKDOWN_SNIPPET_0$ to detect unused JavaScript code. $LINK_START_0$Learn more$LINK_END_0$',
      'Use $MARKDOWN_SNIPPET_0$ to detect unused JavaScript code. $LINK_START_0$Learn more$LINK_END_0$',
      'Use the $MARKDOWN_SNIPPET_0$ component and set the appropriate $MARKDOWN_SNIPPET_1$. $LINK_START_0$Learn more$LINK_END_0$.',
      'Use the $MARKDOWN_SNIPPET_0$ component and set the appropriate $MARKDOWN_SNIPPET_1$. $LINK_START_0$Learn more$LINK_END_0$.',
      'Use the $MARKDOWN_SNIPPET_0$ component instead of $MARKDOWN_SNIPPET_1$ to adjust image quality. $LINK_START_0$Learn more$LINK_END_0$.',
      'Use the $MARKDOWN_SNIPPET_0$ component instead of $MARKDOWN_SNIPPET_1$ to adjust image quality. $LINK_START_0$Learn more$LINK_END_0$.',
      'Use the $MARKDOWN_SNIPPET_0$ component instead of $MARKDOWN_SNIPPET_1$ to automatically lazy-load images. $LINK_START_0$Learn more$LINK_END_0$.',
      'Use the $MARKDOWN_SNIPPET_0$ component instead of $MARKDOWN_SNIPPET_1$ to automatically lazy-load images. $LINK_START_0$Learn more$LINK_END_0$.',
      'Use the $MARKDOWN_SNIPPET_0$ component instead of $MARKDOWN_SNIPPET_1$ to automatically optimize image format. $LINK_START_0$Learn more$LINK_END_0$.',
      'Use the $MARKDOWN_SNIPPET_0$ component instead of $MARKDOWN_SNIPPET_1$ to automatically optimize image format. $LINK_START_0$Learn more$LINK_END_0$.',
    ]);
  } catch (err) {
    console.log('The number of duplicate strings has changed. Consider duplicating the `description` to match existing strings so they\'re translated together or update this assertion if they must absolutely be translated separately');
    console.log('copy/paste this to pass check:');
    console.log(collidingMessages);
    throw new Error(err.message);
  }
}

/**
 * @param {Record<any, any>} obj
 * @return {Record<any, any>}
 */
function sortObject(obj) {
  return Object.keys(obj).sort().reduce(function(result, key) {
    // @ts-expect-error
    result[key] = obj[key];
    return result;
  }, {});
}

/**
 * Inject translated strings from `node_modules/@paulirish/trace_engine`. This avoids Lighthouse
 * re-translating these same strings.
 */
function injectTraceEngineStrings() {
  const traceEngineStringsDir = `${LH_ROOT}/node_modules/@paulirish/trace_engine/locales`;
  const lhTraceStringsDir = `${LH_ROOT}/shared/localization/locales`;
  for (const file of glob.sync(`${lhTraceStringsDir}/*.json`)) {
    let name = path.basename(file);
    if (name.endsWith('.ctc.json')) {
      continue;
    }

    if (name === 'ar-XB.json') {
      name = 'ar.json';
    }

    if (['en-XA.json'].includes(name)) {
      continue;
    }

    const traceEnginePath = `${traceEngineStringsDir}/${name}`;
    if (!fs.existsSync(traceEnginePath)) {
      throw new Error(`expected locale file to exist: ${traceEnginePath}`);
    }

    const traceEngineStrings = JSON.parse(fs.readFileSync(traceEnginePath, 'utf-8'));
    const strings = JSON.parse(fs.readFileSync(file, 'utf-8'));
    for (const [key, value] of Object.entries(traceEngineStrings)) {
      strings[`node_modules/@paulirish/trace_engine/${key.replace('.ts', '.js')}`] = value;
    }

    fs.writeFileSync(file, JSON.stringify(sortObject(strings), null, 2) + '\n');
  }
}

async function main() {
  /** @type {Record<string, CtcMessage>} */
  const strings = {};

  for (const folderWithStrings of foldersWithStrings) {
    console.log(`\n====\nCollecting strings from ${folderWithStrings}\n====`);
    const moreStrings = await collectAllStringsInDir(folderWithStrings);
    Object.assign(strings, moreStrings);
  }

  resolveMessageCollisions(strings);
  checkKnownFixedCollisions(strings);

  writeStringsToCtcFiles('en-US', strings);
  console.log('Written to disk!', 'en-US.ctc.json');
  // Generate local pseudolocalized files for debugging while translating
  writeStringsToCtcFiles('en-XL', createPsuedoLocaleStrings(strings));
  console.log('Written to disk!', 'en-XL.ctc.json');

  // Bake the ctc en-US and en-XL files into en-US and en-XL LHL format
  const lhl = collectAndBakeCtcStrings(path.join(LH_ROOT, 'shared/localization/locales/'));
  lhl.forEach(function(locale) {
    console.log(`Baked ${locale} into LHL format.`);
  });

  // Remove any obsolete strings in existing LHL files.
  console.log('Checking for out-of-date LHL messages...');
  injectTraceEngineStrings();
  pruneObsoleteLhlMessages();

  // Report on translation progress.
  const progress = countTranslatedMessages();
  console.log(`  ${progress.localeCount} translated locale files`);
  console.log(`  ${progress.translatedCount}/${progress.messageCount} fully translated messages`);
  if (progress.partiallyTranslatedCount) {
    console.log(`  ${progress.partiallyTranslatedCount}/${progress.messageCount} partially translated messages`);
  }
  console.log(`  ${progress.notTranslatedCount}/${progress.messageCount} untranslated messages`);

  console.log('✨ Complete!');
}

// Test if called from the CLI or as a module.
if (esMain(import.meta)) {
  await main();
}

export {
  parseUIStrings,
  createPsuedoLocaleStrings,
  convertMessageToCtc,
  resolveMessageCollisions,
};
