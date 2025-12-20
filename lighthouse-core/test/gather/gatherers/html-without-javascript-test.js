/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const HTMLWithoutJavaScriptGather = require('../../../gather/gatherers/html-without-javascript.js');
const assert = require('assert').strict;
let htmlWithoutJavaScriptGather;

describe('HTML without JavaScript gatherer', () => {
  // Reset the Gatherer before each test.
  beforeEach(() => {
    htmlWithoutJavaScriptGather = new HTMLWithoutJavaScriptGather();
  });

  it('updates the options', () => {
    const opts = {disableJavaScript: false};
    htmlWithoutJavaScriptGather.beforePass(opts);

    return assert.equal(opts.disableJavaScript, true);
  });

  it('resets the options', () => {
    const opts = {
      disableJavaScript: true,
      driver: {
        evaluateAsync() {
          return Promise.resolve({bodyText: 'Hello!'});
        },
      },
    };
    return htmlWithoutJavaScriptGather
        .afterPass(opts)
        .then(_ => {
          assert.equal(opts.disableJavaScript, false);
        });
  });

  it('returns an artifact', () => {
    const bodyText = 'Hello!';
    const hasNoScript = true;
    return htmlWithoutJavaScriptGather.afterPass({
      driver: {
        evaluateAsync() {
          return Promise.resolve({bodyText, hasNoScript});
        },
      },
    }).then(artifact => {
      assert.deepStrictEqual(artifact, {bodyText, hasNoScript});
    });
  });

  it('throws an error when driver returns a non-string', () => {
    return htmlWithoutJavaScriptGather.afterPass({
      driver: {
        evaluateAsync() {
          return Promise.resolve(null);
        },
      },
    }).then(
      _ => assert.ok(false),
      _ => assert.ok(true));
  });
});
