/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import lighthouseStackPacksDep from 'lighthouse-stack-packs';

import {initializeConfig} from '../../config/config.js';
import {stackPacksToInclude, getStackPacks} from '../../lib/stack-packs.js';

async function getAuditIds() {
  const {resolvedConfig} = await initializeConfig('navigation');
  return resolvedConfig.audits.map(a => a.implementation.meta.id);
}

describe('stack-packs lib', () => {
  it('there are no packs without detectors', () => {
    const result = lighthouseStackPacksDep
      .filter(p => !stackPacksToInclude.find(p2 => p2.packId === p.id))
      .map(p => p.id);
    expect(result).toEqual([]);
  });

  it('returns packs from page stacks', () => {
    expect(getStackPacks([])).toEqual([]);
    expect(getStackPacks([{detector: 'js', id: 'i-dont-know-you'}])).toEqual([]);

    const packs = getStackPacks([
      {detector: 'js', id: 'wordpress'},
      {detector: 'js', id: 'react'},
    ]);

    expect(packs.map(pack => pack.id)).toEqual(['wordpress', 'react']);
  });

  it('returns packs from page stacks in order defined by us', () => {
    const packs = getStackPacks([
      {detector: 'js', id: 'react'},
      {detector: 'js', id: 'wordpress'},
    ]);

    expect(packs.map(pack => pack.id)).toEqual(['wordpress', 'react']);
  });
});

