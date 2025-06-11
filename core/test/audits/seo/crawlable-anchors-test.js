/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import CrawlableAnchorsAudit from '../../../audits/seo/crawlable-anchors.js';

function runAudit({
  rawHref = '',
  href = rawHref,
  role = '',
  onclick = '',
  name = '',
  id = '',
  listeners = onclick.trim().length ? [{type: 'click'}] : [],
  node = {
    snippet: '',
    devtoolsNodePath: '',
    nodeSelector: '',
    boundingRect: null,
    selector: '',
  },
}) {
  const {score} = CrawlableAnchorsAudit.audit({
    AnchorElements: [{
      rawHref,
      href,
      name,
      listeners,
      onclick,
      role,
      node,
      id,
    }],
    URL: {
      finalDisplayedUrl: 'http://example.com',
    },
  });

  return score;
}

describe('SEO: Crawlable anchors audit', () => {
  it('allows crawlable anchors', () => {
    assert.equal(runAudit({rawHref: '#top', href: 'https://example.com#top'}), 1, 'hash fragment identifier');
    assert.equal(runAudit({rawHref: 'mailto:name@example.com'}), 1, 'email link with a mailto URI');
    assert.equal(runAudit({rawHref: 'https://example.com'}), 1, 'absolute HTTPs URL');
    assert.equal(runAudit({rawHref: 'foo'}), 1, 'relative URL');
    assert.equal(runAudit({rawHref: '/foo'}), 1, 'relative URL');
    assert.equal(runAudit({rawHref: '#:~:text=string'}), 1, 'hyperlink with a text fragment');
    assert.equal(runAudit({rawHref: 'ftp://myname@host.dom'}), 1, 'an FTP hyperlink');
    assert.equal(runAudit({rawHref: 'http://172.217.20.78'}), 1, 'IP address based link');
    assert.equal(runAudit({rawHref: '//example.com'}), 1, 'protocol relative link');
    assert.equal(runAudit({rawHref: 'tel:5555555'}), 1, 'email link with a tel URI');
    assert.equal(runAudit({rawHref: '#'}), 1, 'link with only a hash symbol');
    assert.equal(runAudit({
      rawHref: '?query=string',
    }), 1, 'relative link which specifies a query string');

    assert.equal(runAudit({rawHref: 'ftp://'}), 0, 'invalid FTP links fails');
    assert.equal(runAudit({rawHref: '', href: 'https://example.com'}), 1, 'empty attribute that links to current page');
  });

  it('allows anchors acting as an ID anchor', () => {
    assert.equal(runAudit({rawHref: '', id: 'example'}), 1, 'anchor link as ID anchor');
  });

  it('allows anchors which use a name attribute', () => {
    assert.equal(runAudit({name: 'name'}), 1, 'link with a name attribute');
  });

  it('handles anchors with a role attribute', () => {
    const auditResult = runAudit({
      role: 'some-role',
      rawHref: 'javascript:void(0)',
    });
    assert.equal(auditResult, 1, 'Href value has no effect when a role is present');
    assert.equal(runAudit({role: 'a'}), 1, 'Using a role attribute value is an immediate pass');
    assert.equal(runAudit({role: ' '}), 0, 'A role value of a space character fails the audit');
  });

  it('handles anchor elements which use event listeners', () => {
    const auditResultMixtureOfListeners = runAudit({
      rawHref: '/validPath',
      href: 'https://example.com/validPath',
      listeners: [{type: 'nope'}, {type: 'another'}, {type: 'click'}],
    });
    assert.equal(auditResultMixtureOfListeners, 1, 'valid href with any event listener is a pass');

    const auditResultWithInvalidHref = runAudit({
      rawHref: 'javascript:void(0)',
      listeners: [{type: 'nope'}, {type: 'another'}, {type: 'click'}],
    });
    assert.equal(auditResultWithInvalidHref, 0, 'invalid href with any event listener is a faile');

    const auditResultNoListener = runAudit({
      rawHref: '/validPath',
    });
    assert.equal(auditResultNoListener, 1, 'valid href with no event listener is a pass');
  });

  it('disallows uncrawlable anchors', () => {
    assert.equal(runAudit({}), 0, 'link with no meaningful attributes and no event handlers');
    assert.equal(runAudit({rawHref: 'file:///image.png'}), 0, 'hyperlink with a `file:` URI');
    assert.equal(runAudit({name: ' '}), 0, 'name attribute with only space characters');
    assert.equal(runAudit({rawHref: ' '}), 1, 'href attribute with only space characters');
    const assertionMessage = 'onclick attribute with only space characters';
    assert.equal(runAudit({rawHref: ' ', onclick: ' '}), 1, assertionMessage);
  });

  it('handles javascript:void expressions in the onclick attribute', () => {
    const expectedAuditFailures = [
      'javascript:void(0)',
      'javascript: void(0)',
      'javascript : void(0)',
      'javascript : void ( 0 )',
      'javascript: void 0',
      'javascript:void 0',
      // The audit logic removes all whitespace from the string and considers this a fail
      'javascript:void0',
    ];

    for (const javaScriptVoidVariation of expectedAuditFailures) {
      const auditResult = runAudit({rawHref: javaScriptVoidVariation});
      assert.equal(auditResult, 0, `'${javaScriptVoidVariation}' should fail the audit`);
    }
  });

  it('handles window.location and window.open assignments in an onclick attribute', () => {
    const expectedAuditPasses = [
      'window.location=',
      'window.location =',
      'window.open()',
      `window.open('')`,
      'window.open(`http://example.com`)',
      'window.open ( )',
      `window.open('foo', 'name', 'resizable)`,
      'windowAlocation',
      'window.location.href',
      'window.Location =',
      'windowLopen()',
    ];

    for (const onclickVariation of expectedAuditPasses) {
      const auditResult = runAudit({rawHref: '/validPath', href: 'https://example.com/validPath', onclick: onclickVariation});
      assert.equal(auditResult, 1, `'${onclickVariation}' should pass the audit`);
    }
  });

  it('handles window.open in an onclick attribute and mailto: in a href attribute', () => {
    assert.equal(
        runAudit({rawHref: 'mailto:name@example.com', onclick: 'window.open()'}),
        1,
        'window.open in an onclick and mailto: in a href is a pass'
    );
  });
});
