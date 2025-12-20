/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

declare module 'http-link-header' {
  export interface Reference {
    uri: string;
    rel: string;
    [index: string]: string;
  }
  export interface Link {
      refs: Reference[];
      has(attribute: string, value: string): boolean;
      get(attribute: string, value: string): Array<Reference>;
      rel(value: string): Reference;
      set(ref: Reference): Reference;
  }
  export function parse(header: string): Link;
}
