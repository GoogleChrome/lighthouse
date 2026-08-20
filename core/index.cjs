/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @typedef ExportType
 * @property {typeof import('./index.js')['startFlow']} startFlow
 * @property {typeof import('./index.js')['navigation']} navigation
 * @property {typeof import('./index.js')['startTimespan']} startTimespan
 * @property {typeof import('./index.js')['snapshot']} snapshot
 */

/** @type {typeof import('./index.js')['default'] & ExportType} */
const lighthouse = async function lighthouse(...args) {
  const {default: lighthouse} = await import('./index.js');
  return lighthouse(...args);
};

lighthouse.startFlow = async function startFlow(...args) {
  const {startFlow} = await import('./index.js');
  return startFlow(...args);
};

lighthouse.navigation = async function navigation(...args) {
  const {navigation} = await import('./index.js');
  return navigation(...args);
};

lighthouse.startTimespan = async function startTimespan(...args) {
  const {startTimespan} = await import('./index.js');
  return startTimespan(...args);
};

lighthouse.snapshot = async function snapshot(...args) {
  const {snapshot} = await import('./index.js');
  return snapshot(...args);
};

module.exports = lighthouse;
