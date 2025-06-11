/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import process from 'process';

// NODE_ENV is set to test by mocha-setup.js and the smokehouse CLI runner
// CI as a catchall for everything we do in GitHub Actions
const isUnderTest = !!process.env.CI || process.env.NODE_ENV === 'test';

export {
  isUnderTest,
};
