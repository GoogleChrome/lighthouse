/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * A minimal type for Node's `Buffer` to avoid importing all Node types for
 * atob/btoa fallback for testing `text-encoding.js`.
 */

declare global {
  class Buffer {
    static from(str: string, encoding?: string): Buffer;
    toString(encoding?: string): string;
  }
}

export {}
