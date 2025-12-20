/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const MessageParser = require('intl-messageformat-parser').default;

const {collectAllCustomElementsFromICU} = require('../../lib/i18n/i18n.js');

/** @typedef {Record<string, {message: string}>} LhlMessages */

/**
 * Returns whether the string `lhlMessage` has ICU arguments matching the
 * already extracted `goldenArgumentIds`. Assumes `goldenArgumentIds` is sorted.
 * @param {Array<string>} goldenArgumentIds
 * @param {string} lhlMessage
 * @return {boolean}
 */
function equalArguments(goldenArgumentIds, lhlMessage) {
  const parsedMessage = MessageParser.parse(lhlMessage);
  const lhlArgumentElements = collectAllCustomElementsFromICU(parsedMessage.elements);
  const lhlArgumentIds = [...lhlArgumentElements.keys()];

  if (goldenArgumentIds.length !== lhlArgumentIds.length) return false;

  lhlArgumentIds.sort();
  for (let i = 0; i < goldenArgumentIds.length; i++) {
    if (goldenArgumentIds[i] !== lhlArgumentIds[i]) {
      return false;
    }
  }

  return true;
}

/**
 * Logs a message as removed if it hasn't been logged before.
 * @param {Set<string>} alreadyLoggedPrunes
 * @param {string} messageId
 * @param {string} reason
 */
function logRemoval(alreadyLoggedPrunes, messageId, reason) {
  if (alreadyLoggedPrunes.has(messageId)) return;

  // eslint-disable-next-line no-console
  console.log(`Removing message\n\t'${messageId}'\nfrom translations: ${reason}.`);
  alreadyLoggedPrunes.add(messageId);
}

/**
 * Returns a copy of `localeLhl` with only messages matching those from the golden locale.
 * `goldenLocaleArgumentIds` values are assumed to be sorted.
 * @param {Record<string, Array<string>>} goldenLocaleArgumentIds
 * @param {LhlMessages} localeLhl
 * @param {Set<string>} alreadyLoggedPrunes Set of prunes that have been logged and shouldn't be logged again.
 * @return {LhlMessages}
 */
function pruneLocale(goldenLocaleArgumentIds, localeLhl, alreadyLoggedPrunes) {
  /** @type {LhlMessages} */
  const remainingMessages = {};

  for (const [messageId, {message}] of Object.entries(localeLhl)) {
    const goldenArgumentIds = goldenLocaleArgumentIds[messageId];
    if (!goldenArgumentIds) {
      logRemoval(alreadyLoggedPrunes, messageId, 'it is no longer found in Lighthouse');
      continue;
    }

    if (!equalArguments(goldenArgumentIds, message)) {
      logRemoval(alreadyLoggedPrunes, messageId,
          'its ICU arguments don\'t match the current version of the message');
      continue;
    }

    remainingMessages[messageId] = {message};
  }

  return remainingMessages;
}

/**
 * Returns a copy of `goldenLhl` with the messages replaced with a sorted list of
 * argument ids found in each message.
 * @param {LhlMessages} goldenLhl
 * @return {Record<string, Array<string>>}
 */
function getGoldenLocaleArgumentIds(goldenLhl) {
  /** @type {Record<string, Array<string>>} */
  const goldenLocaleArgumentIds = {};

  for (const [messageId, {message}] of Object.entries(goldenLhl)) {
    const parsedMessage = MessageParser.parse(message);
    const goldenArgumentElements = collectAllCustomElementsFromICU(parsedMessage.elements);
    const goldenArgumentIds = [...goldenArgumentElements.keys()].sort();

    goldenLocaleArgumentIds[messageId] = goldenArgumentIds;
  }

  return goldenLocaleArgumentIds;
}

/**
 * For every locale LHL file, remove any messages that don't have a matching
 * message in `en-US.json`. There is a matching golden message if:
 * - there is a golden message with the same message id and
 * - that message has the same ICU arguments (by count and argument ids).
 *
 * If a new `en-US.json` message is sufficiently different so that existing
 * translations should no longer be used, it's up to the author to remove them
 * (e.g. by picking a new message id).
 */
function pruneObsoleteLhlMessages() {
  const goldenLhl = require('../../lib/i18n/locales/en-US.json');
  const goldenLocaleArgumentIds = getGoldenLocaleArgumentIds(goldenLhl);

  // Find all locale files, ignoring self-generated en-US, en-XL, and ctc files.
  const ignore = [
    '**/.ctc.json',
    '**/en-US.json',
    '**/en-XL.json',
  ];
  const globPattern = 'lighthouse-core/lib/i18n/locales/**/+([-a-zA-Z0-9]).json';
  const lhRoot = `${__dirname}/../../../`;
  const localePaths = glob.sync(globPattern, {
    ignore,
    cwd: lhRoot,
  });

  /** @type {Set<string>} */
  const alreadyLoggedPrunes = new Set();
  for (const localePath of localePaths) {
    const absoluteLocalePath = path.join(lhRoot, localePath);
    // readFileSync so that the file is pulled again once updated by a collect-strings run
    const localeLhl = JSON.parse(fs.readFileSync(absoluteLocalePath, 'utf-8'));
    const prunedLocale = pruneLocale(goldenLocaleArgumentIds, localeLhl, alreadyLoggedPrunes);

    const stringified = JSON.stringify(prunedLocale, null, 2) + '\n';
    fs.writeFileSync(absoluteLocalePath, stringified);
  }
}

module.exports = {
  pruneObsoleteLhlMessages,

  // Exported for testing.
  getGoldenLocaleArgumentIds,
  pruneLocale,
};
