/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

declare global {
  var expect: import('expect').Expect;
  type Mock<T, Y extends unknown[]> = import('jest-mock').Mock<T, Y>;
}

declare module 'expect' {
  interface Matchers<R extends void | Promise<void>, T={}> {
    /**
     * This ensures that a value matches the most recent snapshot with property matchers.
     * Check out [the Snapshot Testing guide](http://facebook.github.io/jest/docs/snapshot-testing.html) for more information.
     */
    // tslint:disable-next-line: no-unnecessary-generics
    toMatchSnapshot<U extends { [P in keyof T]: any }>(propertyMatchers: Partial<U>, snapshotName?: string): R;
    /**
     * This ensures that a value matches the most recent snapshot.
     * Check out [the Snapshot Testing guide](http://facebook.github.io/jest/docs/snapshot-testing.html) for more information.
     */
    toMatchSnapshot(snapshotName?: string): R;
    /**
     * This ensures that a value matches the most recent snapshot with property matchers.
     * Instead of writing the snapshot value to a .snap file, it will be written into the source code automatically.
     * Check out [the Snapshot Testing guide](http://facebook.github.io/jest/docs/snapshot-testing.html) for more information.
     */
    // tslint:disable-next-line: no-unnecessary-generics
    toMatchInlineSnapshot<U extends { [P in keyof T]: any }>(propertyMatchers: Partial<U>, snapshot?: string): R;

    // The following are custom matchers defined in expect-setup.js

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
    toBeDisplayString: (pattern: RegExp | string) => R;
  }
}

export {};
