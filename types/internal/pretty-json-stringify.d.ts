/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

declare module 'pretty-json-stringify' {
  interface Params {
    tab?: string;
    spaceBeforeColon?: string;
    spaceAfterColon?: string;
    spaceAfterComma?: string;
    spaceInsideObject?: string;
    spaceInsideArray?: string;
    shouldExpand?(obj: Object, level: number, index: string): Boolean;
  }

  function stringify(object: Object, params: Params): string;
  export = stringify;
}
