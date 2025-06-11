/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// Our page functions are very sensitive to mangling performed by bundlers. Incorrect
// bundling will certainly result in `yarn test-bundle` or `yarn smoke --runner devtools` failing.
// The bundled lighthouse is a huge beast and hard to debug, so instead we have these smaller bundles
// which are much easier to reason about.

import path from 'path';
import {execFileSync} from 'child_process';

import {LH_ROOT} from '../../shared/root.js';
import {buildBundle} from '../build-bundle.js';

describe('page functions build', () => {
  const testCases = [
    `${LH_ROOT}/build/test/page-functions-test-case-computeBenchmarkIndex.js`,
    `${LH_ROOT}/build/test/page-functions-test-case-getNodeDetails.js`,
    `${LH_ROOT}/build/test/page-functions-test-case-getElementsInDocument.js`,
  ];

  for (const minify of [false, true]) {
    describe(`minify: ${minify}`, () => {
      for (const input of testCases) {
        it(`bundle and evaluate ${path.basename(input)}`, async () => {
          const output = minify ?
            input.replace('.js', '-out.min.js') :
            input.replace('.js', '-out.js');
          await buildBundle(input, output, {minify});
          execFileSync('node', [output]);
        });
      }
    });
  }
});
