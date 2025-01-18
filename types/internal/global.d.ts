/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Most of our files use the global `LH` namespace to access our types.
 * This file allows us to use the global namespace while iteratively converting files to use direct type imports.
 * TODO: Remove this file and import all types directly.
 */

export * from '../lh.js';

export as namespace LH;
