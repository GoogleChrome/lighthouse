/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

declare module 'n3' {
  export class Parser {
    constructor(options: any);
    parse(nquads: string): Array<LH.SchemaramaStructuredData.RDF.Quad>;
  }

  export class Store {
    addQuad(quad: LH.SchemaramaStructuredData.RDF.Quad):null;
    getQuads(subject?: LH.SchemaramaStructuredData.RDF.Term | string,
             predicate?: LH.SchemaramaStructuredData.RDF.Term | string,
             object?: LH.SchemaramaStructuredData.RDF.Term | string):Array<LH.SchemaramaStructuredData.RDF.Quad>;
    getSubjects(predicate?: LH.SchemaramaStructuredData.RDF.Term | string,
                object?: LH.SchemaramaStructuredData.RDF.Term | string):
      Array<LH.SchemaramaStructuredData.RDF.NamedNode | LH.SchemaramaStructuredData.RDF.BlankNode>;
  }
}
