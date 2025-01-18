/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';

import glob from 'glob';
import MessageParser from '@formatjs/icu-messageformat-parser';

import {collectAllCustomElementsFromICU, escapeIcuMessage} from '../../../shared/localization/format.js';
import {LH_ROOT} from '../../../shared/root.js';
import {readJson} from '../../test/test-utils.js';

/** @typedef {Record<string, {message: string}>} LhlMessages */

/**
 * Returns whether the string `lhlMessage` has ICU arguments matching the
 * already extracted `goldenArgumentIds`. Assumes `goldenArgumentIds` is sorted.
 * @param {Array<string>} goldenArgumentIds
 * @param {string} lhlMessage
 * @return {boolean}
 */
function equalArguments(goldenArgumentIds, lhlMessage) {
  const parsedMessageElements = MessageParser.parse(escapeIcuMessage(lhlMessage), {
    ignoreTag: true,
  });
  const lhlArgumentElements = collectAllCustomElementsFromICU(parsedMessageElements);
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
    const parsedMessageElements = MessageParser.parse(escapeIcuMessage(message), {ignoreTag: true});
    const goldenArgumentElements = collectAllCustomElementsFromICU(parsedMessageElements);
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
  const goldenLhl = readJson('shared/localization/locales/en-US.json');
  const goldenLocaleArgumentIds = getGoldenLocaleArgumentIds(goldenLhl);

  // Find all locale files, ignoring self-generated en-US, en-XL, and ctc files.
  const ignore = [
    '**/.ctc.json',
    '**/en-US.json',
    '**/en-XL.json',
  ];
  const globPattern = 'shared/localization/locales/**/+([-a-zA-Z0-9]).json';
  const localePaths = glob.sync(globPattern, {
    ignore,
    cwd: LH_ROOT,
  });

  /** @type {Set<string>} */
  const alreadyLoggedPrunes = new Set();
  for (const localePath of localePaths) {
    const absoluteLocalePath = path.join(LH_ROOT, localePath);
    // Re-read data so that the file is pulled again once updated by a collect-strings run.
    const localeLhl = readJson(absoluteLocalePath);
    const prunedLocale = pruneLocale(goldenLocaleArgumentIds, localeLhl, alreadyLoggedPrunes);

    const stringified = JSON.stringify(prunedLocale, null, 2) + '\n';
    fs.writeFileSync(absoluteLocalePath, stringified);
  }
}

export {
  pruneObsoleteLhlMessages,

  // Exported for testing.
  getGoldenLocaleArgumentIds,
  pruneLocale,
};
