/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const withoutJsAudit = require('../../audits/without-javascript.js');
const assert = require('assert').strict;

describe('Progressive Enhancement: without javascript audit', () => {
  it('fails when the js-less body is empty', () => {
    const artifacts = {
      HTMLWithoutJavaScript: {
        bodyText: '',
        hasNoScript: false,
      },
    };

    const result = withoutJsAudit.audit(artifacts);
    assert.equal(result.score, 0);
    assert.ok(result.explanation);
  });

  it('fails when the js-less body is whitespace', () => {
    const artifacts = {
      HTMLWithoutJavaScript: {
        bodyText: '        ',
        hasNoScript: false,
      },
    };

    const result = withoutJsAudit.audit(artifacts);
    assert.equal(result.score, 0);
    assert.ok(result.explanation);
  });

  it('succeeds when the js-less body contains some content', () => {
    const artifacts = {
      HTMLWithoutJavaScript: {
        bodyText: 'test',
        hasNoScript: false,
      },
    };

    assert.equal(withoutJsAudit.audit(artifacts).score, 1);
  });

  it('succeeds when the js-less body contains noscript', () => {
    const artifacts = {
      HTMLWithoutJavaScript: {
        bodyText: '',
        hasNoScript: true,
      },
    };

    assert.equal(withoutJsAudit.audit(artifacts).score, 1);
  });
});
