/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * Config file for running source map smokehouse.
 */

// source-maps currently isn't in the default config yet, so we make a new one with it.
// Also, no audits use source-maps yet, and at least one is required for a successful run,
// so `viewport` and its required gatherer `meta-elements` is used.

/** @type {LH.Config.Json} */
module.exports = {
  passes: [{
    passName: 'defaultPass',
    gatherers: [
      'source-maps',
      'meta-elements',
    ],
  }],
  audits: ['viewport'],
};
