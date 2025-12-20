/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const AccessibilityGather = require('../../../gather/gatherers/accessibility.js');
const assert = require('assert').strict;
let accessibilityGather;

describe('Accessibility gatherer', () => {
  // Reset the Gatherer before each test.
  beforeEach(() => {
    accessibilityGather = new AccessibilityGather();
  });

  it('fails if nothing is returned', () => {
    return accessibilityGather.afterPass({
      driver: {
        evaluateAsync() {
          return Promise.resolve();
        },
      },
    }).then(
      _ => assert.ok(false),
      _ => assert.ok(true));
  });

  it('fails if result has no violations array', () => {
    return accessibilityGather.afterPass({
      driver: {
        evaluateAsync() {
          return Promise.resolve({
            url: 'https://example.com',
          });
        },
      },
    }).then(
      _ => assert.ok(false),
      _ => assert.ok(true));
  });

  it('propagates error retrieving the results', () => {
    const error = 'There was an error.';
    return accessibilityGather.afterPass({
      driver: {
        evaluateAsync() {
          return Promise.reject(new Error(error));
        },
      },
    }).then(
      _ => assert.ok(false),
      err => assert.ok(err.message.includes(error)));
  });
});
