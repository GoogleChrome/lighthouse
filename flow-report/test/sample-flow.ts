/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import {dirname} from 'path';
import {fileURLToPath} from 'url';

export const flowResult: LH.FlowResult = JSON.parse(
  fs.readFileSync(
    // eslint-disable-next-line max-len
    `${dirname(fileURLToPath(import.meta.url))}/../../core/test/fixtures/user-flows/reports/sample-flow-result.json`,
    'utf-8'
  )
);
