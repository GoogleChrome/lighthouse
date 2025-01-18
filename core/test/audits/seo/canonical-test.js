/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import CanonicalAudit from '../../../audits/seo/canonical.js';
import {networkRecordsToDevtoolsLog} from '../../network-records-to-devtools-log.js';

describe('SEO: Document has valid canonical link', () => {
  /**
   * @param {Partial<LH.Artifacts.LinkElement>} overrides
   * @return {LH.Artifacts.LinkElement}
   */
  function link(overrides) {
    if (overrides.href && !overrides.hrefRaw) overrides.hrefRaw = overrides.href;
    return {
      rel: '',
      href: null,
      hrefRaw: '',
      hreflang: '',
      source: 'head',
      ...overrides,
    };
  }

  it('succeeds when there are no canonical links', () => {
    const mainDocumentUrl = 'https://example.com/';
    const mainResource = {url: mainDocumentUrl};
    const devtoolsLog = networkRecordsToDevtoolsLog([mainResource]);
    const artifacts = {
      devtoolsLogs: {[CanonicalAudit.DEFAULT_PASS]: devtoolsLog},
      URL: {mainDocumentUrl},
      LinkElements: [],
    };

    const context = {computedCache: new Map()};
    return CanonicalAudit.audit(artifacts, context).then(auditResult => {
      assert.equal(auditResult.score, 1);
    });
  });

  it('fails when there are multiple canonical links', () => {
    const mainDocumentUrl = 'http://www.example.com/';
    const mainResource = {url: mainDocumentUrl};
    const devtoolsLog = networkRecordsToDevtoolsLog([mainResource]);
    const artifacts = {
      devtoolsLogs: {[CanonicalAudit.DEFAULT_PASS]: devtoolsLog},
      URL: {mainDocumentUrl},
      LinkElements: [
        link({rel: 'canonical', source: 'head', href: 'https://www.example.com'}),
        link({rel: 'canonical', source: 'headers', href: 'https://example.com'}),
      ],
    };

    const context = {computedCache: new Map()};
    return CanonicalAudit.audit(artifacts, context).then(auditResult => {
      assert.equal(auditResult.score, 0);
      expect(auditResult.explanation)
        .toBeDisplayString('Multiple conflicting URLs (https://www.example.com, https://example.com)');
    });
  });

  it('fails when canonical url is invalid', () => {
    const mainDocumentUrl = 'http://www.example.com';
    const mainResource = {url: mainDocumentUrl};
    const devtoolsLog = networkRecordsToDevtoolsLog([mainResource]);
    const artifacts = {
      devtoolsLogs: {[CanonicalAudit.DEFAULT_PASS]: devtoolsLog},
      URL: {mainDocumentUrl},
      LinkElements: [
        link({rel: 'canonical', source: 'head', href: null, hrefRaw: 'https:// example.com'}),
      ],
    };

    const context = {computedCache: new Map()};
    return CanonicalAudit.audit(artifacts, context).then(auditResult => {
      const {score, explanation} = auditResult;
      assert.equal(score, 0);
      expect(explanation).toBeDisplayString('Invalid URL (https:// example.com)');
    });
  });

  it('fails when canonical url is relative', () => {
    const mainDocumentUrl = 'https://example.com/de/';
    const mainResource = {url: mainDocumentUrl};
    const devtoolsLog = networkRecordsToDevtoolsLog([mainResource]);
    const artifacts = {
      devtoolsLogs: {[CanonicalAudit.DEFAULT_PASS]: devtoolsLog},
      URL: {mainDocumentUrl},
      LinkElements: [
        link({rel: 'canonical', source: 'headers', href: 'https://www.example.com', hrefRaw: '/'}),
      ],
    };

    const context = {computedCache: new Map()};
    return CanonicalAudit.audit(artifacts, context).then(auditResult => {
      const {score, explanation} = auditResult;
      assert.equal(score, 0);
      expect(explanation).toBeDisplayString('Is not an absolute URL (/)');
    });
  });

  it('fails when canonical points to a different hreflang', () => {
    const mainDocumentUrl = 'https://example.com/';
    const mainResource = {url: mainDocumentUrl};
    const devtoolsLog = networkRecordsToDevtoolsLog([mainResource]);
    const artifacts = {
      devtoolsLogs: {[CanonicalAudit.DEFAULT_PASS]: devtoolsLog},
      URL: {mainDocumentUrl},
      LinkElements: [
        link({rel: 'alternate', source: 'headers', href: 'https://example.com/', hreflang: 'xx'}),
        link({rel: 'canonical', source: 'head', href: 'https://example.com/fr'}),
        link({rel: 'alternate', source: 'head', href: 'https://example.com/fr', hreflang: 'fr'}),
      ],
    };

    const context = {computedCache: new Map()};
    return CanonicalAudit.audit(artifacts, context).then(auditResult => {
      assert.equal(auditResult.score, 0);
      expect(auditResult.explanation)
        .toBeDisplayString('Points to another `hreflang` location (https://example.com/)');
    });
  });

  it('passes when canonical points to the root while current URL is also the root', async () => {
    const mainDocumentUrl = 'https://example.com/';
    const mainResource = {
      url: mainDocumentUrl,
      responseHeaders: [],
    };
    const devtoolsLog = networkRecordsToDevtoolsLog([mainResource]);
    const artifacts = {
      devtoolsLogs: {[CanonicalAudit.DEFAULT_PASS]: devtoolsLog},
      URL: {mainDocumentUrl},
      LinkElements: [
        link({rel: 'canonical', source: 'head', href: 'https://example.com'}),
      ],
    };

    const context = {computedCache: new Map()};
    const auditResult = await CanonicalAudit.audit(artifacts, context);
    assert.equal(auditResult.score, 1);
  });

  it('fails when canonical points to the root while current URL is not the root', () => {
    const mainDocumentUrl = 'https://example.com/articles/cats-and-you';
    const mainResource = {url: mainDocumentUrl};
    const devtoolsLog = networkRecordsToDevtoolsLog([mainResource]);
    const artifacts = {
      devtoolsLogs: {[CanonicalAudit.DEFAULT_PASS]: devtoolsLog},
      URL: {mainDocumentUrl},
      LinkElements: [
        link({rel: 'canonical', source: 'head', href: 'https://example.com'}),
      ],
    };

    const context = {computedCache: new Map()};
    return CanonicalAudit.audit(artifacts, context).then(auditResult => {
      assert.equal(auditResult.score, 0);
      expect(auditResult.explanation).toBeDisplayString('Points to the domain\'s root URL (the ' +
        'homepage), instead of an equivalent page of content');
    });
  });

  it('succeeds when there are multiple identical canonical links', () => {
    const mainDocumentUrl = 'http://www.example.com/';
    const mainResource = {url: mainDocumentUrl};
    const devtoolsLog = networkRecordsToDevtoolsLog([mainResource]);
    const artifacts = {
      devtoolsLogs: {[CanonicalAudit.DEFAULT_PASS]: devtoolsLog},
      URL: {mainDocumentUrl},
      LinkElements: [
        link({rel: 'canonical', source: 'head', href: 'https://example.com'}),
        link({rel: 'canonical', source: 'headers', href: 'https://example.com'}),
      ],
    };

    const context = {computedCache: new Map()};
    return CanonicalAudit.audit(artifacts, context).then(auditResult => {
      assert.equal(auditResult.score, 1);
    });
  });

  it('succeeds when valid canonical is provided via meta tag', () => {
    const mainDocumentUrl = 'http://example.com/articles/cats-and-you?utm_source=twitter';
    const mainResource = {url: mainDocumentUrl};
    const devtoolsLog = networkRecordsToDevtoolsLog([mainResource]);
    const artifacts = {
      devtoolsLogs: {[CanonicalAudit.DEFAULT_PASS]: devtoolsLog},
      URL: {mainDocumentUrl},
      LinkElements: [
        link({rel: 'canonical', source: 'head', href: 'https://example.com/articles/cats-and-you'}),
      ],
    };

    const context = {computedCache: new Map()};
    return CanonicalAudit.audit(artifacts, context).then(auditResult => {
      assert.equal(auditResult.score, 1);
    });
  });

  it('succeeds when valid canonical is provided via header', () => {
    const mainDocumentUrl = 'http://example.com/articles/cats?utm_source=twitter';
    const mainResource = {url: mainDocumentUrl};
    const devtoolsLog = networkRecordsToDevtoolsLog([mainResource]);
    const artifacts = {
      devtoolsLogs: {[CanonicalAudit.DEFAULT_PASS]: devtoolsLog},
      URL: {mainDocumentUrl},
      LinkElements: [
        link({rel: 'canonical', source: 'headers', href: 'https://example.com/articles/cats'}),
      ],
    };

    const context = {computedCache: new Map()};
    return CanonicalAudit.audit(artifacts, context).then(auditResult => {
      assert.equal(auditResult.score, 1);
    });
  });

  it('succeeds when invalid canonical is provided in body', () => {
    const mainDocumentUrl = 'http://example.com/articles/cats-and-you?utm_source=twitter';
    const mainResource = {url: mainDocumentUrl};
    const devtoolsLog = networkRecordsToDevtoolsLog([mainResource]);
    const artifacts = {
      devtoolsLogs: {[CanonicalAudit.DEFAULT_PASS]: devtoolsLog},
      URL: {mainDocumentUrl},
      LinkElements: [
        link({rel: 'canonical', source: 'body', href: 'https://foo.com'}),
      ],
    };

    const context = {computedCache: new Map()};
    return CanonicalAudit.audit(artifacts, context).then(auditResult => {
      assert.equal(auditResult.score, 1);
    });
  });
});
