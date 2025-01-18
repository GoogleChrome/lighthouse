/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import {I18nFormatter} from '../../renderer/i18n-formatter.js';

const NBSP = '\xa0';

describe('i18n formatter', () => {
  it('formats a number', () => {
    const i18n = new I18nFormatter('en');
    assert.strictEqual(i18n.formatNumber(10), '10');
    assert.strictEqual(i18n.formatNumber(100.01), '100.01');
    assert.strictEqual(i18n.formatNumber(13000.456), '13,000.456');
    assert.strictEqual(i18n.formatNumber(13000.456444), '13,000.456');

    assert.strictEqual(i18n.formatNumber(10, 0.1), '10.0');
    assert.strictEqual(i18n.formatNumber(100.01, 0.1), '100.0');
    assert.strictEqual(i18n.formatNumber(13000.456, 0.1), '13,000.5');

    assert.strictEqual(i18n.formatNumber(0), '0');
    assert.strictEqual(i18n.formatNumber(-0), '0');
    assert.strictEqual(i18n.formatNumber(-0, 0.1), '0.0');
    assert.strictEqual(i18n.formatNumber(0.000001), '0');
    assert.strictEqual(i18n.formatNumber(-0.000001), '0');
    assert.strictEqual(i18n.formatNumber(0.000001, 0.1), '0.0');
    assert.strictEqual(i18n.formatNumber(-0.000001, 0.1), '0.0');

    assert.strictEqual(i18n.formatNumber(10), '10');
    assert.strictEqual(i18n.formatNumber(100.01), '100.01');
    assert.strictEqual(i18n.formatNumber(13000.456, 0.1), '13,000.5');

    assert.strictEqual(i18n.formatInteger(10), '10');
    assert.strictEqual(i18n.formatInteger(100.01), '100');
    assert.strictEqual(i18n.formatInteger(13000.6), '13,001');
  });

  it('formats a date', () => {
    const i18n = new I18nFormatter('en');
    const timestamp = i18n.formatDateTime('2017-04-28T23:07:51.189Z');
    assert.ok(
      timestamp.includes('Apr 27, 2017') ||
      timestamp.includes('Apr 28, 2017') ||
      timestamp.includes('Apr 29, 2017')
    );
  });

  it('formats bytes', () => {
    const i18n = new I18nFormatter('en');
    assert.equal(i18n.formatBytesToKiB(100), `0.098${NBSP}KiB`);
    assert.equal(i18n.formatBytesToKiB(100, 0.1), `0.1${NBSP}KiB`);
    assert.equal(i18n.formatBytesToKiB(2000, 0.1), `2.0${NBSP}KiB`);
    assert.equal(i18n.formatBytesToKiB(1014 * 1024, 0.1), `1,014.0${NBSP}KiB`);
  });

  it('formats bytes with different granularities', () => {
    const i18n = new I18nFormatter('en');

    let granularity = 10;
    assert.strictEqual(i18n.formatBytes(15.0, granularity), `20${NBSP}bytes`);
    assert.strictEqual(i18n.formatBytes(15.12345, granularity), `20${NBSP}bytes`);
    assert.strictEqual(i18n.formatBytes(14.99999, granularity), `10${NBSP}bytes`);

    granularity = 1;
    assert.strictEqual(i18n.formatBytes(15.0, granularity), `15${NBSP}bytes`);
    assert.strictEqual(i18n.formatBytes(15.12345, granularity), `15${NBSP}bytes`);
    assert.strictEqual(i18n.formatBytes(15.54321, granularity), `16${NBSP}bytes`);

    granularity = 0.1;
    assert.strictEqual(i18n.formatBytes(15.0, granularity), `15.0${NBSP}bytes`);
    assert.strictEqual(i18n.formatBytes(15.12345, granularity), `15.1${NBSP}bytes`);
    assert.strictEqual(i18n.formatBytes(15.19999, granularity), `15.2${NBSP}bytes`);

    granularity = 0.01;
    assert.strictEqual(i18n.formatBytes(15.0, granularity), `15.00${NBSP}bytes`);
    assert.strictEqual(i18n.formatBytes(15.12345, granularity), `15.12${NBSP}bytes`);
    assert.strictEqual(i18n.formatBytes(15.19999, granularity), `15.20${NBSP}bytes`);
  });

  it('formats bytes with invalid granularity', () => {
    const i18n = new I18nFormatter('en');
    const granularity = 0.5;
    const originalWarn = console.warn;

    try {
      console.warn = () => {};
      assert.strictEqual(i18n.formatBytes(15.0, granularity), `15${NBSP}bytes`);
      assert.strictEqual(i18n.formatBytes(15.12345, granularity), `15${NBSP}bytes`);
      assert.strictEqual(i18n.formatBytes(15.54321, granularity), `16${NBSP}bytes`);
    } finally {
      console.warn = originalWarn;
    }
  });

  it('formats kibibytes with different granularities', () => {
    const i18n = new I18nFormatter('en');

    let granularity = 10;
    assert.strictEqual(i18n.formatBytesToKiB(5 * 1024, granularity), `10${NBSP}KiB`);
    assert.strictEqual(i18n.formatBytesToKiB(4 * 1024, granularity), `0${NBSP}KiB`);

    granularity = 1;
    assert.strictEqual(i18n.formatBytesToKiB(5 * 1024, granularity), `5${NBSP}KiB`);
    assert.strictEqual(i18n.formatBytesToKiB(4 * 1024 + 512, granularity), `5${NBSP}KiB`);
    assert.strictEqual(i18n.formatBytesToKiB(4 * 1024 + 511, granularity), `4${NBSP}KiB`);

    granularity = 0.01;
    assert.strictEqual(i18n.formatBytesToKiB(5 * 1024, granularity), `5.00${NBSP}KiB`);
    assert.strictEqual(i18n.formatBytesToKiB(5 * 1024 - 5, granularity), `5.00${NBSP}KiB`);
    assert.strictEqual(i18n.formatBytesToKiB(5 * 1024 - 6, granularity), `4.99${NBSP}KiB`);
  });

  it('formats ms', () => {
    const i18n = new I18nFormatter('en');
    assert.equal(i18n.formatMilliseconds(123, 10), `120${NBSP}ms`);
    assert.equal(i18n.formatMilliseconds(2456.5, 0.1), `2,456.5${NBSP}ms`);
    assert.equal(i18n.formatMilliseconds(0.000001), `0${NBSP}ms`);
    assert.equal(i18n.formatMilliseconds(-0.000001), `0${NBSP}ms`);
  });

  it('formats a duration', () => {
    const i18n = new I18nFormatter('en');
    assert.equal(i18n.formatDuration(60 * 1000), '1m');
    assert.equal(i18n.formatDuration(60 * 60 * 1000 + 5000), '1h 5s');
    assert.equal(i18n.formatDuration(28 * 60 * 60 * 1000 + 5000), '1d 4h 5s');
  });

  it('formats a duration based on locale', () => {
    let i18n = new I18nFormatter('de');
    assert.equal(i18n.formatDuration(60 * 1000), `1${NBSP}Min.`);
    assert.equal(i18n.formatDuration(60 * 60 * 1000 + 5000), `1${NBSP}Std. 5${NBSP}Sek.`);
    assert.equal(
      i18n.formatDuration(28 * 60 * 60 * 1000 + 5000), `1${NBSP}T 4${NBSP}Std. 5${NBSP}Sek.`);

    // Yes, this is actually backwards (s h d).
    i18n = new I18nFormatter('ar');
    /* eslint-disable no-irregular-whitespace */
    assert.equal(i18n.formatDuration(60 * 1000), `١${NBSP}د`);
    assert.equal(i18n.formatDuration(60 * 60 * 1000 + 5000), `١${NBSP}س ٥${NBSP}ث`);
    assert.equal(i18n.formatDuration(28 * 60 * 60 * 1000 + 5000), `١ ي ٤ س ٥ ث`);
    /* eslint-enable no-irregular-whitespace */
  });

  it('formats numbers based on locale', () => {
    // Requires full-icu or Intl polyfill.
    const number = 12346.858558;

    const i18n = new I18nFormatter('de');
    assert.strictEqual(i18n.formatNumber(number), '12.346,859');
    assert.strictEqual(i18n.formatBytesToKiB(number, 0.1), `12,1${NBSP}KiB`);
    assert.strictEqual(i18n.formatMilliseconds(number, 10), `12.350${NBSP}ms`);
    assert.strictEqual(i18n.formatSeconds(number), `12,347${NBSP}Sek.`);
  });

  it('uses decimal comma with en-XA test locale', () => {
    // Requires full-icu or Intl polyfill.
    const number = 12346.858558;

    const i18n = new I18nFormatter('en-XA');
    assert.strictEqual(i18n.formatNumber(number), '12.346,859');
    assert.strictEqual(i18n.formatBytesToKiB(number, 0.1), `12,1${NBSP}KiB`);
    assert.strictEqual(i18n.formatMilliseconds(number, 100), `12.300${NBSP}ms`);
    assert.strictEqual(i18n.formatSeconds(number, 1), `12${NBSP}Sek.`);
  });

  it('should not crash on unknown locales', () => {
    const i18n = new I18nFormatter('unknown-mystery-locale');
    const timestamp = i18n.formatDateTime('2017-04-28T23:07:51.189Z');
    assert.ok(
      timestamp.includes('Apr 27, 2017') ||
      timestamp.includes('Apr 28, 2017') ||
      timestamp.includes('Apr 29, 2017')
    );
  });
});
