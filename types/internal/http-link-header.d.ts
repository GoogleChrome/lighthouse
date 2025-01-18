/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
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
