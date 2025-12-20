/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const bin = require('../../bin.js');

jest.mock('../../run.js', () => ({runLighthouse: jest.fn()}));
jest.mock('../../cli-flags.js', () => ({getFlags: jest.fn()}));
jest.mock('../../sentry-prompt.js', () => ({askPermission: jest.fn()}));
jest.mock('../../../lighthouse-core/lib/sentry.js', () => ({init: jest.fn()}));
jest.mock('lighthouse-logger', () => ({setLevel: jest.fn()}));
jest.mock('update-notifier', () => () => ({notify: () => {}}));

/** @type {jest.Mock} */
let getCLIFlagsFn;
/** @type {jest.Mock} */
let runLighthouseFn;
/** @type {jest.Mock} */
let setLogLevelFn;
/** @type {jest.Mock} */
let askSentryPermissionFn;
/** @type {jest.Mock} */
let initSentryFn;
/** @type {LH.CliFlags} */
let cliFlags;

beforeEach(() => {
  getCLIFlagsFn = /** @type {*} */ (require('../../cli-flags.js').getFlags);
  runLighthouseFn = /** @type {*} */ (require('../../run.js').runLighthouse);
  setLogLevelFn = /** @type {*} */ (require('lighthouse-logger').setLevel);
  askSentryPermissionFn = /** @type {*} */ (require('../../sentry-prompt.js').askPermission);
  initSentryFn = /** @type {*} */ (require('../../../lighthouse-core/lib/sentry.js').init);

  runLighthouseFn.mockReset();
  askSentryPermissionFn.mockReset();
  initSentryFn.mockReset();

  runLighthouseFn.mockResolvedValue({});

  cliFlags = {
    _: ['http://example.com'],
    output: ['html'],
    chromeIgnoreDefaultFlags: false,
    chromeFlags: '',
    outputPath: '',
    saveAssets: false,
    view: false,
    verbose: false,
    quiet: false,
    port: 0,
    hostname: '',
    // Command modes
    listAllAudits: false,
    listTraceCategories: false,
    printConfig: false,
  };

  getCLIFlagsFn.mockReset();
  getCLIFlagsFn.mockImplementation(() => cliFlags);
});

describe('CLI bin', function() {
  function getRunLighthouseArgs() {
    expect(runLighthouseFn).toHaveBeenCalled();
    return runLighthouseFn.mock.calls[0];
  }

  it('should run without failure', async () => {
    await bin.begin();
  });

  describe('config', () => {
    it('should load the config from the path', async () => {
      const configPath = require.resolve('../../../lighthouse-core/config/lr-desktop-config.js');
      cliFlags = {...cliFlags, configPath: configPath};
      const actualConfig = require(configPath);
      await bin.begin();

      expect(getRunLighthouseArgs()[2]).toEqual(actualConfig);
    });

    it('should load the config from the preset', async () => {
      cliFlags = {...cliFlags, preset: 'experimental'};
      const actualConfig = require('../../../lighthouse-core/config/experimental-config.js');
      await bin.begin();

      expect(getRunLighthouseArgs()[2]).toEqual(actualConfig);
    });
  });

  describe('budget', () => {
    it('should load the config from the path', async () => {
      const budgetPath = '../../../lighthouse-core/test/fixtures/simple-budget.json';
      cliFlags = {...cliFlags, budgetPath: require.resolve(budgetPath)};
      const budgetFile = require(budgetPath);
      await bin.begin();

      expect(getRunLighthouseArgs()[1].budgets).toEqual(budgetFile);
    });
  });

  describe('logging', () => {
    it('should have info by default', async () => {
      await bin.begin();
      expect(setLogLevelFn).toHaveBeenCalledWith('info');
    });

    it('should respect verbose', async () => {
      cliFlags = {...cliFlags, verbose: true};
      await bin.begin();
      expect(setLogLevelFn).toHaveBeenCalledWith('verbose');
    });

    it('should respect quiet', async () => {
      cliFlags = {...cliFlags, quiet: true};
      await bin.begin();
      expect(setLogLevelFn).toHaveBeenCalledWith('silent');
    });
  });

  describe('output', () => {
    it('should have no default output path', async () => {
      await bin.begin();

      expect(getRunLighthouseArgs()[1]).toHaveProperty('outputPath', '');
    });

    it('should use stdout when using json', async () => {
      cliFlags = {...cliFlags, output: ['json']};
      await bin.begin();

      expect(getRunLighthouseArgs()[1]).toHaveProperty('outputPath', 'stdout');
    });

    it('should have no default path when using csv', async () => {
      cliFlags = {...cliFlags, output: ['csv']};
      await bin.begin();

      expect(getRunLighthouseArgs()[1]).toHaveProperty('outputPath', '');
    });
  });

  describe('extraHeaders', () => {
    it('should convert extra headers to object', async () => {
      // @ts-ignore - see TODO: in bin.js
      cliFlags = {...cliFlags, extraHeaders: '{"foo": "bar"}'};
      await bin.begin();

      expect(getRunLighthouseArgs()[1]).toHaveProperty('extraHeaders', {foo: 'bar'});
    });

    it('should read extra headers from file', async () => {
      const headersFile = require.resolve('../fixtures/extra-headers/valid.json');
      // @ts-ignore - see TODO: in bin.js
      cliFlags = {...cliFlags, extraHeaders: headersFile};
      await bin.begin();

      expect(getRunLighthouseArgs()[1]).toHaveProperty('extraHeaders', require(headersFile));
    });
  });

  describe('precomputedLanternData', () => {
    it('should read lantern data from file', async () => {
      const lanternDataFile = require.resolve('../fixtures/lantern-data.json');
      cliFlags = {...cliFlags, precomputedLanternDataPath: lanternDataFile};
      await bin.begin();

      expect(getRunLighthouseArgs()[1]).toMatchObject({
        precomputedLanternData: require(lanternDataFile),
        precomputedLanternDataPath: lanternDataFile,
      });
    });

    it('should throw when invalid lantern data used', async () => {
      const headersFile = require.resolve('../fixtures/extra-headers/valid.json');
      cliFlags = {...cliFlags, precomputedLanternDataPath: headersFile};
      await expect(bin.begin()).rejects.toBeTruthy();
    });
  });

  describe('error reporting', () => {
    it('should request permission when no preference set', async () => {
      await bin.begin();

      expect(askSentryPermissionFn).toHaveBeenCalled();
    });

    it('should not request permission when preference set', async () => {
      cliFlags = {...cliFlags, enableErrorReporting: false};
      await bin.begin();

      expect(askSentryPermissionFn).not.toHaveBeenCalled();
    });

    it('should initialize sentry when enabled', async () => {
      cliFlags = {...cliFlags, enableErrorReporting: true};
      await bin.begin();

      expect(initSentryFn).toHaveBeenCalled();
    });

    it('should not initialize sentry when disabled', async () => {
      cliFlags = {...cliFlags, enableErrorReporting: false};
      await bin.begin();

      expect(initSentryFn).not.toHaveBeenCalled();
    });
  });
});
