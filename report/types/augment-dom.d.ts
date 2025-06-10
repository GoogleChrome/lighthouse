/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Augment global scope with needed DOM APIs that are newer or not
 * widely supported enough to be in tsc's lib `dom`.
 */

// Import to augment querySelector/querySelectorAll with stricter type checking.
import '../../types/internal/query-selector';
