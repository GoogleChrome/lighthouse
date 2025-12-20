/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const RobotsTxtAudit = require('../../../audits/seo/robots-txt.js');
const assert = require('assert').strict;

/* eslint-env jest */

describe('SEO: robots.txt audit', () => {
  it('fails and reports error when no robots.txt was provided', () => {
    const artifacts = {
      RobotsTxt: {
        status: null,
        content: null,
      },
    };

    const auditResult = RobotsTxtAudit.audit(artifacts);
    assert.equal(auditResult.score, 0);
    assert.ok(auditResult.explanation);
  });

  it('fails when request for /robots.txt returns a HTTP500+ error', () => {
    const testData = [
      {
        status: 500,
        content: null,
      },
      {
        status: 503,
        content: 'There is some content',
      },
      {
        status: 599,
        content: null,
      },
    ];

    testData.forEach(RobotsTxt => {
      const artifacts = {
        RobotsTxt,
      };

      const auditResult = RobotsTxtAudit.audit(artifacts);
      assert.equal(auditResult.score, 0);
    });
  });

  it('fails when robots.txt file contains errors', () => {
    const testData = [
      {
        RobotsTxt: {
          status: 200,
          content: 'Allow: /',
        },
        expectedErrors: 1,
      },
      {
        RobotsTxt: {
          status: 201,
          content: 'syntax error',
        },
        expectedErrors: 1,
      },
      {
        RobotsTxt: {
          status: 301,
          content: 'unknown: directive',
        },
        expectedErrors: 1,
      },
      {
        RobotsTxt: {
          status: 200,
          content: 'unknown: directive',
        },
        expectedErrors: 1,
      },
      {
        RobotsTxt: {
          status: 200,
          content: 'sitemap: /cant/be/relative.xml',
        },
        expectedErrors: 1,
      },
      {
        RobotsTxt: {
          status: 200,
          content: 'sitemap:#can\'t be empty',
        },
        expectedErrors: 1,
      },
      {
        RobotsTxt: {
          status: 200,
          content: 'user-agent: *\nallow: https://cant.be/absolute',
        },
        expectedErrors: 1,
      },
      {
        RobotsTxt: {
          status: 399,
          content: 'user-agent: *\nallow: must/start/with/a/slash',
        },
        expectedErrors: 1,
      },
      {
        RobotsTxt: {
          status: 200,
          content: 'user-agent: *\nallow: /dolar/sign$in/the/middle',
        },
        expectedErrors: 1,
      },
      {
        RobotsTxt: {
          status: 200,
          content: 'user-agent: *\nallow: must/start/with/a/slash',
        },
        expectedErrors: 1,
      },
      {
        RobotsTxt: {
          status: 200,
          content: `user-agent: *
allow: /
disallow: /test

user agent: wrong
alow: /wrong
disallow /wrong
`,
        },
        expectedErrors: 3,
      },
      {
        RobotsTxt: {
          status: 200,
          content: `every
single
line
is
wrong
`,
        },
        expectedErrors: 5,
      },
    ];

    testData.forEach(({RobotsTxt, expectedErrors}) => {
      const artifacts = {
        RobotsTxt,
      };

      const auditResult = RobotsTxtAudit.audit(artifacts);

      assert.equal(auditResult.score, 0);
      assert.equal(auditResult.details.items.length, expectedErrors);
      expect(auditResult.displayValue).toBeDisplayString(/\d errors? found/);
    });
  });

  it('not applicable when there is no robots.txt or it\'s empty', () => {
    const testData = [
      {
        status: 404,
        content: 'invalid content',
      },
      {
        status: 401,
        content: 'invalid content',
      },
      {
        status: 200,
        content: '',
      },
    ];

    testData.forEach(RobotsTxt => {
      const artifacts = {
        RobotsTxt,
      };

      const auditResult = RobotsTxtAudit.audit(artifacts);
      assert.equal(auditResult.score, 1);
      assert.equal(auditResult.notApplicable, true);
    });
  });

  it('passes when robots.txt is valid', () => {
    const testData = [
      {
        status: 200,
        content: '#just a comment',
      },
      {
        status: 201,
        content: 'user-agent:*\ndisallow:',
      },
      {
        status: 200,
        content: 'USER-AGENT:  *\nALLOW:    /         \nDISALLOW:#comment',
      },
      {
        status: 204,
        content: `User-agent: Twitterbot
Disallow:

User-agent: BadBot
Disallow: / # go away!

Sitemap: https://example.com/sitemap.xml

User-agent: Yandex
Host: https://brainly.com
clean-param: bla

User-agent: Bing
Disallow: /*.swf$
crawl-delay: 10

User-agent: NotOfficial
noindex: /bla
Visit-time: 0600-0845
Request-rate: 1/30m
`,
      },
    ];

    testData.forEach(RobotsTxt => {
      const artifacts = {
        RobotsTxt,
      };

      const auditResult = RobotsTxtAudit.audit(artifacts);
      assert.equal(auditResult.score, 1);
    });
  });
});
