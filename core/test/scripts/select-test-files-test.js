/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';
import path from 'path';

import {LH_ROOT} from '../../../shared/root.js';
import {selectTestFiles} from '../scripts/select-test-files.js';

describe('selectTestFiles', () => {
  // `fs.globSync` joins matches with `path.sep`, but the documented invocation
  // (`yarn mocha core/test/audits/seo/robots-txt-test.js`) is written with `/`.
  // On Windows those two do not match as plain strings, which silently selected
  // zero test files.
  const globResults = [
    ['core', 'test', 'audits', 'seo', 'robots-txt-test.js'].join(path.sep),
    ['core', 'test', 'audits', 'seo', 'llms-txt-test.js'].join(path.sep),
    ['shared', 'test', 'util-test.js'].join(path.sep),
  ];

  it('selects a file from a slash-separated pattern', () => {
    const selected = selectTestFiles(globResults, ['core/test/audits/seo/robots-txt-test.js']);
    assert.deepEqual(selected, [globResults[0]]);
  });

  it('selects a file from a pattern using the platform separator', () => {
    const pattern = ['core', 'test', 'audits', 'seo', 'robots-txt-test.js'].join(path.sep);
    const selected = selectTestFiles(globResults, [pattern]);
    assert.deepEqual(selected, [globResults[0]]);
  });

  it('selects every file in a directory from a slash-separated pattern', () => {
    const selected = selectTestFiles(globResults, ['core/test/audits/seo']);
    assert.deepEqual(selected, [globResults[0], globResults[1]]);
  });

  it('selects a file from an absolute pattern', () => {
    const absolute = path.join(LH_ROOT, 'shared', 'test', 'util-test.js');
    const selected = selectTestFiles(globResults, [absolute]);
    assert.deepEqual(selected, [globResults[2]]);
  });

  it('returns every file when no pattern is given', () => {
    assert.deepEqual(selectTestFiles(globResults, []), globResults);
  });
});
