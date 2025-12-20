/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const assert = require('assert').strict;
const getFilenamePrefix = require('../../lib/file-namer.js').getFilenamePrefix;

/* eslint-env jest */
describe('file-namer helper', () => {
  it('generates filename prefixes', () => {
    const results = {
      finalUrl: 'https://testexample.com',
      fetchTime: '2017-01-06T02:34:56.217Z',
    };
    const str = getFilenamePrefix(results);
    // we want the filename to match user timezone, however these tests will run on multiple TZs
    assert.ok(str.startsWith('testexample.com'), 'hostname is missing');
    assert.ok(str.includes('2017-'), 'full year is missing');
    assert.ok(str.endsWith('-56'), 'seconds value is not at the end');
    // regex of hostname_YYYY-MM-DD_HH-MM-SS
    const regex = /testexample\.com_\d{4}-[0-1][[0-9]-[0-1][[0-9]_[0-2][0-9]-[0-5][0-9]-[0-5][0-9]/;
    assert.ok(regex.test(str), `${str} doesn't match pattern: hostname_YYYY-MM-DD_HH-MM-SS`);
  });
});
