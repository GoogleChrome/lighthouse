/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const fs = require('fs');
const i18n = require('../lib/i18n/i18n.js');
const {default: {toBeCloseTo}} = require('expect/build/matchers.js');

expect.extend({
  toBeDisplayString(received, expected) {
    const actual = i18n.getFormatted(received, 'en-US');
    const pass = expected instanceof RegExp ?
      expected.test(actual) :
      actual === expected;

    const message = () =>
      [
        `${this.utils.matcherHint('.toBeDisplayString')}\n`,
        `Expected object to be a display string matching:`,
        `  ${this.utils.printExpected(expected)}`,
        `Received:`,
        `  ${this.utils.printReceived(actual)}`,
      ].join('\n');

    return {actual, message, pass};
  },

  // Expose toBeCloseTo() so it can be used as an asymmetric matcher.
  toBeApproximately(...args) {
    // If called asymmetrically, a fake matcher `this` object needs to be passed
    // in (see https://github.com/facebook/jest/issues/8295). There's no effect
    // because it's only used for the printing of full failures, which isn't
    // done for asymmetric matchers anyways.
    const thisObj = (this && this.utils) ? this :
        {isNot: false, promise: ''};

    return toBeCloseTo.call(thisObj, ...args);
  },
});

/**
 * Some tests use the result of a LHR processed by our proto serialization.
 * Proto is an annoying dependency to setup, so we allows tests that use it
 * to be skipped when run locally. This makes external contributions simpler.
 *
 * Along with the sample LHR, this function returns jest `it` and `describe`
 * functions that will skip if the sample LHR could not be loaded.
 */
function getProtoRoundTrip() {
  let sampleResultsRoundtripStr;
  let describeIfProtoExists;
  let itIfProtoExists;
  try {
    sampleResultsRoundtripStr =
      fs.readFileSync(__dirname + '/../../proto/sample_v2_round_trip.json', 'utf-8');
    describeIfProtoExists = describe;
    itIfProtoExists = it;
  } catch (err) {
    if (process.env.GITHUB_ACTIONS) {
      throw new Error('sample_v2_round_trip must be generated for CI proto test');
    }
    // Otherwise no proto roundtrip for tests, so skip them.
    // This is fine for running the tests locally.

    itIfProtoExists = it.skip;
    describeIfProtoExists = describe.skip;
  }

  return {
    itIfProtoExists,
    describeIfProtoExists,
    sampleResultsRoundtripStr,
  };
}

module.exports = {
  getProtoRoundTrip,
};
