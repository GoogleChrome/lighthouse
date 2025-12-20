/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const KB = 1024;
const UnminifiedCssAudit = require('../../../audits/byte-efficiency/unminified-css.js');
const assert = require('assert').strict;

/* eslint-env jest */

const resourceType = 'Stylesheet';
describe('Page uses optimized css', () => {
  it('fails when given unminified stylesheets', () => {
    const auditResult = UnminifiedCssAudit.audit_(
      {
        URL: {finalUrl: ''},
        CSSUsage: {stylesheets: [
          {
            header: {sourceURL: 'foo.css'},
            content: `
              /*
              * a complicated comment
              * that is
              * several
              * lines
              */
              .my-class {
                width: 100px;
                height: 100px;
              }
            `.replace(/\n\s+/g, '\n'),
          },
          {
            header: {sourceURL: 'other.css'},
            content: `
              .my-other-class {
                background: data("data:image/jpeg;base64,asdfadiosgjwiojasfaasd");
                height: 100px;
              }
            `.replace(/\n\s+/g, '\n'),
          },
        ]},
      },
      [
        {url: 'foo.css', transferSize: 20 * KB, resourceType},
        {url: 'other.css', transferSize: 50 * KB, resourceType},
      ]
    );

    assert.equal(auditResult.items.length, 2);
    assert.equal(auditResult.items[0].url, 'foo.css');
    assert.equal(Math.round(auditResult.items[0].wastedPercent), 65);
    assert.equal(Math.round(auditResult.items[0].wastedBytes / 1024), 13);
    assert.equal(auditResult.items[1].url, 'other.css');
    assert.equal(Math.round(auditResult.items[1].wastedPercent), 8);
    assert.equal(Math.round(auditResult.items[1].wastedBytes / 1024), 4);
  });

  it('passes when stylesheets are already minified', () => {
    const auditResult = UnminifiedCssAudit.audit_(
      {
        URL: {finalUrl: ''},
        CSSUsage: {stylesheets: [
          {header: {sourceURL: 'foo.css'}, content: '#id{width:100px;}'},
          {
            header: {sourceURL: 'other.css'},
            content: `
              /* basically just one comment */
              .the-class {
                display: block;
              }
            `.replace(/\n\s+/g, '\n'),
          },
          {
            header: {sourceURL: 'invalid.css'},
            content: '/* a broken comment .clasz { width: 0; }',
          },
        ]},
      },
      [
        {url: 'foo.css', transferSize: 20 * KB, resourceType},
        {url: 'other.css', transferSize: 512, resourceType},
        {url: 'invalid.css', transferSize: 20 * KB, resourceType},
      ]
    );

    assert.equal(auditResult.items.length, 0);
  });
});
