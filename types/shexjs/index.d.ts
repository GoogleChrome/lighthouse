/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

declare module '@shexjs' {
  export type N3db = any;

  export interface ReportItem {
    type: string;
    property?: string;
    node?: string;
    shape?: string;
    unexpectedTriples?: Array<{ predicate?: string }>;
    triple?: { subject?: string };
    ctx?: { predicate?: string };
    code?: string;
    constraint?: { predicate?: string };
    errors: Array<ReportItem>;
  }

  export type Report = ReportItem | Array<ReportItem>;

  export interface TripleConstraint {
    type: 'TripleConstraint';
    predicate: string;
    annotations?: Array<{
      predicate: string;
      object: { value: string };
    }>;
    [propName: string]: any;
  }

  export interface TargetShape {
    type: 'Shape';
    id: string;
    expression: TripleConstraint | {
      type: string;
      expressions: Array<TripleConstraint>;
    };
    [propName: string]: any;
  }

  export interface IntermediateShape {
    type: string;
    shapeExprs: Array<Shape>;
    id: string;
    [propName: string]: any;
  }

  export type Shape = TargetShape | IntermediateShape;

  export interface Schema {
    type: string;
    shapes: Array<Shape>;
  }
}
