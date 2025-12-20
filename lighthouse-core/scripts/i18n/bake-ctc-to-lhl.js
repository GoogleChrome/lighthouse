#!/usr/bin/env node
/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');

const LH_ROOT = path.join(__dirname, '../../../');

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
 * Into this:
 * messages: {
 *  "lighthouse-core/audits/seo/canonical.js | explanationDifferentDomain" {
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
        message = message.replace(regex, content);
      }
    }

    // Sanity check that all placeholders are gone
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

  const rawdata = fs.readFileSync(file, 'utf8');
  const messages = JSON.parse(rawdata);
  return messages;
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
 * @param {string} outputDir
 * @return {Array<string>}
 */
function collectAndBakeCtcStrings(dir, outputDir) {
  const lhlFilenames = [];
  for (const filename of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, filename);
    const relativePath = path.relative(LH_ROOT, fullPath);

    if (filename.endsWith('.ctc.json')) {
      if (!process.env.CI) console.log('Baking', relativePath);
      const ctcStrings = loadCtcStrings(relativePath);
      const strings = bakePlaceholders(ctcStrings);
      const outputFile = outputDir + path.basename(filename).replace('.ctc', '');
      saveLhlStrings(outputFile, strings);
      lhlFilenames.push(path.basename(filename));
    }
  }
  return lhlFilenames;
}

module.exports = {
  collectAndBakeCtcStrings,
  bakePlaceholders,
};
