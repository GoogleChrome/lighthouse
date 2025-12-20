/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * @fileoverview Gathers a list of detected JS libraries and their versions.
 */

/* global window */
/* global d41d8cd98f00b204e9800998ecf8427e_LibraryDetectorTests */

'use strict';

const fs = require('fs');
const libDetectorSource = fs.readFileSync(
  require.resolve('js-library-detector/library/libraries.js'), 'utf8');

/** @typedef {false | {version: string|number|null}} JSLibraryDetectorTestResult */
/**
 * @typedef JSLibraryDetectorTest
 * @property {string} id
 * @property {string} icon
 * @property {string} url
 * @property {string|null} npm npm module name, if applicable to library.
 * @property {function(Window): JSLibraryDetectorTestResult | Promise<JSLibraryDetectorTestResult>} test Returns false if library is not present, otherwise returns an object that contains the library version (set to null if the version is not detected).
 */

/**
 * @typedef JSLibrary
 * @property {string} id
 * @property {string} name
 * @property {string|number|null} version
 * @property {string|null} npm
 */

/**
 * Obtains a list of detected JS libraries and their versions.
 */
/* istanbul ignore next */
async function detectLibraries() {
  /** @type {JSLibrary[]} */
  const libraries = [];

  // d41d8cd98f00b204e9800998ecf8427e_ is a consistent prefix used by the detect libraries
  // see https://github.com/HTTPArchive/httparchive/issues/77#issuecomment-291320900
  /** @type {Record<string, JSLibraryDetectorTest>} */
  // @ts-ignore - injected libDetectorSource var
  const libraryDetectorTests = d41d8cd98f00b204e9800998ecf8427e_LibraryDetectorTests; // eslint-disable-line

  for (const [name, lib] of Object.entries(libraryDetectorTests)) {
    try {
      const result = await lib.test(window);
      if (result) {
        libraries.push({
          id: lib.id,
          name: name,
          version: result.version,
          npm: lib.npm,
        });
      }
    } catch (e) {}
  }

  return libraries;
}

/**
 * @param {LH.Gatherer.PassContext} passContext
 * @return {Promise<LH.Artifacts['Stacks']>}
 */
async function collectStacks(passContext) {
  const expression = `(function () {
    ${libDetectorSource};
    return (${detectLibraries.toString()}());
  })()`;

  /** @type {JSLibrary[]} */
  const jsLibraries = await passContext.driver.evaluateAsync(expression);

  return jsLibraries.map(lib => ({
    detector: /** @type {'js'} */ ('js'),
    id: lib.id,
    name: lib.name,
    version: typeof lib.version === 'number' ? String(lib.version) : (lib.version || undefined),
    npm: lib.npm || undefined,
  }));
}

module.exports = collectStacks;
