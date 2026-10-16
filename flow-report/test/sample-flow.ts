/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';

export const flowResult: LH.FlowResult = JSON.parse(
  fs.readFileSync(
    `${import.meta.dirname}/../../core/test/fixtures/user-flows/reports/sample-flow-result.json`,
    'utf-8'
  )
);
