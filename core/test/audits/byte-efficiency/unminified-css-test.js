/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import UnminifiedCssAudit from '../../../audits/byte-efficiency/unminified-css.js';

const KB = 1024;
const resourceType = 'Stylesheet';

describe('Page uses optimized css', () => {
  it('fails when given unminified stylesheets', () => {
    const auditResult = UnminifiedCssAudit.audit_(
      {
        URL: {finalDisplayedUrl: ''},
        Stylesheets: [
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
        ],
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
        URL: {finalDisplayedUrl: ''},
        Stylesheets: [
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
        ],
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
