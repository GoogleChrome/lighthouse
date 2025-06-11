/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as pruneObsoleteLhlMessages from '../../../scripts/i18n/prune-obsolete-lhl-messages.js';

/**
 * Prune `localeLhl` based on `goldenLhl`.
 * @param {Record<string, {message: string}>} goldenLhl
 * @param {Record<string, {message: string}>} localeLhl
 */
function pruneLocale(goldenLhl, localeLhl) {
  // Suppress logging by adding all message ids to the already-logged set.
  const loggedPrunes = new Set(Object.keys(localeLhl));

  const goldenLocaleArgumentIds = pruneObsoleteLhlMessages.getGoldenLocaleArgumentIds(goldenLhl);
  return pruneObsoleteLhlMessages.pruneLocale(goldenLocaleArgumentIds, localeLhl, loggedPrunes);
}

describe('Prune obsolete translations', () => {
  const goldenLhl = {
    plainString: {
      message: 'Plain string',
    },
    displayValue: {
      message: 'Total size was {totalBytes, number, bytes} KB',
    },
    nestedInPlural: {
      // Ensure nested arguments are parsed and handled.
      // eslint-disable-next-line max-len
      message: '{requestCount, plural, =1 {1 request • {byteCount, number, bytes} KB} other {# requests • {byteCount, number, bytes} KB}}',
    },
  };

  it('removes nothing if the messages are exactly the same', () => {
    // Clone to make sure we aren't getting tricked by references and the object isn't structurally.
    const localeLhl = JSON.parse(JSON.stringify(goldenLhl));

    const prunedLocale = pruneLocale(goldenLhl, localeLhl);
    expect(prunedLocale).toEqual(goldenLhl);
  });

  it('removes nothing if the text differs but the message and argument ids are the same', () => {
    const localeLhl = {
      plainString: {
        message: 'Some other string',
      },
      displayValue: {
        message: 'So we have...{totalBytes, number, bytes} sure, KB, why not',
      },
      nestedInPlural: {
        // eslint-disable-next-line max-len
        message: '{requestCount, plural, =1 {1 llama • {byteCount, number, bytes} KB} other {# llamas • {byteCount, number, bytes} KB}}',
      },
    };

    const prunedLocale = pruneLocale(goldenLhl, localeLhl);
    expect(prunedLocale).toEqual(localeLhl);
  });

  it('removes messages not in the golden LHL', () => {
    const localeLhl = {
      ...goldenLhl,
      obsoleteValue: {
        message: 'string with one {argument}',
      },
    };

    const prunedLocale = pruneLocale(goldenLhl, localeLhl);
    expect(prunedLocale).toEqual(goldenLhl);
  });

  it('removes messages with different arguments than found in the golden LHL', () => {
    const localeLhl = {
      plainString: {
        message: 'Plain string',
      },
      displayValue: {
        message: 'Total size was {differentArgument, number, bytes} KB',
      },
    };

    const prunedLocale = pruneLocale(goldenLhl, localeLhl);
    expect(prunedLocale).toEqual({
      plainString: {
        message: 'Plain string',
      },
    });
  });

  it('removes messages with different number of arguments than found in the golden LHL', () => {
    const localeLhl = {
      plainString: {
        message: 'Plain string',
      },
      displayValue: {
        message: 'Total size was {totalBytes, number, bytes} KB, {salutation}!',
      },
    };

    const prunedLocale = pruneLocale(goldenLhl, localeLhl);
    expect(prunedLocale).toEqual({
      plainString: {
        message: 'Plain string',
      },
    });
  });

  it('removes messages when a nested argument differs from the golden LHL', () => {
    const localeLhl = {
      plainString: {
        message: 'Plain string',
      },
      nestedInPlural: {
        // eslint-disable-next-line max-len
        message: '{requestCount, plural, =1 {1 request • {timeInMs, number, seconds} s} other {# requests • {timeInMs, number, seconds} s}}',
      },
    };

    const prunedLocale = pruneLocale(goldenLhl, localeLhl);
    expect(prunedLocale).toEqual({
      plainString: {
        message: 'Plain string',
      },
    });
  });
});
