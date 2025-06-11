/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

declare module '@stadtlandnetz/rollup-plugin-postprocess' {
  function postprocess(args: Array<[RegExp, string]>): void;
  export = postprocess;
}
