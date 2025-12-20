/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const HTTPRedirectGather = require('../../../gather/gatherers/http-redirect.js');
const assert = require('assert').strict;
let httpRedirectGather;

describe('HTTP Redirect gatherer', () => {
  // Reset the Gatherer before each test.
  beforeEach(() => {
    httpRedirectGather = new HTTPRedirectGather();
  });

  it('sets the URL to HTTP', () => {
    const opts = {
      url: 'https://example.com',
    };
    httpRedirectGather.beforePass(opts);
    return assert.equal(opts.url, 'http://example.com');
  });

  it('resets the URL', () => {
    const opts = {
      url: 'https://example.com',
      driver: {
        evaluateAsync: function() {
          return Promise.resolve(true);
        },
      },
    };

    httpRedirectGather.beforePass(opts);
    return httpRedirectGather
        .afterPass(opts)
        .then(_ => {
          assert.equal(opts.url, 'https://example.com');
        });
  });

  it('returns an artifact', () => {
    return httpRedirectGather.afterPass({
      driver: {
        evaluateAsync: function() {
          return Promise.resolve(true);
        },
      },
    }).then(artifact => {
      assert.ok(artifact.value);
    });
  });

  it('fails a non-redirecting page', () => {
    return httpRedirectGather.afterPass({
      driver: {
        evaluateAsync: function() {
          return Promise.resolve(false);
        },
      },
    }).then(artifact => {
      assert.ok(artifact.value === false);
    });
  });

  it('throws an error on driver failure', () => {
    return httpRedirectGather.afterPass({
      driver: {
        evaluateAsync: function() {
          return Promise.reject(new Error('an unexpected driver error occurred'));
        },
      },
    }).then(
      _ => assert.ok(false),
      _ => assert.ok(true));
  });
});
