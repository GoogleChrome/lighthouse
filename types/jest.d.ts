/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

declare namespace jest {
  interface Matchers<R> {
    /**
     * Jest's `toBeCloseTo()` exposed as an asymmetric matcher. This allows
     * approximate numeric testing within matchers like `toMatchObject()`.
     * The default for `numDigits` is 2.
     */
    toBeApproximately(expected: number, numDigits?: number): R;
    /**
     * Asserts that an inspectable promise created by makePromiseInspectable is currently resolved or rejected.
     * This is useful for situations where we want to test that we are actually waiting for a particular event.
     */
    toBeDone: (failureMessage?: string) => R;
    /**
     * Asserts that an i18n string (using en-US) matches an expected pattern.
     */
    toBeDisplayString: (pattern: RegExp) => R;
  }
}
