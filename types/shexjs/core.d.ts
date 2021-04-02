/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

declare module '@shexjs/core' {
  import {N3db, Report, Schema} from "@shexjs";
  export module Util {
    function makeN3DB(data: string | import('n3').Store): N3db;
  }

  export module Validator {
    function construct(shapes: Schema): {
      validate(db: N3db, params: Array<{ shape: string, node: string }>): Report;
    };
  }
}
