/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Compares chromium version strings: 103.0.5017.0
 */

/**
 * @param {string} versionString
 * @return {number[]}
 */
function parseVersion(versionString) {
  const versionParts = versionString.split('.');
  return versionParts.map(Number);
}

/**
 * @param {number[]} versionA
 * @param {number[]} versionB
 */
function compareVersions(versionA, versionB) {
  for (let i = 0; i < versionA.length; i++) {
    if ((versionA[i] ?? 0) > (versionB[i] ?? 0)) return 1;
    if ((versionA[i] ?? 0) < (versionB[i] ?? 0)) return -1;
  }
  return 0;
}

/**
 * Returns false if fails check.
 * @param {{version: string, min?: string, max?: string}} opts
 */
function chromiumVersionCheck(opts) {
  const version = parseVersion(opts.version);
  const min = opts.min && parseVersion(opts.min);
  const max = opts.max && parseVersion(opts.max);
  if (min && compareVersions(version, min) === -1) return false;
  if (max && compareVersions(version, max) === 1) return false;
  return true;
}

export {
  chromiumVersionCheck,
  compareVersions,
};
