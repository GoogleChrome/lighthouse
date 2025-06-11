/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {traceCategories} from '../../core/index.js';

function listTraceCategories() {
  process.stdout.write(JSON.stringify({traceCategories}));
  process.exit(0);
}

export {listTraceCategories};
