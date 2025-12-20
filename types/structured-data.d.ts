/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

declare global {
  module LH {
    module StructuredData {

      export type ValidatorType = "json" | "json-ld" | "json-ld-expand" | "schema-org";
    
      export interface ValidationError {
        message: string;
        /** Property path in the expanded JSON-LD object */
        path?: string;
        validator: ValidatorType;
        lineNumber?: number | null;
        /** Schema.org type URIs of the invalid entity (undefined if type is invalid) */
        validTypes?: Array<string>;
      }

      export interface ExpandedSchemaRepresentationItem {
        [schemaRef: string]: Array<
            string |
            {
              '@id'?: string;
              '@type'?: string;
              '@value'?: string;
            }
          >;
      }

      export type ExpandedSchemaRepresentation =
        | Array<ExpandedSchemaRepresentationItem>
        | ExpandedSchemaRepresentationItem;
    }
  }
}

// empty export to keep file a module
export {};
