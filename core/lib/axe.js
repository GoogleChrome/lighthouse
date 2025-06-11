/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import {createRequire} from 'module';

// This is removed by esbuild (if minified), because the only usage is to resolve a module path
// but that is replaced by the inline-fs plugin, leaving `require` unused.
const require = /* #__PURE__ */ createRequire(import.meta.url);
const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

export {
  axeSource,
};
