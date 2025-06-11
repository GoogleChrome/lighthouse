/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

declare module 'cssstyle/lib/parsers.js' {
  interface TYPES {
    INTEGER: 1;
    NUMBER: 2;
    LENGTH: 3;
    PERCENT: 4;
    URL: 5;
    COLOR: 6;
    STRING: 7;
    ANGLE: 8;
    KEYWORD: 9;
    NULL_OR_EMPTY_STR: 10;
  }

  export var TYPES: TYPES;
  export function valueType(val: any): TYPES[keyof TYPES] | undefined;
}
