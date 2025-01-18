/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview
 *    - sets global.expect
 *    - configures mocha to use jest-snapshot
 *    - symlinks `fixtures/config-plugins/lighthouse-plugin-simple` to a place where the default
 *      config module resolution will find it
 *    - saves failed test results if env LH_FAILED_TESTS_FILE is set
 */

/* eslint-disable import/order */

// TODO: all of test-env should be moved to a root test folder

import fs from 'fs';

import path from 'path';
import {expect} from 'expect';
import * as td from 'testdouble';
import jestSnapshot from 'jest-snapshot';

import {LH_ROOT} from '../../../shared/root.js';
import './expect-setup.js';
import {timers} from './fake-timers.js';

const {SnapshotState, toMatchSnapshot, toMatchInlineSnapshot} = jestSnapshot;

// Use consistent TZ across testing environments.
// Timezone is used to construct date strings.
process.env.TZ = 'UTC';

// Expected to be set by lh-env.js
process.env.NODE_TEST = 'test';

global.expect = expect;

// Force marky to not use Node's performance, which is messed up by fake timers.
const performance = global.performance;
// @ts-expect-error
global.performance = undefined;
// @ts-expect-error: no types
await import('marky');
global.performance = performance;

/** @type {Map<string, SnapshotState['prototype']>} */
const snapshotStatesByTestFile = new Map();
let snapshotTestFailed = false;

/**
 * @param {string} testFile
 */
function getSnapshotState(testFile) {
  // For every test file, persist the same snapshot state object so there is
  // not a read/write per snapshot access/change, but one per file.
  let snapshotState = snapshotStatesByTestFile.get(testFile);
  if (snapshotState) return snapshotState;

  const snapshotDir = path.join(path.dirname(testFile), '__snapshots__');
  const snapshotFile = path.join(snapshotDir, path.basename(testFile) + '.snap');
  snapshotState = new SnapshotState(snapshotFile, {
    updateSnapshot: process.env.SNAPSHOT_UPDATE ? 'all' : 'none',
    prettierPath: '',
    snapshotFormat: {},
  });
  snapshotStatesByTestFile.set(testFile, snapshotState);
  return snapshotState;
}

/**
 * @param {Mocha.Test} test
 * @return {string}
 */
function makeTestTitle(test) {
  /** @type {Mocha.Test | Mocha.Suite} */
  let next = test;
  const title = [];

  while (next.parent) {
    title.push(next.title);
    next = next.parent;
  }

  return title.reverse().join(' ');
}

expect.extend({
  /**
   * @param {any} actual
   */
  toMatchSnapshot(actual) {
    const test = mochaCurrentTest;
    if (!test.file) throw new Error('unexpected value');

    const title = makeTestTitle(test);
    const snapshotState = getSnapshotState(test.file);

    const context = {snapshotState, currentTestName: title};
    // @ts-expect-error - this is enough for snapshots to work.
    const matcher = toMatchSnapshot.bind(context);
    const result = matcher(actual);
    // @ts-expect-error - not sure why these types are so wrong
    if (!result.pass) snapshotTestFailed = true;
    return result;
  },
  /**
   * @param {any} actual
   * @param {any} expected
   */
  toMatchInlineSnapshot(actual, expected) {
    const test = mochaCurrentTest;
    if (!test.file) throw new Error('unexpected value');

    const title = makeTestTitle(test);
    const snapshotState = getSnapshotState(test.file);
    const context = {snapshotState, currentTestName: title};
    // @ts-expect-error - this is enough for snapshots to work.
    const matcher = toMatchInlineSnapshot.bind(context);
    // @ts-expect-error - not sure why these types are so wrong
    const result = matcher(actual, expected);
    // @ts-expect-error - not sure why these types are so wrong
    if (!result.pass) snapshotTestFailed = true;
    return result;
  },
});

const testPlugins = [
  'lighthouse-plugin-no-category',
  'lighthouse-plugin-no-groups',
  'lighthouse-plugin-simple',
];

/** @type {Mocha.Test} */
let mochaCurrentTest;

/** @type {any[]} */
const failedTests = [];

const rootHooks = {
  /** @this {Mocha.Context} */
  beforeEach() {
    if (!this.currentTest) throw new Error('unexpected value');

    // Needed so `expect` extension method can access information about the current test.
    mochaCurrentTest = this.currentTest;

    // If a test is retried the snapshot indices will start where the previous attempt left off.
    // This can lead to several problems including the test passing where it should be failing.
    //
    // Jest itself clears the snapshot state on retries although they seem to execute retries after
    // all tests finish and not immediately after the initial test failure.
    // https://github.com/jestjs/jest/pull/8629
    if (this.currentTest.retries() && this.currentTest.file) {
      const snapshotState = getSnapshotState(this.currentTest.file);
      snapshotState.clear();
    }
  },
  /** @this {Mocha.Context} */
  afterEach() {
    if (!this.currentTest) throw new Error('unexpected value');

    const {file, title, state} = this.currentTest;
    if (!file) throw new Error('unexpected value');

    if (state === 'failed') {
      failedTests.push({
        file: path.relative(LH_ROOT, file),
        title,
        error: this.currentTest.err?.stack ?? this.currentTest.err?.toString(),
      });
    }
  },
  // This runs _once_, after all of the tests in the root suite.
  async afterAll() {
    timers.dispose();
    td.reset();

    for (const snapshotState of snapshotStatesByTestFile.values()) {
      // Jest adds `file://` to inline snapshot paths, and uses its own fs module to read things,
      // falling back to fs.readFileSync if not defined. node `fs` does not support
      // protocols in the path specifier, so we remove it here.
      // @ts-expect-error - private property.
      for (const snapshot of snapshotState._inlineSnapshots) {
        snapshot.frame.file = snapshot.frame.file.replace('file://', '');
      }

      snapshotState.save();
    }

    if (!process.env.SNAPSHOT_UPDATE && snapshotTestFailed) {
      process.on('exit', () => {
        console.log('To update snapshots, run again with `yarn mocha -u`');
      });
    }

    if (process.env.LH_FAILED_TESTS_FILE && failedTests.length) {
      fs.writeFileSync(process.env.LH_FAILED_TESTS_FILE, JSON.stringify(failedTests, null, 2));
    }
  },
};

function mochaGlobalSetup() {
  for (const plugin of testPlugins) {
    try {
      fs.symlinkSync(
        `${LH_ROOT}/core/test/fixtures/config-plugins/${plugin}`,
        `${LH_ROOT}/node_modules/${plugin}`
      );
    } catch {
      // Might exist already because process was killed before tests finished.
    }
  }
}

function mochaGlobalTeardown() {
  for (const plugin of testPlugins) {
    fs.unlinkSync(`${LH_ROOT}/node_modules/${plugin}`);
  }
}

export {
  rootHooks,
  mochaGlobalSetup,
  mochaGlobalTeardown,
};
