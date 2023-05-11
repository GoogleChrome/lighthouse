/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import {strict as assert} from 'assert';

import Audit from '../../audits/redirects-http.js';

/* eslint-env jest */

describe('Security: HTTP->HTTPS audit', () => {
  it('fails when no redirect detected', () => {
    return assert.equal(Audit.audit({
      URL: {
        requestedUrl: 'http://example.com/',
        finalDisplayedUrl: 'http://example.com/',
      },
    }).score, 0);
  });

  it('passes when redirect detected', () => {
    return assert.equal(Audit.audit({
      URL: {
        requestedUrl: 'http://paulirish.com/',
        finalDisplayedUrl: 'https://paulirish.com/',
      },
    }).score, 1);
  });

  it('not applicable on localhost', () => {
    const product = Audit.audit({
      URL: {
        requestedUrl: 'http://localhost:8080/page.html',
        finalDisplayedUrl: 'https://localhost:8080/page.html',
      },
    });

    assert.equal(product.score, null);
    assert.equal(product.notApplicable, true);
  });
});
