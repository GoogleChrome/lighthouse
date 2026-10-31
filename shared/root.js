/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';

const LH_ROOT = path.dirname(import.meta.dirname);
const pkg = JSON.parse(fs.readFileSync(`${LH_ROOT}/package.json`, 'utf-8'));
const lighthouseVersion = pkg.version;

export {
  LH_ROOT,
  lighthouseVersion,
};
