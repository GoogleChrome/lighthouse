
/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Typescript does not allow us to import an entire module via JSDOC so we need to import type modules via regular imports.
 * This empty module will be served to any JS file that needs to import our global type module.
 */

export {};
