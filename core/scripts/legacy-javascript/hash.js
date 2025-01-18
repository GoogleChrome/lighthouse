/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import crypto from 'crypto';

import {LH_ROOT} from '../../../shared/root.js';

const scriptDir = `${LH_ROOT}/core/scripts/legacy-javascript`;

export function makeHash() {
  return crypto
    .createHash('sha256')
    .update(fs.readFileSync(`${scriptDir}/yarn.lock`, 'utf8'))
    .update(fs.readFileSync(`${scriptDir}/run.js`, 'utf8'))
    .update(fs.readFileSync(`${scriptDir}/main.js`, 'utf8'))
    /* eslint-disable max-len */
    .update(fs.readFileSync(`${LH_ROOT}/core/audits/byte-efficiency/legacy-javascript.js`, 'utf8'))
    /* eslint-enable max-len */
    .digest('hex');
}
