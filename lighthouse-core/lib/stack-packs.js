/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const stackPacks = require('../../stack-packs/index.js');
const log = require('lighthouse-logger');

/**
 * Pairs consisting of a stack pack's ID and the set of stacks needed to be
 * detected in a page to display that pack's advice.
 * @type {Array<{packId: string, requiredStacks: Array<string>}>}
 */
const stackPacksToInclude = [
  {
    packId: 'wordpress',
    requiredStacks: ['js:wordpress'],
  },
  {
    packId: 'react',
    requiredStacks: ['js:react'],
  },
  {
    packId: 'angular',
    requiredStacks: ['js:@angular/core'],
  },
  {
    packId: 'amp',
    requiredStacks: ['js:amp'],
  },
  {
    packId: 'magento',
    requiredStacks: ['js:magento'],
  },
];

/**
 * Returns all packs that match the stacks found in the page.
 * @param {LH.Artifacts['Stacks']} pageStacks
 * @return {Array<LH.Result.StackPack>}
 */
function getStackPacks(pageStacks) {
  /** @type {Array<LH.Result.StackPack>} */
  const packs = [];

  for (const pageStack of pageStacks) {
    const stackPackToIncl = stackPacksToInclude.find(stackPackToIncl =>
      stackPackToIncl.requiredStacks.includes(`${pageStack.detector}:${pageStack.id}`));
    if (!stackPackToIncl) {
      continue;
    }

    // Grab the full pack definition
    const matchedPack = stackPacks.find(pack => pack.id === stackPackToIncl.packId);
    if (!matchedPack) {
      log.warn('StackPacks',
        `'${stackPackToIncl.packId}' stack pack was matched but is not found in stack-packs lib`);
      continue;
    }

    packs.push({
      id: matchedPack.id,
      title: matchedPack.title,
      iconDataURL: matchedPack.iconDataURL,
      descriptions: matchedPack.descriptions,
    });
  }

  return packs;
}

module.exports = {
  getStackPacks,
};
