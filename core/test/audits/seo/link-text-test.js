/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import LinkTextAudit from '../../../audits/seo/link-text.js';

describe('SEO: link text audit', () => {
  it('fails when link with non descriptive text is found', () => {
    const invalidLink = {href: 'https://example.com/otherpage.html', text: 'click here', rel: ''};
    const artifacts = {
      URL: {
        finalDisplayedUrl: 'https://example.com/page.html',
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
        finalDisplayedUrl: 'https://example.com/page.html',
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
        finalDisplayedUrl: 'https://example.com/page.html',
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
        finalDisplayedUrl: 'https://example.com/page.html',
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
        finalDisplayedUrl: 'https://example.com/page.html',
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
        finalDisplayedUrl: 'https://example.com/page.html',
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
        finalDisplayedUrl: 'https://example.com/page.html',
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
