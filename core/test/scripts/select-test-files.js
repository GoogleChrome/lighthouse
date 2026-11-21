/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview
 * Selection of test files from the positional arguments given to `yarn mocha`.
 */

import path from 'path';

import {LH_ROOT} from '../../../shared/root.js';

/**
 * Picks the test files that match any of the patterns typed on the command line.
 *
 * `allTestFiles` comes from `fs.globSync`, so its separators are `path.sep`.
 * Patterns typed by the user may use `/` on any platform, so both sides are
 * normalized to `path.sep` before comparing.
 *
 * @param {string[]} allTestFiles Paths relative to `LH_ROOT`.
 * @param {string[]} patterns Positional command line arguments.
 * @return {string[]}
 */
function selectTestFiles(allTestFiles, patterns) {
  if (!patterns.length) return allTestFiles;

  const normalizedPatterns = patterns.map(pattern => {
    if (path.isAbsolute(pattern)) {
      // Allows this to work:
      //     yarn mocha /Users/cjamcl/src/lighthouse/core/test/runner-test.js
      return path.relative(LH_ROOT, pattern);
    }

    return path.normalize(pattern);
  });

  return allTestFiles.filter(file => normalizedPatterns.some(pattern => file.includes(pattern)));
}

export {
  selectTestFiles,
};
