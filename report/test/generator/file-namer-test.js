/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
'use strict';

import assert from 'assert/strict';

import {getLhrFilenamePrefix} from '../../generator/file-namer.js';

describe('file-namer helper', () => {
  it('generates filename prefixes', () => {
    const results = {
      finalDisplayedUrl: 'https://testexample.com',
      fetchTime: '2017-01-06T02:34:56.217Z',
    };
    const str = getLhrFilenamePrefix(results);
    // we want the filename to match user timezone, however these tests will run on multiple TZs
    assert.ok(str.startsWith('testexample.com'), 'hostname is missing');
    assert.ok(str.includes('2017-'), 'full year is missing');
    assert.ok(str.endsWith('-56'), 'seconds value is not at the end');
    // regex of hostname_YYYY-MM-DD_HH-MM-SS
    const regex = /testexample\.com_\d{4}-[0-1][[0-9]-[0-1][[0-9]_[0-2][0-9]-[0-5][0-9]-[0-5][0-9]/;
    assert.ok(regex.test(str), `${str} doesn't match pattern: hostname_YYYY-MM-DD_HH-MM-SS`);
  });
});
