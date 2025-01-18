/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import Result from './lhr.js';

declare module FlowResult {
  interface Step {
    /** Lighthouse report for this flow step. */
    lhr: Result;
    /** Display name of this flow step. */
    name: string;
  }
}

/**
 * The full output of a Lighthouse flow. Includes a series of Lighthouse runs.
 */
interface FlowResult {
  /** Ordered list of flow steps, each corresponding to a navigation, timespan, or snapshot. */
  steps: FlowResult.Step[];
  /** Display name of this user flow. */
  name: string;
}

export default FlowResult;
