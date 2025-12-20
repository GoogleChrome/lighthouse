/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const assert = require('assert').strict;
const HreflangAudit = require('../../../audits/seo/hreflang.js');

/* eslint-env jest */

describe('SEO: Document has valid hreflang code', () => {
  it('fails when language code provided in hreflang via link element is invalid', () => {
    const artifacts = {
      LinkElements: [
        {rel: 'alternate', hreflang: 'xx1', href: 'http://example.com/', source: 'headers'},
        {rel: 'alternate', hreflang: 'XX-be', href: 'http://example.com/', source: 'headers'},
        {rel: 'alternate', hreflang: 'XX-be-Hans', href: 'http://example.com/', source: 'head'},
        {rel: 'alternate', hreflang: '  es', href: 'http://example.com/', source: 'head'},
        {rel: 'alternate', hreflang: '  es', href: 'http://example.com/', source: 'headers'},
      ],
    };

    const auditResult = HreflangAudit.audit(artifacts);
    assert.equal(auditResult.score, 0);
    assert.equal(auditResult.details.items.length, 5);
  });

  it('succeeds when language code provided in hreflang via body is invalid', () => {
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

      const auditResult = HreflangAudit.audit(artifacts);
      assert.equal(auditResult.score, 1);
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
            href: 'https://example.com',
          },
        ],
      };

      const auditResult = HreflangAudit.audit(artifacts);
      assert.equal(auditResult.score, 1);
      inHead = !inHead;
    }
  });

  it('succeeds when there are no rel=alternate link elements nor headers', () => {
    assert.equal(HreflangAudit.audit({LinkElements: []}).score, 1);
  });

  it('returns all failing items', () => {
    const artifacts = {
      LinkElements: [
        {rel: 'alternate', hreflang: 'xx1', href: 'http://xx1.example.com/', source: 'headers'},
        {rel: 'alternate', hreflang: 'xx2', href: 'http://xx2.example.com/', source: 'headers'},
        {rel: 'alternate', hreflang: 'xx3', href: 'http://xx3.example.com/', source: 'head'},
        {rel: 'alternate', hreflang: 'xx4', href: 'http://xx4.example.com/', source: 'head'},
      ],
    };

    const auditResult = HreflangAudit.audit(artifacts);
    assert.equal(auditResult.score, 0);
    assert.equal(auditResult.details.items.length, 4);
  });
});
