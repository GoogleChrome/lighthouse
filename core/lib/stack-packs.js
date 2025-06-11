/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import log from 'lighthouse-logger';
import stackPacks from 'lighthouse-stack-packs';

import * as i18n from './i18n/i18n.js';

/**
 * Pairs consisting of a stack pack's ID and the set of stacks needed to be
 * detected in a page to display that pack's advice.
 * @type {Array<{packId: string, requiredStacks: Array<string>}>}
 */
const stackPacksToInclude = [
  {
    packId: 'gatsby',
    requiredStacks: ['js:gatsby'],
  },
  {
    packId: 'wordpress',
    requiredStacks: ['js:wordpress'],
  },
  {
    packId: 'wix',
    requiredStacks: ['js:wix'],
  },
  {
    packId: 'wp-rocket',
    requiredStacks: ['js:wp-rocket'],
  },
  {
    packId: 'ezoic',
    requiredStacks: ['js:ezoic'],
  },
  {
    packId: 'drupal',
    requiredStacks: ['js:drupal'],
  },
  {
    packId: 'nitropack',
    requiredStacks: ['js:nitropack'],
  },
  {
    packId: 'amp',
    requiredStacks: ['js:amp'],
  },
  {
    packId: 'magento',
    requiredStacks: ['js:magento'],
  },
  {
    packId: 'octobercms',
    requiredStacks: ['js:octobercms'],
  },
  {
    packId: 'joomla',
    requiredStacks: ['js:joomla'],
  },
  {
    packId: 'next.js',
    requiredStacks: ['js:next'],
  },
  {
    packId: 'nuxt',
    requiredStacks: ['js:nuxt'],
  },
  {
    packId: 'angular',
    requiredStacks: ['js:angular'],
  },
  {
    packId: 'react',
    requiredStacks: ['js:react'],
  },
];

/**
 * Returns all packs that match the stacks found in the page.
 * @param {LH.Artifacts['Stacks']|undefined} pageStacks
 * @return {LH.RawIcu<Array<LH.Result.StackPack>>}
 */
function getStackPacks(pageStacks) {
  if (!pageStacks) return [];

  /** @type {LH.RawIcu<Array<LH.Result.StackPack>>} */
  const packs = [];

  for (const pageStack of pageStacks) {
    const stackPackToIncl = stackPacksToInclude.find(stackPackToIncl =>
      stackPackToIncl.requiredStacks.includes(`${pageStack.detector}:${pageStack.id}`));
    if (!stackPackToIncl) {
      continue;
    }

    // Grab the full pack definition.
    const matchedPack = stackPacks.find(pack => pack.id === stackPackToIncl.packId);
    if (!matchedPack) {
      log.warn('StackPacks',
        `'${stackPackToIncl.packId}' stack pack was matched but is not found in stack-packs lib`);
      continue;
    }

    // Create i18n handler to get translated strings.
    const str_ = i18n.createIcuMessageFn(
      `node_modules/lighthouse-stack-packs/packs/${matchedPack.id}.js`,
      matchedPack.UIStrings
    );

    /** @type {Record<string, LH.IcuMessage>} */
    const descriptions = {};
    /** @type {Record<string, string>} */
    const UIStrings = matchedPack.UIStrings;

    // Convert all strings into the correct translation.
    for (const key in UIStrings) {
      if (UIStrings[key]) {
        descriptions[key] = str_(UIStrings[key]);
      }
    }

    packs.push({
      id: matchedPack.id,
      title: matchedPack.title,
      iconDataURL: matchedPack.icon,
      descriptions,
    });
  }

  return packs.sort((a, b) => {
    const aVal = stackPacksToInclude.findIndex(p => p.packId === a.id);
    const bVal = stackPacksToInclude.findIndex(p => p.packId === b.id);
    return aVal - bVal;
  });
}

export {
  getStackPacks,
  stackPacksToInclude,
};
