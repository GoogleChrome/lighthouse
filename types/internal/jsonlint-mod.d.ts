declare module 'jsonlint-mod' {
  export function parse(input: string): unknown;

  interface SchemaIDReference {
    '@id': string;
  }

  interface SchemaSourceItem {
    '@id': string;
    '@type': string;
    'rdfs:label'?: string;
    'rdfs:subClassOf'?: SchemaIDReference | SchemaIDReference[];
    'http://schema.org/domainIncludes'?: SchemaIDReference | SchemaIDReference[];
  }

  interface SchemaTreeItem {
    name: string;
    parent: string[];
  }

  export interface JSONSchemaSource {
    '@graph': SchemaSourceItem[];
  }

  export interface JSONSchemaTree {
    types: SchemaTreeItem[];
    properties: SchemaTreeItem[];
  }
}
