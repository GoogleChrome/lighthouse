/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const LinkTextAudit = require('../../../audits/seo/link-text.js');
const assert = require('assert').strict;

/* eslint-env jest */

describe('SEO: link text audit', () => {
  it('fails when link with non descriptive text is found', () => {
    const invalidLink = {href: 'https://example.com/otherpage.html', text: 'click here', rel: ''};
    const artifacts = {
      URL: {
        finalUrl: 'https://example.com/page.html',
      },
      AnchorElements: [
        {href: 'https://example.com/otherpage.html', text: 'legit link text', rel: ''},
        invalidLink,
        {href: 'https://example.com/otherpage.html', text: 'legit link text', rel: ''},
      ],
    };

    const auditResult = LinkTextAudit.audit(artifacts);
    assert.equal(auditResult.score, 0);
    assert.equal(auditResult.details.items.length, 1);
    assert.equal(auditResult.details.items[0].href, invalidLink.href);
    assert.equal(auditResult.details.items[0].text, invalidLink.text);
  });

  it('ignores links pointing to the main document', () => {
    const artifacts = {
      URL: {
        finalUrl: 'https://example.com/page.html',
      },
      AnchorElements: [
        {href: 'https://example.com/otherpage.html', text: 'legit link text', rel: ''},
        {href: 'https://example.com/page.html', text: 'click here', rel: ''},
        {href: 'https://example.com/page.html#test', text: 'click here', rel: ''},
        {href: 'https://example.com/otherpage.html', text: 'legit link text', rel: ''},
      ],
    };

    const auditResult = LinkTextAudit.audit(artifacts);
    assert.equal(auditResult.score, 1);
  });

  it('ignores javascript: links', () => {
    const artifacts = {
      URL: {
        finalUrl: 'https://example.com/page.html',
      },
      AnchorElements: [
        {href: 'javascript:alert(1)', text: 'click here', rel: ''},
        {href: 'JavaScript:window.location="/otherpage.html"', text: 'click here', rel: ''},
        {href: 'JAVASCRIPT:void(0)', text: 'click here', rel: ''},
      ],
    };

    const auditResult = LinkTextAudit.audit(artifacts);
    assert.equal(auditResult.score, 1);
  });

  it('ignores mailto: links', () => {
    const artifacts = {
      URL: {
        finalUrl: 'https://example.com/page.html',
      },
      AnchorElements: [
        {href: 'mailto:info@example.com', text: 'click here', rel: ''},
        {href: 'mailto:mailmaster@localhost', text: 'click here', rel: ''},
      ],
    };

    const auditResult = LinkTextAudit.audit(artifacts);
    assert.equal(auditResult.score, 1);
  });

  it('ignores links with no href', () => {
    const artifacts = {
      URL: {
        finalUrl: 'https://example.com/page.html',
      },
      AnchorElements: [
        {href: '', text: 'click here', rel: ''},
      ],
    };

    const auditResult = LinkTextAudit.audit(artifacts);
    assert.equal(auditResult.score, 1);
  });

  it('ignores links with nofollow', () => {
    const artifacts = {
      URL: {
        finalUrl: 'https://example.com/page.html',
      },
      AnchorElements: [
        {href: '', text: 'click here', rel: 'noopener nofollow'},
      ],
    };

    const auditResult = LinkTextAudit.audit(artifacts);
    assert.equal(auditResult.score, 1);
  });

  it('passes when all links have descriptive texts', () => {
    const artifacts = {
      URL: {
        finalUrl: 'https://example.com/page.html',
      },
      AnchorElements: [
        {href: 'https://example.com/otherpage.html', text: 'legit link text', rel: ''},
        {href: 'http://example.com/page.html?test=test', text: 'legit link text', rel: ''},
        {href: 'file://Users/user/Desktop/file.png', text: 'legit link text', rel: ''},
      ],
    };

    const auditResult = LinkTextAudit.audit(artifacts);
    assert.equal(auditResult.score, 1);
  });
});
