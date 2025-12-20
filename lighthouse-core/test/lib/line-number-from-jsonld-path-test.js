/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const assert = require('assert').strict;
const getLineNumberFromJsonLDPath = require('../../lib/sd-validation/line-number-from-jsonld-path.js'); // eslint-disable-line max-len

/* global describe, it */
describe('getLineNumberFromJsonLDPath', () => {
  it('supports absolute schema URIs', () => {
    const lineNumber = getLineNumberFromJsonLDPath({
      'http://schema.org/author': {
        'https://schema.org/name': 'Cat',
      },
    }, '/author/name');
    assert.equal(lineNumber, 3);
  });

  it('supports relative schema URIs', () => {
    const lineNumber = getLineNumberFromJsonLDPath({
      'author': {
        name: 'Cat',
      },
    }, '/author/name');
    assert.equal(lineNumber, 3);
  });

  it('supports key paths from expanded JSON-LD (where each value is an array)', () => {
    const lineNumber = getLineNumberFromJsonLDPath({
      'author': {
        name: 'Cat',
      },
    }, '/author/0/name');
    assert.equal(lineNumber, 3);
  });

  it('supports array indices in the path', () => {
    const lineNumber = getLineNumberFromJsonLDPath({
      'author': [
        {
          name: 'Cat',
        },
        {
          name: 'Dog',
        },
      ],
    }, '/author/1/name');
    assert.equal(lineNumber, 7);
  });
});
