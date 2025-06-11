/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';
import {spawnSync} from 'child_process';

import {LH_ROOT} from '../../../shared/root.js';

const indexPath = `${LH_ROOT}/cli/index.js`;

describe('CLI Tests', function() {
  it('fails if a url is not provided', () => {
    const ret = spawnSync('node', [indexPath], {encoding: 'utf8'});
    assert.ok(ret.stderr.includes('Please provide a url'));
    assert.equal(ret.status, 1);
  });

  it('should list options via --help', () => {
    const ret = spawnSync('node', [indexPath, '--help'], {encoding: 'utf8', maxBuffer: 10_000_000});
    expect(ret.stdout).toContain('lighthouse <url>');
    expect(ret.stdout).toContain('Examples:');
    // FIXME: yargs does not wait to flush stdout before exiting the process,
    // `--help` can flakily not contain the entire output when isTTY is false.
    // expect(ret.stdout).toContain('For more information on Lighthouse');
  });

  it('should list all audits without a url and exit immediately after', () => {
    const ret = spawnSync('node', [indexPath, '--list-all-audits'], {encoding: 'utf8'});

    const output = JSON.parse(ret.stdout);
    assert.ok(Array.isArray(output.audits));
    assert.ok(output.audits.length > 0);
  });

  it('accepts just the list-trace-categories flag and exit immediately after', () => {
    const ret = spawnSync('node', [indexPath, '--list-trace-categories'], {encoding: 'utf8'});

    const output = JSON.parse(ret.stdout);
    assert.ok(Array.isArray(output.traceCategories));
    assert.ok(output.traceCategories.length > 0);
  });

  it('accepts just the list-locales flag and exit immediately after', () => {
    const ret = spawnSync('node', [indexPath, '--list-locales'], {encoding: 'utf8'});

    const output = JSON.parse(ret.stdout);
    assert.ok(Array.isArray(output.locales));
    assert.ok(output.locales.length > 52);
    for (const lang of ['en', 'es', 'ru', 'zh']) {
      assert.ok(output.locales.includes(lang));
    }
  });

  describe('extra-headers', () => {
    it('should exit with a error if the path is not valid', () => {
      const ret = spawnSync('node', [indexPath, 'https://www.google.com',
        '--extra-headers=./fixtures/extra-headers/not-found.json'], {encoding: 'utf8'});

      assert.ok(ret.stderr.includes('no such file or directory'));
      assert.equal(ret.status, 1);
    });

    it('should exit with a error if the file does not contain valid JSON', () => {
      const ret = spawnSync('node', [indexPath, 'https://www.google.com',
        '--extra-headers',
        `${LH_ROOT}/cli/test/fixtures/extra-headers/invalid.txt`], {encoding: 'utf8'});

      assert.ok(ret.stderr.includes('Unexpected token'));
      assert.equal(ret.status, 1);
    });

    it('should exit with a error if the passsed in string is not valid JSON', () => {
      const ret = spawnSync('node', [indexPath, 'https://www.google.com',
        '--extra-headers', '{notjson}'], {encoding: 'utf8'});

      // This message was changed in Node 20, check for old and new versions.
      assert.ok(/(Unexpected token|Expected property name)/.test(ret.stderr));
      assert.equal(ret.status, 1);
    });
  });
});
