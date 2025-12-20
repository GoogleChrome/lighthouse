/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ExternalAnchorsAudit =
  require('../../../audits/dobetterweb/external-anchors-use-rel-noopener.js');
const assert = require('assert').strict;

const URL = 'https://google.com/test';

/* eslint-env jest */

describe('External anchors use rel="noopener"', () => {
  it('passes when links are from same hosts as the page host', () => {
    const auditResult = ExternalAnchorsAudit.audit({
      AnchorElements: [
        {href: 'https://google.com/test', target: '_blank', rel: ''},
        {href: 'https://google.com/test1', target: '_blank', rel: ''},
      ],
      URL: {finalUrl: URL},
    });
    assert.equal(auditResult.score, 1);
    assert.equal(auditResult.details.items.length, 0);
  });

  it('passes when links have a valid rel', () => {
    const auditResult = ExternalAnchorsAudit.audit({
      AnchorElements: [
        {href: 'https://other.com/test', target: '_blank', rel: 'nofollow noopener'},
        {href: 'https://other.com/test1', target: '_blank', rel: 'noreferrer'},
        {href: 'https://other.com/test2', target: '_blank', rel: 'noopener'},
      ],
      URL: {finalUrl: URL},
    });
    assert.equal(auditResult.score, 1);
    assert.equal(auditResult.details.items.length, 0);
  });

  it('passes when links do not use target=_blank', () => {
    const auditResult = ExternalAnchorsAudit.audit({
      AnchorElements: [
        {href: 'https://other.com/test', rel: ''},
        {href: 'https://other.com/test1', rel: ''},
      ],
      URL: {finalUrl: URL},
    });
    assert.equal(auditResult.score, 1);
    assert.equal(auditResult.details.items.length, 0);
  });

  it('passes when links have javascript in href attribute', () => {
    const auditResult = ExternalAnchorsAudit.audit({
      AnchorElements: [
        {href: 'javascript:void(0)', target: '_blank', rel: ''},
        {href: 'JAVASCRIPT:void(0)', target: '_blank', rel: ''},
      ],
      URL: {finalUrl: URL},
    });
    assert.equal(auditResult.score, 1);
    assert.equal(auditResult.details.items.length, 0);
  });

  it('passes when links have mailto in href attribute', () => {
    const auditResult = ExternalAnchorsAudit.audit({
      AnchorElements: [
        {href: 'mailto:inbox@email.com', target: '_blank', rel: ''},
        {href: 'MAILTO:INBOX@EMAIL.COM', target: '_blank', rel: ''},
      ],
      URL: {finalUrl: URL},
    });
    assert.equal(auditResult.score, 1);
    assert.equal(auditResult.details.items.length, 0);
  });

  it('fails when links are from different hosts than the page host', () => {
    const auditResult = ExternalAnchorsAudit.audit({
      AnchorElements: [
        {
          href: 'https://example.com/test',
          target: '_blank',
          rel: 'nofollow',
          devtoolsNodePath: 'devtools',
        },
        {
          href: 'https://example.com/test1',
          target: '_blank',
          rel: '',
          devtoolsNodePath: 'nodepath',
        },
      ],
      URL: {finalUrl: URL},
    });
    assert.equal(auditResult.score, 0);
    assert.equal(auditResult.details.items.length, 2);
    assert.equal(auditResult.details.items[0].node.type, 'node');
    assert.equal(auditResult.details.items[0].node.path, 'devtools');
    assert.equal(auditResult.details.items[1].node.type, 'node');
    assert.equal(auditResult.details.items[1].node.path, 'nodepath');
  });

  it('fails when links have no href attribute', () => {
    const auditResult = ExternalAnchorsAudit.audit({
      AnchorElements: [{href: '', target: '_blank', rel: ''}],
      URL: {finalUrl: URL},
    });
    assert.equal(auditResult.score, 0);
    assert.equal(auditResult.details.items.length, 1);
    assert.ok(auditResult.warnings.length, 'includes warning');
  });

  it('fails when links have href attribute starting with a protocol', () => {
    const auditResult = ExternalAnchorsAudit.audit({
      AnchorElements: [
        {href: 'http://', target: '_blank', rel: ''},
        {href: 'http:', target: '_blank', rel: ''},
        {href: 'https://', target: '_blank', rel: ''},
        {href: 'https:', target: '_blank', rel: ''},
      ],
      URL: {finalUrl: URL},
    });
    assert.equal(auditResult.score, 0);
    assert.equal(auditResult.details.items.length, 4);
    assert.equal(auditResult.warnings.length, 4);
  });
});
