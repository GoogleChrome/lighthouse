/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import HreflangAudit from '../../../audits/seo/hreflang.js';

const node = {};

describe('SEO: Document has valid hreflang code', () => {
  it('fails when the language code provided in hreflang via link element is invalid', () => {
    const artifacts = {
      LinkElements: [
        {rel: 'alternate', hreflang: 'xx1', hrefRaw: 'http://example.com/', source: 'headers', node},
        {rel: 'alternate', hreflang: 'XX-be', hrefRaw: 'http://example.com/', source: 'headers', node},
        {rel: 'alternate', hreflang: 'XX-be-Hans', hrefRaw: 'http://example.com/', source: 'head', node},
        {rel: 'alternate', hreflang: '  es', hrefRaw: 'http://example.com/', source: 'head', node},
        {rel: 'alternate', hreflang: '  es', hrefRaw: 'http://example.com/', source: 'headers', node},
      ],
    };

    const {score, details} = HreflangAudit.audit(artifacts);
    assert.equal(score, 0);
    assert.equal(details.items.length, 5);
  });

  it('succeeds when the language code provided in hreflang via body is invalid', () => {
    const hreflangValues = ['xx', 'XX-be', 'XX-be-Hans', '', '  es'];

    for (const hreflangValue of hreflangValues) {
      const artifacts = {
        LinkElements: [
          {
            source: 'body',
            rel: 'alternate',
            hreflang: hreflangValue,
            href: 'https://example.com',
          },
        ],
      };

      const {score} = HreflangAudit.audit(artifacts);
      assert.equal(score, 1);
    }
  });

  it('succeeds when language code provided via head/headers is valid', () => {
    const hreflangValues = ['pl', 'nl-be', 'zh-Hans', 'x-default', 'FR-BE'];

    let inHead = false;
    for (const hreflangValue of hreflangValues) {
      const artifacts = {
        LinkElements: [
          {
            source: inHead ? 'head' : 'headers',
            rel: 'alternate',
            hreflang: hreflangValue,
            hrefRaw: 'https://example.com',
            node,
          },
        ],
      };

      const {score} = HreflangAudit.audit(artifacts);
      assert.equal(score, 1);
      inHead = !inHead;
    }
  });

  it('succeeds when there are no rel=alternate link elements nor headers', () => {
    assert.equal(HreflangAudit.audit({LinkElements: []}).score, 1);
  });

  it('returns all failing items', () => {
    const artifacts = {
      LinkElements: [
        {rel: 'alternate', hreflang: 'xx1', hrefRaw: 'http://xx1.example.com/', source: 'headers', node},
        {rel: 'alternate', hreflang: 'xx2', hrefRaw: 'http://xx2.example.com/', source: 'headers', node},
        {rel: 'alternate', hreflang: 'xx3', hrefRaw: 'http://xx3.example.com/', source: 'head', node},
        {rel: 'alternate', hreflang: 'xx4', hrefRaw: 'http://xx4.example.com/', source: 'head', node},
      ],
    };

    const {score, details} = HreflangAudit.audit(artifacts);
    assert.equal(score, 0);
    assert.equal(details.items.length, 4);
  });

  it('fails when the hreflang url is not fully-qualified', () => {
    const artifacts = {
      LinkElements: [
        {rel: 'alternate', hreflang: 'es', hrefRaw: 'example.com', source: 'head', node},
        {rel: 'alternate', hreflang: 'es', hrefRaw: '//example.com', source: 'headers', node},
      ],
    };

    const {score, details} = HreflangAudit.audit(artifacts);
    assert.equal(score, 0);
    assert.equal(details.items.length, 2);
  });

  it('fails with an invalid language code and a href which is not fully-qualified', () => {
    const artifacts = {
      LinkElements: [
        {rel: 'alternate', hreflang: ' es', hrefRaw: 'example.com', source: 'head', node},
        {rel: 'alternate', hreflang: 'xx1', hrefRaw: '//example.com', source: 'headers', node},
      ],
    };

    const {score} = HreflangAudit.audit(artifacts);
    assert.equal(score, 0);
  });

  it('outputs the reasons for which a hreflang failed', () => {
    const artifacts = {
      LinkElements: [
        {rel: 'alternate', hreflang: '@@', hrefRaw: 'example.com', source: 'head', node},
        {rel: 'alternate', hreflang: 'fr', hrefRaw: 'example.com', source: 'head', node},
        {rel: 'alternate', hreflang: '@@', hrefRaw: 'https://example.com', source: 'head', node},
        {rel: 'alternate', hreflang: 'fr', hrefRaw: 'https://example.com', source: 'head', node},
      ],
    };

    const {details: {items}} = HreflangAudit.audit(artifacts);

    assert.equal(items.length, 3);
    assert.equal(items[0].subItems.items.length, 2);
    assert.equal(items[1].subItems.items.length, 1);

    expect(items[0].subItems.items[0].reason).toBeDisplayString('Unexpected language code');
    expect(items[0].subItems.items[1].reason).toBeDisplayString('Relative href value');
  });
});
