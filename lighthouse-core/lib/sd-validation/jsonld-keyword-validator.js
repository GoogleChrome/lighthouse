/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const walkObject = require('./helpers/walk-object.js');

// This list comes from the JSON-LD 1.1 editors draft:
// https://w3c.github.io/json-ld-syntax/#syntax-tokens-and-keywords
const VALID_KEYWORDS = new Set([
  '@base',
  '@container',
  '@context',
  '@graph',
  '@id',
  '@index',
  '@language',
  '@list',
  '@nest',
  '@none',
  '@prefix',
  '@reverse',
  '@set',
  '@type',
  '@value',
  '@version',
  '@vocab',
]);

/**
 * @param {*} json
 * @return {Array<{path: string, message: string}>}
 */
module.exports = function validateJsonLD(json) {
  /** @type {Array<{path: string, message: string}>} */
  const errors = [];

  walkObject(json, (name, value, path) => {
    if (name.startsWith('@') && !VALID_KEYWORDS.has(name)) {
      errors.push({
        path: path.join('/'),
        message: `Unknown keyword "${name}"`,
      });
    }
  });

  return errors;
};
