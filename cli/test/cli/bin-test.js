/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {pathToFileURL} from 'url';

import * as td from 'testdouble';
import jestMock from 'jest-mock';

import {LH_ROOT} from '../../../shared/root.js';
import {readJson} from '../../../core/test/test-utils.js';

const mockRunLighthouse = jestMock.fn();
const mockGetFlags = jestMock.fn();
const mockAskPermission = jestMock.fn();
const mockSentryInit = jestMock.fn();
const mockLoggerSetLevel = jestMock.fn();

/** @type {import('../../bin.js')} */
let bin;
before(async () => {
  await td.replaceEsm('../../run.js', {
    runLighthouse: mockRunLighthouse,
  });
  await td.replaceEsm('../../cli-flags.js', {
    getFlags: mockGetFlags,
  });
  await td.replaceEsm('../../sentry-prompt.js', {
    askPermission: mockAskPermission,
  });
  await td.replaceEsm('../../../core/lib/sentry.js', {
    Sentry: {
      init: mockSentryInit,
    },
  });
  await td.replaceEsm('lighthouse-logger', undefined, {setLevel: mockLoggerSetLevel});
  bin = await import('../../bin.js');
});

/** @type {LH.CliFlags} */
let cliFlags;

beforeEach(async () => {
  mockAskPermission.mockReset();
  mockGetFlags.mockReset();
  mockLoggerSetLevel.mockReset();
  mockRunLighthouse.mockReset();
  mockSentryInit.mockReset();
  mockRunLighthouse.mockResolvedValue({});
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
    listLocales: false,
    listTraceCategories: false,
  };
  mockGetFlags.mockImplementation(() => cliFlags);
});

describe('CLI bin', function() {
  /**
   * @return {any}
   */
  function getRunLighthouseArgs() {
    expect(mockRunLighthouse).toHaveBeenCalled();
    return mockRunLighthouse.mock.calls[0];
  }

  it('should run without failure', async () => {
    await bin.begin();
  });

  describe('config', () => {
    it('should load the config from the path (common js)', async () => {
      // TODO(esmodules): change this test when config file is esm.
      const configPath = `${LH_ROOT}/core/config/lr-desktop-config.js`;
      cliFlags = {...cliFlags, configPath: configPath};
      const actualConfig = (await import(pathToFileURL(configPath).href)).default;
      await bin.begin();

      expect(getRunLighthouseArgs()[2]).toEqual(actualConfig);
    });

    it('should load the config from the path (es modules)', async () => {
      const configPath =
        `${LH_ROOT}/cli/test/fixtures/esm-config.js`;
      cliFlags = {...cliFlags, configPath: configPath};
      const actualConfig = (await import(pathToFileURL(configPath).href)).default;
      await bin.begin();

      expect(getRunLighthouseArgs()[2]).toEqual(actualConfig);
    });

    it('should load the config from the desktop preset', async () => {
      cliFlags = {...cliFlags, preset: 'desktop'};
      const actualConfig =
        (await import('../../../core/config/desktop-config.js')).default;
      await bin.begin();

      expect(getRunLighthouseArgs()[2]).toEqual(actualConfig);
    });
  });

  describe('logging', () => {
    it('should have info by default', async () => {
      await bin.begin();
      expect(mockLoggerSetLevel).toHaveBeenCalledWith('info');
    });

    it('should respect verbose', async () => {
      cliFlags = {...cliFlags, verbose: true};
      await bin.begin();
      expect(mockLoggerSetLevel).toHaveBeenCalledWith('verbose');
    });

    it('should respect quiet', async () => {
      cliFlags = {...cliFlags, quiet: true};
      await bin.begin();
      expect(mockLoggerSetLevel).toHaveBeenCalledWith('silent');
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

  describe('precomputedLanternData', () => {
    it('should read lantern data from file', async () => {
      const lanternDataFile = `${LH_ROOT}/cli/test/fixtures/lantern-data.json`;
      cliFlags = {...cliFlags, precomputedLanternDataPath: lanternDataFile};
      await bin.begin();

      expect(getRunLighthouseArgs()[1]).toMatchObject({
        precomputedLanternData: readJson(lanternDataFile),
        precomputedLanternDataPath: lanternDataFile,
      });
    });

    it('should throw when invalid lantern data used', async () => {
      const headersFile = `${LH_ROOT}/cli/test/fixtures/extra-headers/valid.json`;
      cliFlags = {...cliFlags, precomputedLanternDataPath: headersFile};
      await expect(bin.begin()).rejects.toBeTruthy();
    });
  });

  describe('error reporting', () => {
    it('should request permission when no preference set', async () => {
      await bin.begin();

      expect(mockAskPermission).toHaveBeenCalled();
    });

    it('should not request permission when preference set', async () => {
      cliFlags = {...cliFlags, enableErrorReporting: false};
      await bin.begin();

      expect(mockAskPermission).not.toHaveBeenCalled();
    });

    it('should initialize sentry when enabled', async () => {
      cliFlags = {...cliFlags, enableErrorReporting: true};
      await bin.begin();

      expect(mockSentryInit).toHaveBeenCalled();
    });

    it('should not initialize sentry when disabled', async () => {
      cliFlags = {...cliFlags, enableErrorReporting: false};
      await bin.begin();

      expect(mockSentryInit).not.toHaveBeenCalled();
    });
  });
});
