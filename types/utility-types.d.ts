/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

declare module Util {
  /** Make properties K in T optional. */
  type MakeOptional<T, K extends keyof T> = {
    [P in Exclude<keyof T, K>]: T[P]
  } & {
    [P in K]+?: T[P]
  }

  /** An object with the keys in the union K mapped to themselves as values. */
  type SelfMap<K extends string> = {
    [P in K]: P;
  };

  /** Make optional all properties on T and any properties on object properties of T. */
  type RecursivePartial<T> =
    // Recurse into arrays and tuples: elements aren't (newly) optional, but any properties they have are.
    T extends (infer U)[] ? RecursivePartial<U>[] :
    // Recurse into objects: properties and any of their properties are optional.
    T extends object ? {[P in keyof T]?: RecursivePartial<T[P]>} :
    // Strings, numbers, etc. (terminal types) end here.
    T;

  /** Recursively makes all properties of T read-only. */
  type Immutable<T> =
    T extends Function ? T :
    T extends Array<infer R> ? ImmutableArray<R> :
    T extends Map<infer K, infer V> ? ImmutableMap<K, V> :
    T extends Set<infer M> ? ImmutableSet<M> :
    T extends object ? ImmutableObject<T> :
    T

  // Intermediate immutable types. Prefer e.g. Immutable<Set<T>> over direct use.
  type ImmutableArray<T> = ReadonlyArray<Immutable<T>>;
  type ImmutableMap<K, V> = ReadonlyMap<Immutable<K>, Immutable<V>>;
  type ImmutableSet<T> = ReadonlySet<Immutable<T>>;
  type ImmutableObject<T> = {
    readonly [K in keyof T]: Immutable<T[K]>;
  };

  /**
   * Exclude void from T
   */
  type NonVoid<T> = T extends void ? never : T;

  /** Remove properties K from T. */
  type StrictOmit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

  /** Obtain the type of the first parameter of a function. */
  type FirstParamType<T extends (arg1: any, ...args: any[]) => any> =
    T extends (arg1: infer P, ...args: any[]) => any ? P : never;

  /**
   * If `S` is a kebab-style string `S`, convert to camelCase.
   */
  type KebabToCamelCase<S> =
    S extends `${infer T}-${infer U}` ?
    `${T}${Capitalize<KebabToCamelCase<U>>}` :
    S

  /** Returns T with any kebab-style property names rewritten as camelCase. */
  type CamelCasify<T> = {
    [K in keyof T as KebabToCamelCase<K>]: T[K];
  }
}

export default Util;