// These tests summarize the contents of the lighthouse-stack-packs package.
describe('lighthouse-stack-packs dep', () => {
  it('snapshot packs', () => {
    expect(lighthouseStackPacksDep.map((p) => p.id)).toMatchInlineSnapshot(`
Array [
  "amp",
  "angular",
  "drupal",
  "ezoic",
  "gatsby",
  "joomla",
  "magento",
  "next.js",
  "nitropack",
  "nuxt",
  "octobercms",
  "react",
  "wix",
  "wordpress",
  "wp-rocket",
]
`);
  });

  it('snapshot keys for each pack', () => {
    const result = lighthouseStackPacksDep.map(p => {
      return {id: p.id, keys: Object.keys(p.UIStrings)};
    });
    // Keys should only be added, not removed.
    expect(result).toMatchInlineSnapshot(`
Array [
  Object {
    "id": "amp",
    "keys": Array [
      "modern-image-formats",
      "offscreen-images",
      "render-blocking-resources",
      "unminified-css",
      "efficient-animated-content",
      "uses-responsive-images",
    ],
  },
  Object {
    "id": "angular",
    "keys": Array [
      "total-byte-weight",
      "unminified-warning",
      "unused-javascript",
      "uses-responsive-images",
      "uses-rel-preload",
      "dom-size",
    ],
  },
  Object {
    "id": "drupal",
    "keys": Array [
      "unused-css-rules",
      "modern-image-formats",
      "offscreen-images",
      "total-byte-weight",
      "render-blocking-resources",
      "unminified-css",
      "unminified-javascript",
      "efficient-animated-content",
      "unused-javascript",
      "uses-long-cache-ttl",
      "uses-optimized-images",
      "uses-text-compression",
      "uses-responsive-images",
      "prioritize-lcp-image",
      "server-response-time",
      "redirects",
      "uses-rel-preconnect",
    ],
  },
  Object {
    "id": "ezoic",
    "keys": Array [
      "unused-css-rules",
      "modern-image-formats",
      "offscreen-images",
      "render-blocking-resources",
      "unminified-css",
      "unminified-javascript",
      "uses-long-cache-ttl",
      "uses-optimized-images",
      "uses-responsive-images",
      "server-response-time",
      "uses-rel-preconnect",
      "uses-rel-preload",
      "font-display",
    ],
  },
  Object {
    "id": "gatsby",
    "keys": Array [
      "unused-css-rules",
      "modern-image-formats",
      "offscreen-images",
      "render-blocking-resources",
      "unused-javascript",
      "uses-long-cache-ttl",
      "uses-optimized-images",
      "uses-responsive-images",
      "prioritize-lcp-image",
    ],
  },
  Object {
    "id": "joomla",
    "keys": Array [
      "unused-css-rules",
      "modern-image-formats",
      "offscreen-images",
      "total-byte-weight",
      "render-blocking-resources",
      "unminified-css",
      "unminified-javascript",
      "efficient-animated-content",
      "unused-javascript",
      "uses-long-cache-ttl",
      "uses-optimized-images",
      "uses-text-compression",
      "uses-responsive-images",
      "server-response-time",
    ],
  },
  Object {
    "id": "magento",
    "keys": Array [
      "modern-image-formats",
      "offscreen-images",
      "disable-bundling",
      "unminified-css",
      "unminified-javascript",
      "unused-javascript",
      "uses-optimized-images",
      "server-response-time",
      "uses-rel-preconnect",
      "uses-rel-preload",
      "critical-request-chains",
      "font-display",
    ],
  },
  Object {
    "id": "next.js",
    "keys": Array [
      "unused-css-rules",
      "modern-image-formats",
      "offscreen-images",
      "render-blocking-resources",
      "unused-javascript",
      "uses-long-cache-ttl",
      "uses-optimized-images",
      "uses-text-compression",
      "uses-responsive-images",
      "user-timings",
      "prioritize-lcp-image",
      "unsized-images",
    ],
  },
  Object {
    "id": "nitropack",
    "keys": Array [
      "unused-css-rules",
      "modern-image-formats",
      "offscreen-images",
      "render-blocking-resources",
      "unminified-css",
      "unminified-javascript",
      "unused-javascript",
      "uses-long-cache-ttl",
      "uses-optimized-images",
      "uses-text-compression",
      "uses-responsive-images",
      "dom-size",
      "font-display",
    ],
  },
  Object {
    "id": "nuxt",
    "keys": Array [
      "modern-image-formats",
      "offscreen-images",
      "uses-optimized-images",
      "uses-responsive-images",
      "prioritize-lcp-image",
      "unsized-images",
    ],
  },
  Object {
    "id": "octobercms",
    "keys": Array [
      "unused-css-rules",
      "modern-image-formats",
      "offscreen-images",
      "total-byte-weight",
      "render-blocking-resources",
      "unminified-css",
      "unminified-javascript",
      "efficient-animated-content",
      "unused-javascript",
      "uses-long-cache-ttl",
      "uses-optimized-images",
      "uses-text-compression",
      "uses-responsive-images",
      "server-response-time",
    ],
  },
  Object {
    "id": "react",
    "keys": Array [
      "unminified-css",
      "unminified-javascript",
      "unused-javascript",
      "server-response-time",
      "redirects",
      "user-timings",
      "dom-size",
    ],
  },
  Object {
    "id": "wix",
    "keys": Array [
      "modern-image-formats",
      "render-blocking-resources",
      "efficient-animated-content",
      "unused-javascript",
      "server-response-time",
    ],
  },
  Object {
    "id": "wordpress",
    "keys": Array [
      "unused-css-rules",
      "modern-image-formats",
      "offscreen-images",
      "total-byte-weight",
      "render-blocking-resources",
      "unminified-css",
      "unminified-javascript",
      "efficient-animated-content",
      "unused-javascript",
      "uses-long-cache-ttl",
      "uses-optimized-images",
      "uses-text-compression",
      "uses-responsive-images",
      "server-response-time",
    ],
  },
  Object {
    "id": "wp-rocket",
    "keys": Array [
      "unused-css-rules",
      "modern-image-formats",
      "unused-javascript",
      "render-blocking-resources",
      "unminified-css",
      "unminified-javascript",
      "uses-optimized-images",
      "uses-rel-preconnect",
      "uses-rel-preload",
      "offscreen-images",
    ],
  },
]
`);
  });

  // Keys for plugin audits are allowed in this package.
  // Make sure none are typos of core audits.
  it('snapshot unrecognized keys', async () => {
    const auditIds = await getAuditIds();

    const unrecognizedKeys = new Set();
    for (const pack of lighthouseStackPacksDep) {
      for (const key in pack.UIStrings) {
        if (!auditIds.includes(key)) unrecognizedKeys.add(key);
      }
    }

    expect([...unrecognizedKeys]).toMatchInlineSnapshot(`
      Array [
        "unminified-warning",
        "uses-rel-preload",
        "disable-bundling",
      ]
    `);
  });
});
