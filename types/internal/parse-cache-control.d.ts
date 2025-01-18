/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

declare module 'parse-cache-control' {
  // Follows the potential settings of cache-control, see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control
  interface CacheHeaders {
    'max-age'?: number;
    'must-revalidate'?: boolean;
    'no-cache'?: boolean;
    'no-store'?: boolean;
    'private'?: boolean;
    'stale-while-revalidate'?: boolean;
  }

  function ParseCacheControl(headers?: string): CacheHeaders | null;
  export = ParseCacheControl;
}
