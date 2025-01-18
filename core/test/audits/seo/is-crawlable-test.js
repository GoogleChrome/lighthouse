/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import IsCrawlableAudit from '../../../audits/seo/is-crawlable.js';
import {networkRecordsToDevtoolsLog} from '../../network-records-to-devtools-log.js';

describe('SEO: Is page crawlable audit', () => {
  const makeMetaElements = content => [{name: 'robots', content, node: {}}];

  it('fails when page is blocked from indexing with a robots metatag', () => {
    const robotsValues = [
      'noindex',
      'none',
      'foo, noindex, bar',
      'all, none, all',
      '     noindex      ',
      'all, unavailable_after: 25 Jun 2010 15:00:00 PST',
      ' Unavailable_after: 25-Aug-2007 15:00:00 EST, all',
    ];

    const allRuns = robotsValues.map(robotsValue => {
      const mainDocumentUrl = 'https://example.com/';
      const mainResource = {
        url: mainDocumentUrl,
        responseHeaders: [],
      };
      const devtoolsLog = networkRecordsToDevtoolsLog([mainResource]);
      const artifacts = {
        devtoolsLogs: {[IsCrawlableAudit.DEFAULT_PASS]: devtoolsLog},
        URL: {mainDocumentUrl},
        MetaElements: makeMetaElements(robotsValue),
        RobotsTxt: {},
      };

      const context = {computedCache: new Map()};
      return IsCrawlableAudit.audit(artifacts, context).then(auditResult => {
        assert.equal(auditResult.score, 0);
        assert.equal(auditResult.details.items.length, 1);
        expect(auditResult.warnings).toHaveLength(0);
      });
    });

    return Promise.all(allRuns);
  });

  it('succeeds when there are no blocking directives in the metatag', () => {
    const mainDocumentUrl = 'https://example.com/';
    const mainResource = {
      url: mainDocumentUrl,
      responseHeaders: [],
    };
    const devtoolsLog = networkRecordsToDevtoolsLog([mainResource]);
    const artifacts = {
      devtoolsLogs: {[IsCrawlableAudit.DEFAULT_PASS]: devtoolsLog},
      URL: {mainDocumentUrl},
      requestMainResource: () => Promise.resolve(mainResource),
      MetaElements: makeMetaElements('all, noarchive'),
      RobotsTxt: {},
    };

    const context = {computedCache: new Map()};
    return IsCrawlableAudit.audit(artifacts, context).then(auditResult => {
      assert.equal(auditResult.score, 1);
      expect(auditResult.warnings).toHaveLength(0);
    });
  });

  it('succeeds when there is no robots metatag', () => {
    const mainDocumentUrl = 'https://example.com/';
    const mainResource = {
      url: mainDocumentUrl,
      responseHeaders: [],
    };
    const devtoolsLog = networkRecordsToDevtoolsLog([mainResource]);
    const artifacts = {
      devtoolsLogs: {[IsCrawlableAudit.DEFAULT_PASS]: devtoolsLog},
      URL: {mainDocumentUrl},
      MetaElements: [],
      RobotsTxt: {},
    };

    const context = {computedCache: new Map()};
    return IsCrawlableAudit.audit(artifacts, context).then(auditResult => {
      assert.equal(auditResult.score, 1);
      expect(auditResult.warnings).toHaveLength(0);
    });
  });

  it('fails when page is blocked from indexing with a header', () => {
    const robotsHeaders = [
      [
        {name: 'x-robots-tag', value: 'noindex'},
      ],
      [
        {name: 'X-Robots-Tag', value: 'all'},
        {name: 'x-robots-tag', value: 'none'},
      ],
      [
        {name: 'X-ROBOTS-TAG', value: 'all, none'},
      ],
      [
        {name: 'x-robots-tag', value: '    noindex    '},
      ],
      [
        {name: 'x-robots-tag', value: 'unavailable_after: 25 Jun 2010 15:00:00 PST, all'},
      ],
      [
        {name: 'x-robots-tag', value: 'all, unavailable_after: 25-Jun-2010 15:00:00 PST'},
      ],
    ];

    const allRuns = robotsHeaders.map(headers => {
      const mainDocumentUrl = 'https://example.com/';
      const mainResource = {
        url: mainDocumentUrl,
        responseHeaders: headers,
      };
      const devtoolsLog = networkRecordsToDevtoolsLog([mainResource]);
      const artifacts = {
        devtoolsLogs: {[IsCrawlableAudit.DEFAULT_PASS]: devtoolsLog},
        URL: {mainDocumentUrl},
        MetaElements: [],
        RobotsTxt: {},
      };

      const context = {computedCache: new Map()};
      return IsCrawlableAudit.audit(artifacts, context).then(auditResult => {
        assert.equal(auditResult.score, 0);
        assert.equal(auditResult.details.items.length, 1);
        expect(auditResult.warnings).toHaveLength(0);
      });
    });

    return Promise.all(allRuns);
  });

  it('succeeds when there are no blocking directives in the robots header', () => {
    const mainDocumentUrl = 'https://example.com/';
    const mainResource = {
      url: mainDocumentUrl,
      responseHeaders: [
        {name: 'X-Robots-Tag', value: 'all, nofollow'},
        {name: 'X-Robots-Tag', value: 'unavailable_after: 25 Jun 2045 15:00:00 PST'},
      ],
    };
    const devtoolsLog = networkRecordsToDevtoolsLog([mainResource]);
    const artifacts = {
      devtoolsLogs: {[IsCrawlableAudit.DEFAULT_PASS]: devtoolsLog},
      URL: {mainDocumentUrl},
      MetaElements: [],
      RobotsTxt: {},
    };

    const context = {computedCache: new Map()};
    return IsCrawlableAudit.audit(artifacts, context).then(auditResult => {
      assert.equal(auditResult.score, 1);
      expect(auditResult.warnings).toHaveLength(0);
    });
  });

  it('succeeds when there is no robots header and robots.txt is unavailable', () => {
    const mainDocumentUrl = 'https://example.com/';
    const mainResource = {
      url: mainDocumentUrl,
      responseHeaders: [],
    };
    const devtoolsLog = networkRecordsToDevtoolsLog([mainResource]);
    const artifacts = {
      devtoolsLogs: {[IsCrawlableAudit.DEFAULT_PASS]: devtoolsLog},
      URL: {mainDocumentUrl},
      MetaElements: [],
      RobotsTxt: {},
    };

    const context = {computedCache: new Map()};
    return IsCrawlableAudit.audit(artifacts, context).then(auditResult => {
      assert.equal(auditResult.score, 1);
      expect(auditResult.warnings).toHaveLength(0);
    });
  });

  it('ignores UA specific directives', () => {
    const mainDocumentUrl = 'https://example.com/';
    const mainResource = {
      url: mainDocumentUrl,
      responseHeaders: [
        {name: 'x-robots-tag', value: 'googlebot: unavailable_after: 25 Jun 2007 15:00:00 PST'},
        {name: 'x-robots-tag', value: 'unavailable_after: 25 Jun 2045 15:00:00 PST'},
      ],
    };
    const devtoolsLog = networkRecordsToDevtoolsLog([mainResource]);
    const artifacts = {
      devtoolsLogs: {[IsCrawlableAudit.DEFAULT_PASS]: devtoolsLog},
      URL: {mainDocumentUrl},
      MetaElements: [],
      RobotsTxt: {},
    };

    const context = {computedCache: new Map()};
    return IsCrawlableAudit.audit(artifacts, context).then(auditResult => {
      assert.equal(auditResult.score, 1);
      expect(auditResult.warnings).toHaveLength(0);
    });
  });

  it('fails when page is blocked from indexing by robots.txt', () => {
    const robotsTxts = [
      {
        content: `User-agent: *
        Disallow: /`,
      },
      {
        content: `User-agent: *
        Disallow: /test/page.html`,
      },
      {
        content: `User-agent: *
        Disallow:

        User-agent: *
        Disallow: /`,
      },
      {
        content: `User-agent: *
        Disallow: /one/
        Disallow: /two/
        Disallow: /test/
        Allow: page.html
        # Allow: /test/page.html
        Allow: /test/page.html /someother/url.html`,
      },
    ];

    const allRuns = robotsTxts.map(robotsTxt => {
      const mainDocumentUrl = 'http://example.com/test/page.html';
      const mainResource = {
        url: mainDocumentUrl,
        responseHeaders: [],
      };
      const devtoolsLog = networkRecordsToDevtoolsLog([mainResource]);
      const artifacts = {
        devtoolsLogs: {[IsCrawlableAudit.DEFAULT_PASS]: devtoolsLog},
        URL: {mainDocumentUrl},
        MetaElements: [],
        RobotsTxt: robotsTxt,
      };

      const context = {computedCache: new Map()};
      return IsCrawlableAudit.audit(artifacts, context).then(auditResult => {
        assert.equal(auditResult.score, 0);
        assert.equal(auditResult.details.items.length, 1);
        expect(auditResult.warnings).toHaveLength(0);
      });
    });

    return Promise.all(allRuns);
  });

  it('succeeds when page is allowed by robots.txt', () => {
    const robotsTxts = [
      {
        content: `User-agent: SomeBot
        Disallow: /`,
      },
      {
        content: `User-agent: *
        Disallow: /_/
        Disallow: /search?q=*
        Disallow: /test/
        Allow: /test/page.html`,
      },
    ];

    const allRuns = robotsTxts.map(robotsTxt => {
      const mainDocumentUrl = 'http://example.com/test/page.html';
      const mainResource = {
        url: mainDocumentUrl,
        responseHeaders: [],
      };
      const devtoolsLog = networkRecordsToDevtoolsLog([mainResource]);
      const artifacts = {
        devtoolsLogs: {[IsCrawlableAudit.DEFAULT_PASS]: devtoolsLog},
        URL: {mainDocumentUrl},
        MetaElements: [],
        RobotsTxt: robotsTxt,
      };

      const context = {computedCache: new Map()};
      return IsCrawlableAudit.audit(artifacts, context).then(auditResult => {
        assert.equal(auditResult.score, 1);
        expect(auditResult.warnings).toHaveLength(0);
      });
    });

    return Promise.all(allRuns);
  });

  it('returns all failing items', () => {
    const mainDocumentUrl = 'http://example.com/test/page.html';
    const mainResource = {
      url: mainDocumentUrl,
      responseHeaders: [
        {name: 'x-robots-tag', value: 'none'},
        {name: 'x-robots-tag', value: 'noindex'},
      ],
    };
    const robotsTxt = {
      content: `User-agent: *
      Disallow: /`,
    };
    const devtoolsLog = networkRecordsToDevtoolsLog([mainResource]);
    const artifacts = {
      devtoolsLogs: {[IsCrawlableAudit.DEFAULT_PASS]: devtoolsLog},
      URL: {mainDocumentUrl},
      MetaElements: makeMetaElements('noindex'),
      RobotsTxt: robotsTxt,
    };

    const context = {computedCache: new Map()};
    return IsCrawlableAudit.audit(artifacts, context).then(auditResult => {
      assert.equal(auditResult.score, 0);
      assert.equal(auditResult.details.items.length, 4);
      expect(auditResult.warnings).toHaveLength(0);

      expect(auditResult.details.items).toMatchInlineSnapshot(`
        Array [
          Object {
            "source": Object {
              "boundingRect": undefined,
              "lhId": undefined,
              "nodeLabel": undefined,
              "path": undefined,
              "selector": undefined,
              "snippet": "<meta name=\\"robots\\" content=\\"noindex\\" />",
              "type": "node",
            },
          },
          Object {
            "source": "x-robots-tag: none",
          },
          Object {
            "source": "x-robots-tag: noindex",
          },
          Object {
            "source": Object {
              "column": 0,
              "line": 1,
              "type": "source-location",
              "url": "http://example.com/robots.txt",
              "urlProvider": "network",
            },
          },
        ]
      `);
    });
  });

  it('warns when page allows some crawlers but not others', () => {
    const testCases = [
      {
        // Purposefully use lowercase 'googlebot' here.
        robots: `
        User-agent: googlebot
        Allow: /

        User-agent: *
        Disallow: /
        `,
        responseHeaders: [],
        metaElements: [],
        expectedWarning: 'blocked from crawling: bingbot, DuckDuckBot, archive.org_bot.',
      },
      {
        robots: `
        User-agent: Googlebot
        Disallow: /

        User-agent: bingbot
        Allow: /

        User-agent: archive.org_bot
        Allow: /

        User-agent: *
        Disallow: /
        `,
        responseHeaders: [
          {name: 'x-robots-tag', value: 'bingbot: noindex'},
        ],
        metaElements: [],
        expectedWarning: 'blocked from crawling: Googlebot, bingbot, DuckDuckBot.',
      },
      {
        robots: `
        User-agent: googlebot
        Allow: /

        User-agent: bingbot
        Allow: /

        User-agent: archive.org_bot
        Allow: /

        User-agent: *
        Disallow: /
        `,
        responseHeaders: [],
        metaElements: [{name: 'archive.org_bot', content: 'noindex', node: {}}],
        expectedWarning: 'blocked from crawling: DuckDuckBot, archive.org_bot.',
      },
    ];

    const allRuns = testCases.map(({robots, responseHeaders, metaElements, expectedWarning}) => {
      const mainDocumentUrl = 'http://example.com/test/page.html';
      const mainResource = {
        url: mainDocumentUrl,
        responseHeaders,
      };
      const devtoolsLog = networkRecordsToDevtoolsLog([mainResource]);
      const artifacts = {
        devtoolsLogs: {[IsCrawlableAudit.DEFAULT_PASS]: devtoolsLog},
        URL: {mainDocumentUrl},
        MetaElements: metaElements,
        RobotsTxt: {content: robots},
      };

      const context = {computedCache: new Map()};
      return IsCrawlableAudit.audit(artifacts, context).then(auditResult => {
        assert.equal(auditResult.score, 1);
        expect(auditResult.warnings).toHaveLength(1);
        expect(auditResult.warnings[0]).toContain(expectedWarning);
      });
    });

    return Promise.all(allRuns);
  });
});
