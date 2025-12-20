/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

declare module 'cssstyle/lib/parsers' {
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
