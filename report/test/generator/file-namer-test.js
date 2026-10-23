/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */


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

  it('includes pathname when non-root', () => {
    const results = {
      finalDisplayedUrl: 'https://testexample.com/about/team/',
      fetchTime: '2017-01-06T02:34:56.217Z',
    };
    const str = getLhrFilenamePrefix(results);
    const regex =
      /testexample\.com-about-team_\d{4}-[0-1][0-9]-[0-1][0-9]_[0-2][0-9]-[0-5][0-9]-[0-5][0-9]/;
    assert.ok(
      regex.test(str),
      `${str} doesn't match pattern: hostname-pathname_YYYY-MM-DD_HH-MM-SS`
    );
  });

  it('truncates long URLs to keep filenames within filesystem limits', () => {
    const results = {
      finalDisplayedUrl: `https://testexample.com/${'a'.repeat(300)}`,
      fetchTime: '2017-01-06T02:34:56.217Z',
    };
    const str = getLhrFilenamePrefix(results);
    assert.equal(str.length, 220);
    assert.ok(str.startsWith(`testexample.com-${'a'.repeat(184)}_`));
    assert.ok(str.endsWith('-56'));
    assert.ok(Buffer.byteLength(`${str}-0.devtoolslog.json`) <= 255);
  });

  it('truncates long data: URLs to keep filenames within filesystem limits', () => {
    const results = {
      finalDisplayedUrl: `data:text/html,<h1>${'a'.repeat(300)}</h1>`,
      fetchTime: '2017-01-06T02:34:56.217Z',
    };
    const str = getLhrFilenamePrefix(results);
    assert.equal(str.length, 220);
    assert.ok(str.startsWith(`text-html,-h1-${'a'.repeat(186)}_`));
    assert.ok(str.endsWith('-56'));
    assert.ok(Buffer.byteLength(`${str}.report.html`) <= 255);
  });
});
