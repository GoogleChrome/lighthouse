/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const PluginsAudit = require('../../../audits/seo/plugins.js');
const assert = require('assert').strict;

/* eslint-env jest */

describe('SEO: Avoids plugins', () => {
  it('fails when page contains java, silverlight or flash content', () => {
    const embeddedContentValues = [
      [{
        tagName: 'APPLET',
        params: [],
      }],
      [{
        tagName: 'OBJECT',
        type: 'application/x-shockwave-flash',
        params: [],
      }],
      [{
        tagName: 'EMBED',
        type: 'application/x-java-applet;jpi-version=1.4',
        params: [],
      }],
      [{
        tagName: 'OBJECT',
        type: 'application/x-silverlight-2',
        params: [],
      }],
      [{
        tagName: 'OBJECT',
        data: 'https://example.com/movie_name.swf?uid=123',
        params: [],
      }],
      [{
        tagName: 'EMBED',
        src: '/path/to/movie_name.latest.swf',
        params: [],
      }],
      [{
        tagName: 'OBJECT',
        params: [
          {name: 'quality', value: 'low'},
          {name: 'movie', value: 'movie.swf?id=123'},
        ],
      }],
      [{
        tagName: 'OBJECT',
        params: [
          {name: 'code', value: '../HelloWorld.class'},
        ],
      }],
    ];

    embeddedContentValues.forEach(embeddedContent => {
      const artifacts = {
        EmbeddedContent: embeddedContent,
      };

      const auditResult = PluginsAudit.audit(artifacts);
      assert.equal(auditResult.score, 0);
      assert.equal(auditResult.details.items.length, 1);
    });
  });

  it('returns multiple results when there are multiple failing items', () => {
    const artifacts = {
      EmbeddedContent: [
        {
          tagName: 'EMBED',
          type: 'application/x-java-applet;jpi-version=1.4',
          params: [],
        },
        {
          tagName: 'OBJECT',
          type: 'application/x-silverlight-2',
          params: [],
        },
        {
          tagName: 'APPLET',
          params: [],
        },
      ],
    };

    const auditResult = PluginsAudit.audit(artifacts);
    assert.equal(auditResult.score, 0);
    assert.equal(auditResult.details.items.length, 3);
  });

  it('succeeds when there is no external content found on page', () => {
    const artifacts = {
      EmbeddedContent: [],
    };

    const auditResult = PluginsAudit.audit(artifacts);
    assert.equal(auditResult.score, 1);
  });

  it('succeeds when all external content is valid', () => {
    const artifacts = {
      EmbeddedContent: [
        {
          tagName: 'OBJECT',
          type: 'image/svg+xml',
          data: 'https://example.com/test.svg',
          params: [],
        },
        {
          tagName: 'OBJECT',
          data: 'https://example.com',
          params: [],
        },
        {
          tagName: 'EMBED',
          type: 'video/quicktime',
          src: 'movie.mov',
          params: [],
        },
        {
          tagName: 'OBJECT',
          params: [{
            name: 'allowFullScreen',
            value: 'true',
          }, {
            name: 'movie',
            value: 'http://www.youtube.com/v/example',
          }],
        },
      ],
    };

    const auditResult = PluginsAudit.audit(artifacts);
    assert.equal(auditResult.score, 1);
  });
});
