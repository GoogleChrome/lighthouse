#!/usr/bin/env node
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable no-console */

import fs from 'fs';
import path from 'path';

import {LH_ROOT} from '../../../shared/root.js';
import {readJson} from '../../test/test-utils.js';

/**
 * @typedef CtcMessage
 * @property {string} message the message that is being translated
 * @property {string} description a string used by translators to give context to the message
 * @property {string} [meaning] an arbitrary string used by translators to differentiate messages that have the same message
 * @property {Record<string, CtcPlaceholder>|undefined} [placeholders] a set of values that are to be replaced in a message
 */

/**
 * @typedef CtcPlaceholder
 * @property {string} content the string that will be substituted into a message
 * @property {string} [example] an example (to assist translators) of what the content may be in the final string
 */

/**
 * @typedef LhlMessage
 * @property {string} message
 */

/**
 * Take a series of CTC format ICU messages and converts them to LHL format by
 * replacing $placeholders$ with their {ICU} values. Functional opposite of
 * `convertMessageToCtc`. This is commonly called as the last step in
 * translation.
 *
 * Converts this:
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
 * Into this:
 * messages: {
 *  "core/audits/seo/canonical.js | explanationDifferentDomain" {
 *    "message": "Points to a different domain ({url})",
 *    },
 *  },
 * }
 *
 * Throws if there is a $placeholder$ in the message that has no corresponding
 * value in the placeholders object, or vice versa.
 *
 * @param {Record<string, CtcMessage>} messages
 * @return {Record<string, LhlMessage>}
 */
function bakePlaceholders(messages) {
  /** @type {Record<string, LhlMessage>} */
  const bakedMessages = {};

  for (const [key, defn] of Object.entries(messages)) {
    let message = defn.message;
    const placeholders = defn.placeholders;

    if (placeholders) {
      for (const [placeholder, {content}] of Object.entries(placeholders)) {
        if (!message.includes('$' + placeholder + '$')) {
          throw Error(`Provided placeholder "${placeholder}" not found in message "${message}".`);
        }
        // Need a global replace due to plural ICU copying placeholders
        // (and therefore ICU vars) multiple times.
        const regex = new RegExp('\\$' + placeholder + '\\$', 'g');
        message = message.replace(regex, () => content);
      }
    }

    // Check that all placeholders are gone.
    if (message.match(/\$\w+\$/)) {
      throw Error(`Message "${message}" is missing placeholder(s): ${message.match(/\$\w+\$/g)}`);
    }

    bakedMessages[key] = {message};
  }

  return bakedMessages;
}

/**
 * @param {string} file
 * @return {Record<string, CtcMessage>}
 */
function loadCtcStrings(file) {
  if (!file.endsWith('.ctc.json')) throw new Error('Can only load ctc files');

  return readJson(file);
}

/**
 * @param {string} path
 * @param {Record<string, LhlMessage>} localeStrings
 */
function saveLhlStrings(path, localeStrings) {
  fs.writeFileSync(path, JSON.stringify(localeStrings, null, 2) + '\n');
}

/**
 * @param {string} dir
 * @return {Array<string>}
 */
function collectAndBakeCtcStrings(dir) {
  const lhlFilenames = [];
  for (const filename of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, filename);
    const relativePath = path.relative(LH_ROOT, fullPath);

    if (filename.endsWith('.ctc.json')) {
      if (!process.env.CI) console.log('Baking', relativePath);
      const ctcStrings = loadCtcStrings(relativePath);
      const strings = bakePlaceholders(ctcStrings);
      const outputFile = path.join(dir, path.basename(filename).replace('.ctc', ''));
      saveLhlStrings(outputFile, strings);
      lhlFilenames.push(path.basename(filename));
    }
  }
  return lhlFilenames;
}

export {
  collectAndBakeCtcStrings,
  bakePlaceholders,
};
