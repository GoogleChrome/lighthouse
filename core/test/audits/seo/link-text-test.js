/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import LinkTextAudit from '../../../audits/seo/link-text.js';

describe('SEO: link text audit', () => {
  it('fails when link with non descriptive text is found', () => {
    const invalidLink = {href: 'https://example.com/otherpage.html', text: 'click here', rel: '', textLang: 'en'};
    const invalidLinkDe = {href: 'https://example.com/otherpage.html', text: 'klicke hier', rel: '', textLang: 'de'};
    const invalidLinkEs = {href: 'https://example.com/otherpage.html', text: 'click aquí', rel: '', textLang: 'es'};
    const invalidLinkEnUs = {href: 'https://example.com/otherpage.html', text: 'click here', rel: '', textLang: 'en-US'};
    const invalidLinkDeDe = {href: 'https://example.com/otherpage.html', text: 'klicke hier', rel: '', textLang: 'de-DE'};
    const artifacts = {
      URL: {
        finalDisplayedUrl: 'https://example.com/page.html',
      },
      AnchorElements: [
        {href: 'https://example.com/otherpage.html', text: 'legit link text', rel: '', textLang: 'en'},
        invalidLink,
        invalidLinkDe,
        invalidLinkEs,
        {href: 'https://example.com/otherpage.html', text: 'legit link text', rel: '', textLang: 'en'},
        {href: 'https://example.com/otherpage.html', text: 'legitimer Link-Text', rel: '', textLang: 'de'},
        invalidLinkEnUs,
        invalidLinkDeDe,
      ],
    };

    const auditResult = LinkTextAudit.audit(artifacts);
    assert.equal(auditResult.score, 0);
    assert.equal(auditResult.details.items.length, 5);
    assert.equal(auditResult.details.items[0].href, invalidLink.href);
    assert.equal(auditResult.details.items[0].text, invalidLink.text);
    assert.equal(auditResult.details.items[1].href, invalidLinkDe.href);
    assert.equal(auditResult.details.items[1].text, invalidLinkDe.text);
    assert.equal(auditResult.details.items[2].href, invalidLinkEs.href);
    assert.equal(auditResult.details.items[2].text, invalidLinkEs.text);
    assert.equal(auditResult.details.items[3].href, invalidLinkEnUs.href);
    assert.equal(auditResult.details.items[3].text, invalidLinkEnUs.text);
    assert.equal(auditResult.details.items[4].href, invalidLinkDeDe.href);
    assert.equal(auditResult.details.items[4].text, invalidLinkDeDe.text);
  });

  it('considers all non descriptive link texts with unknown language', () => {
    const artifacts = {
      URL: {
        finalDisplayedUrl: 'https://example.com/page.html',
      },
      AnchorElements: [
        {href: 'https://example.com/otherpage.html', text: 'legit link text', rel: ''},
        {href: 'https://example.com/otherpage.html', text: 'click here', rel: ''},
        {href: 'https://example.com/otherpage.html', text: 'klicke hier', rel: ''},
        {href: 'https://example.com/otherpage.html', text: 'click aquí', rel: ''},
      ],
    };

    const auditResult = LinkTextAudit.audit(artifacts);
    assert.equal(auditResult.score, 0);
    assert.equal(auditResult.details.items.length, 3);
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
        {href: 'https://example.com/otherpage.html', text: 'legit link text', rel: '', textLang: 'en'},
        {href: 'https://example.com/otherpage.html', text: 'legitimer Link-Text', rel: '', textLang: 'de'},
        {href: 'http://example.com/page.html?test=test', text: 'legit link text', rel: '', textLang: 'en'},
        {href: 'file://Users/user/Desktop/file.png', text: 'legit link text', rel: '', textLang: 'en'},
      ],
    };

    const auditResult = LinkTextAudit.audit(artifacts);
    assert.equal(auditResult.score, 1);
  });
});
