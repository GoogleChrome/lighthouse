/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {createRequire} from 'module';
import url from 'url';
import path from 'path';

/**
 * Commonjs equivalent of `require.resolve`.
 * @param {string} packageName
 */
function resolveModulePath(packageName) {
  const require = createRequire(import.meta.url);
  return require.resolve(packageName);
}

/**
 * @param {ImportMeta} importMeta
 */
function getModulePath(importMeta) {
  return url.fileURLToPath(importMeta.url);
}

/**
 * @param {ImportMeta} importMeta
 */
function getModuleDirectory(importMeta) {
  return path.dirname(getModulePath(importMeta));
}

export {
  resolveModulePath,
  getModulePath,
  getModuleDirectory,
};
