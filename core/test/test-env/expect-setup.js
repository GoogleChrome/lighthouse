/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {expect} from 'expect';

import * as format from '../../../shared/localization/format.js';

// TODO: the `message` value of these matchers seems to be ignored. Ex:
//
//        expect({a: 'A'}).toMatchObject({
//          a: expect.toBeDisplayString('B'),
//        });
//
// Error: expect(received).toMatchObject(expected)
// - Expected  - 1
// + Received  + 1
//
//   Object {
// -   "a": toBeDisplayString<B>,
// +   "a": "A",
//   }

expect.extend({
  toBeDisplayString(received, expected) {
    if (!format.isIcuMessage(received)) {
      const message = () =>
      [
        `${this.utils.matcherHint('.toBeDisplayString')}\n`,
        `Expected object to be an ${this.utils.printExpected('LH.IcuMessage')}`,
        `Received ${typeof received}`,
        `  ${this.utils.printReceived(received)}`,
      ].join('\n');

      return {message, pass: false};
    }

    const actual = format.getFormatted(received, 'en-US');
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

    return {message, pass};
  },
  toBeApproximately(received, expected, precision = 2) {
    let pass = false;
    let expectedDiff = 0;
    let receivedDiff = 0;

    if (received === Infinity && expected === Infinity) {
      pass = true; // Infinity - Infinity is NaN
    } else if (received === -Infinity && expected === -Infinity) {
      pass = true; // -Infinity - -Infinity is NaN
    } else {
      expectedDiff = Math.pow(10, -precision) / 2;
      receivedDiff = Math.abs(expected - received);
      pass = receivedDiff < expectedDiff;
    }

    const message = () =>
      [
        `${this.utils.matcherHint('.toBeDisplayString')}\n`,
        `Expected number to be close to:`,
        `  ${this.utils.printExpected(expected)}`,
        `Received:`,
        `  ${this.utils.printReceived(received)}`,
      ].join('\n');

    return {message, pass};
  },
  /**
    * Asserts that an inspectable promise created by makePromiseInspectable is currently resolved or rejected.
    * This is useful for situations where we want to test that we are actually waiting for a particular event.
    *
    * @param {ReturnType<import('../test-utils.js')['makePromiseInspectable']>} received
    * @param {string} failureMessage
    */
  toBeDone(received, failureMessage) {
    const pass = received.isDone();

    const message = () =>
      [
        `${this.utils.matcherHint('.toBeDone')}\n`,
        `Expected promise to be resolved: ${this.utils.printExpected(failureMessage)}`,
        `  ${this.utils.printReceived(received.getDebugValues())}`,
      ].join('\n');

    return {message, pass};
  },
});
