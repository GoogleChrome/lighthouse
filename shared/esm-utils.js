/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {createRequire} from 'module';

/**
 * Commonjs equivalent of `require.resolve`.
 * @param {string} packageName
 */
function resolveModulePath(packageName) {
  const require = createRequire(import.meta.url);
  return require.resolve(packageName);
}

export {
  resolveModulePath,
};
