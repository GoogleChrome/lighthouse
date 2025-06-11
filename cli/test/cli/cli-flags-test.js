/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';
import fs from 'fs';

import {getFlags, getYargsParser} from '../../cli-flags.js';
import {LH_ROOT} from '../../../shared/root.js';

/**
 * @param {LH.CliFlags} flags
 */
function snapshot(flags) {
  flags = {...flags};

  // `path` properties will have different values based on the filesystem,
  // so normalize.
  for (const [k, v] of Object.entries(flags)) {
    if (typeof v === 'string') {
      // @ts-expect-error
      flags[k] = v
        .replace(process.cwd(), '__REPLACED__')
        .replace(/\\/g, '/');
    }
  }
  // Command changes depending on how test was run, so remove.
  // @ts-expect-error - '$0' not in CliFlags type.
  flags.$0 = '__REPLACED__';

  expect(flags).toMatchSnapshot();
}

describe('CLI flags', function() {
  it('all options should have descriptions', () => {
    const parser = getYargsParser();
    // @ts-expect-error - getGroups is private
    const optionGroups = parser.getGroups();
    /** @type {string[]} */
    const allOptions = [];
    Object.keys(optionGroups).forEach(key => {
      allOptions.push(...optionGroups[key]);
    });
    const optionsWithDescriptions =
      // @ts-expect-error - getUsageInstance is private
      Object.keys(parser.getInternalMethods().getUsageInstance().getDescriptions());

    allOptions.forEach(opt => {
      assert.ok(optionsWithDescriptions.includes(opt), `cli option '${opt}' has no description`);
    });
  });

  it('settings are accepted from a file path', () => {
    const flags = getFlags([
      'http://www.example.com',
      `--cli-flags-path="${LH_ROOT}/cli/test/fixtures/cli-flags-path.json"`,
    ].join(' '));

    expect(flags).toMatchObject({
      onlyCategories: ['performance', 'seo'],
      chromeFlags: '--window-size 800,600',
      extraHeaders: {'X-Men': 'wolverine'},
      throttlingMethod: 'devtools',
      throttling: {
        requestLatencyMs: 700,
        cpuSlowdownMultiplier: 6,
      },
    });
    snapshot(flags);
  });

  it('array values support csv when appropriate', () => {
    const flags = getFlags([
      'http://www.example.com',
      '--only-categories=performance,seo',
      '--skipAudits=unused-javascript,redirects',
      '--skipAudits=bootup-time',
    ].join(' '));
    expect(flags.onlyCategories).toEqual(['performance', 'seo']);
    expect(flags.skipAudits).toEqual(['unused-javascript', 'redirects', 'bootup-time']);
    snapshot(flags);
  });

  it('array values do not support csv when appropriate', () => {
    const flags = getFlags([
      'http://www.example.com',
      '--chrome-flags="--window-size 800,600"',
      '--chrome-flags="--enabled-features=NetworkService,VirtualTime"',
      '--blockedUrlPatterns=.*x,y\\.png',
    ].join(' '));
    expect(flags.chromeFlags).toEqual([
      '--window-size 800,600',
      '--enabled-features=NetworkService,VirtualTime',
    ]);
    expect(flags.blockedUrlPatterns).toEqual(['.*x,y\\.png']);
    snapshot(flags);
  });

  describe('extraHeaders', () => {
    it('should convert extra headers to object', async () => {
      const flags = getFlags([
        'http://www.example.com',
        '--extra-headers="{"foo": "bar"}"',
      ].join(' '));

      expect(flags).toHaveProperty('extraHeaders', {foo: 'bar'});
      snapshot(flags);
    });

    it('should read extra headers from file', () => {
      const headersFile = `${LH_ROOT}/cli/test/fixtures/extra-headers/valid.json`;
      const headers = JSON.parse(fs.readFileSync(headersFile, 'utf-8'));
      const flags = getFlags([
        'http://www.example.com',
        `--extra-headers=${headersFile}`,
      ].join(' '));

      expect(flags).toHaveProperty('extraHeaders', headers);
      snapshot(flags);
    });
  });

  describe('screenEmulation', () => {
    const url = 'http://www.example.com';

    describe('width', () => {
      it('parses a number value', () => {
        const flags = getFlags(`${url} --screenEmulation.width=500`, {noExitOnFailure: true});
        expect(flags.screenEmulation).toEqual({width: 500});
        snapshot(flags);
      });

      it('throws on a non-number', () => {
        expect(() => getFlags(`${url} --screenEmulation.width=yah`, {noExitOnFailure: true}))
          .toThrow(`Invalid value: 'screenEmulation.width' must be a number`);
      });

      it('throws with no flag value', () => {
        expect(() => getFlags(`${url} --screenEmulation.width`, {noExitOnFailure: true}))
          .toThrow(`Invalid value: 'screenEmulation.width' must be a number`);
      });
    });

    describe('height', () => {
      it('parses a number value', () => {
        const flags = getFlags(`${url} --screenEmulation.height=123`, {noExitOnFailure: true});
        expect(flags.screenEmulation).toEqual({height: 123});
      });

      it('throws on a non-number', () => {
        expect(() => getFlags(`${url} --screenEmulation.height=false`, {noExitOnFailure: true}))
          .toThrow(`Invalid value: 'screenEmulation.height' must be a number`);
      });

      it('throws with no flag value', () => {
        expect(() => getFlags(`${url} --screenEmulation.height`, {noExitOnFailure: true}))
          .toThrow(`Invalid value: 'screenEmulation.height' must be a number`);
      });
    });

    describe('deviceScaleFactor', () => {
      it('parses a non-integer numeric value', () => {
        const flags = getFlags(`${url} --screenEmulation.deviceScaleFactor=1.325`,
            {noExitOnFailure: true});
        expect(flags.screenEmulation).toEqual({deviceScaleFactor: 1.325});
        snapshot(flags);
      });

      it('throws on a non-number', () => {
        expect(() => getFlags(`${url} --screenEmulation.deviceScaleFactor=12px`,
            {noExitOnFailure: true}))
          .toThrow(`Invalid value: 'screenEmulation.deviceScaleFactor' must be a number`);
      });

      it('throws with no flag value', () => {
        expect(() => getFlags(`${url} --screenEmulation.deviceScaleFactor`,
            {noExitOnFailure: true}))
          .toThrow(`Invalid value: 'screenEmulation.deviceScaleFactor' must be a number`);
      });
    });

    describe('mobile', () => {
      it('parses the flag with no value as true', () => {
        const flags = getFlags(`${url} --screenEmulation.mobile`, {noExitOnFailure: true});
        expect(flags.screenEmulation).toEqual({mobile: true});
        snapshot(flags);
      });

      it('parses the --no-mobile flag as false', () => {
        const flags = getFlags(`${url} --no-screenEmulation.mobile`, {noExitOnFailure: true});
        expect(flags.screenEmulation).toEqual({mobile: false});
      });

      it('parses the flag with a boolean value', () => {
        const flagsTrue = getFlags(`${url} --screenEmulation.mobile=true`, {noExitOnFailure: true});
        expect(flagsTrue.screenEmulation).toEqual({mobile: true});
        const flagsFalse = getFlags(`${url} --screenEmulation.mobile=false`,
            {noExitOnFailure: true});
        expect(flagsFalse.screenEmulation).toEqual({mobile: false});
      });

      it('throws on a non-boolean value', () => {
        expect(() => getFlags(`${url} --screenEmulation.mobile=2`, {noExitOnFailure: true}))
          .toThrow(`Invalid value: 'screenEmulation.mobile' must be a boolean`);
      });
    });

    describe('disabled', () => {
      it('parses the flag with no value as true', () => {
        const flags = getFlags(`${url} --screenEmulation.disabled`, {noExitOnFailure: true});
        expect(flags.screenEmulation).toEqual({disabled: true});
        snapshot(flags);
      });

      it('parses the --no-disabled flag as false', () => {
        const flags = getFlags(`${url} --no-screenEmulation.disabled`, {noExitOnFailure: true});
        expect(flags.screenEmulation).toEqual({disabled: false});
      });

      it('parses the flag with a boolean value', () => {
        const flagsTrue = getFlags(`${url} --screenEmulation.disabled=true`,
            {noExitOnFailure: true});
        expect(flagsTrue.screenEmulation).toEqual({disabled: true});
        const flagsFalse = getFlags(`${url} --screenEmulation.disabled=false`,
            {noExitOnFailure: true});
        expect(flagsFalse.screenEmulation).toEqual({disabled: false});
      });

      it('throws on a non-boolean value', () => {
        expect(() => getFlags(`${url} --screenEmulation.disabled=str`, {noExitOnFailure: true}))
          .toThrow(`Invalid value: 'screenEmulation.disabled' must be a boolean`);
      });
    });

    describe('outputPath', () => {
      it('throws when path cannot be written to', () => {
        expect(() => getFlags(`${url} --output-path=i/do/not/exist.json`, {noExitOnFailure: true}))
          .toThrow('--output-path (i/do/not/exist.json) cannot be written to');
        expect(() => getFlags(`${url} --output-path=ok.json`, {noExitOnFailure: true}))
          .not.toThrow();
      });
    });
  });
});
