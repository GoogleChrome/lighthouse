/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import jestMock from 'jest-mock';

import {
  createMockDriver,
  createMockBaseArtifacts,
  mockDriverSubmodules,
  mockRunnerModule,
} from './mock-driver.js';
import {fnAny} from '../test-utils.js';
import {networkRecordsToDevtoolsLog} from '../network-records-to-devtools-log.js';
import {Runner as runnerActual} from '../../runner.js';
import {defaultSettings} from '../../config/constants.js';

const mocks = await mockDriverSubmodules();
const mockRunner = await mockRunnerModule();
beforeEach(async () => {
  mockRunner.reset();
  mockRunner.getGathererList.mockImplementation(runnerActual.getGathererList);
  mockRunner.getAuditList.mockImplementation(runnerActual.getAuditList);
});

// Some imports needs to be done dynamically, so that their dependencies will be mocked.
// https://github.com/GoogleChrome/lighthouse/blob/main/docs/hacking-tips.md#mocking-modules-with-testdouble
const runner = await import('../../gather/navigation-runner.js');
const {LighthouseError} = await import('../../lib/lh-error.js');
const DevtoolsLogGatherer = (await import('../../gather/gatherers/devtools-log.js')).default;
const TraceGatherer = (await import('../../gather/gatherers/trace.js')).default;
const {initializeConfig} = await import('../../config/config.js');

/** @typedef {{meta: LH.Gatherer.GathererMeta<'Accessibility'>, getArtifact: Mock<any, any>, startInstrumentation: Mock<any, any>, stopInstrumentation: Mock<any, any>, startSensitiveInstrumentation: Mock<any, any>, stopSensitiveInstrumentation:  Mock<any, any>}} MockGatherer */

describe('NavigationRunner', () => {
  let requestedUrl = '';
  /** @type {LH.NavigationRequestor} */
  let requestor;
  /** @type {ReturnType<typeof createMockDriver>} */
  let mockDriver;
  /** @type {import('../../gather/driver.js').Driver} */
  let driver;
  /** @type {LH.Puppeteer.Page} */
  let page;
  /** @type {LH.Config.ResolvedConfig} */
  let resolvedConfig;
  /** @type {Map<string, LH.ArbitraryEqualityMap>} */
  let computedCache;
  /** @type {LH.BaseArtifacts} */
  let baseArtifacts;

  /** @return {LH.Config.AnyGathererDefn} */
  function createGathererDefn() {
    return {
      instance: {
        meta: {supportedModes: []},
        startInstrumentation: fnAny(),
        stopInstrumentation: fnAny(),
        startSensitiveInstrumentation: fnAny(),
        stopSensitiveInstrumentation: fnAny(),
        getArtifact: fnAny(),
      },
    };
  }

  /** @return {{resolvedConfig: LH.Config.ResolvedConfig, gatherers: {timespan: MockGatherer, snapshot: MockGatherer, navigation: MockGatherer}}} */
  function createMockConfig() {
    const timespanGatherer = createGathererDefn();
    timespanGatherer.instance.meta.supportedModes = ['timespan', 'navigation'];
    timespanGatherer.instance.getArtifact = fnAny().mockResolvedValue({type: 'timespan'});
    const snapshotGatherer = createGathererDefn();
    snapshotGatherer.instance.meta.supportedModes = ['snapshot', 'navigation'];
    snapshotGatherer.instance.getArtifact = fnAny().mockResolvedValue({type: 'snapshot'});
    const navigationGatherer = createGathererDefn();
    navigationGatherer.instance.meta.supportedModes = ['navigation'];
    navigationGatherer.instance.getArtifact = fnAny().mockResolvedValue({type: 'navigation'});

    const resolvedConfig = {
      settings: JSON.parse(JSON.stringify(defaultSettings)),
      artifacts: [
        {id: 'Timespan', gatherer: timespanGatherer},
        {id: 'Snapshot', gatherer: snapshotGatherer},
        {id: 'Navigation', gatherer: navigationGatherer},
      ],
    };

    return {
      // @ts-expect-error
      resolvedConfig,
      gatherers: {
        timespan: /** @type {any} */ (timespanGatherer.instance),
        snapshot: /** @type {any} */ (snapshotGatherer.instance),
        navigation: /** @type {any} */ (navigationGatherer.instance),
      },
    };
  }

  beforeEach(async () => {
    requestedUrl = 'http://example.com';
    requestor = requestedUrl;
    resolvedConfig = (await initializeConfig('navigation')).resolvedConfig;
    computedCache = new Map();
    baseArtifacts = createMockBaseArtifacts();
    baseArtifacts.URL = {finalDisplayedUrl: ''};

    mockDriver = createMockDriver();
    mockDriver.url
      .mockReturnValueOnce('about:blank')
      .mockImplementationOnce(() => requestedUrl);
    driver = mockDriver.asDriver();
    page = mockDriver._page.asPage();

    mocks.reset();
  });

  describe('_setup', () => {
    beforeEach(() => {
      mockDriver._session.sendCommand.mockResponse('Browser.getVersion', {
        product: 'Chrome/88.0',
        userAgent: 'Chrome',
      });
    });

    it('should connect the driver', async () => {
      await runner._setup({driver, resolvedConfig, requestor: requestedUrl});
      expect(mockDriver.connect).toHaveBeenCalled();
    });

    it('should navigate to the blank page if requestor is a string', async () => {
      await runner._setup({driver, resolvedConfig, requestor: requestedUrl});
      expect(mocks.navigationMock.gotoURL).toHaveBeenCalledTimes(1);
      expect(mocks.navigationMock.gotoURL).toHaveBeenCalledWith(
        expect.anything(),
        'about:blank',
        expect.anything()
      );
    });

    it('skip about:blank if using callback requestor', async () => {
      await runner._setup({
        driver,
        resolvedConfig,
        requestor: () => {},
      });
      expect(mocks.navigationMock.gotoURL).not.toHaveBeenCalled();
    });

    it('skip about:blank if config option is set to true', async () => {
      resolvedConfig.settings.skipAboutBlank = true;

      await runner._setup({
        driver,
        resolvedConfig,
        requestor: requestedUrl,
      });
      expect(mocks.navigationMock.gotoURL).not.toHaveBeenCalled();
    });

    it('should collect base artifacts', async () => {
      const {baseArtifacts} =
        await runner._setup({driver, resolvedConfig, requestor: requestedUrl});
      expect(baseArtifacts).toMatchObject({
        URL: {
          finalDisplayedUrl: '',
        },
      });
    });

    it('should prepare the target for navigation', async () => {
      await runner._setup({driver, resolvedConfig, requestor: requestedUrl});
      expect(mocks.prepareMock.prepareTargetForNavigationMode).toHaveBeenCalledTimes(1);
    });

    it('should prepare the target for navigation *after* base artifact collection', async () => {
      mockDriver._executionContext.evaluate.mockReset();
      mockDriver._executionContext.evaluate.mockRejectedValue(new Error('Not available'));
      const setupPromise = runner._setup({driver, resolvedConfig, requestor: requestedUrl});
      await expect(setupPromise).rejects.toThrowError(/Not available/);
      expect(mocks.prepareMock.prepareTargetForNavigationMode).not.toHaveBeenCalled();
    });
  });

  describe('_navigation', () => {
    it('completes an end-to-end navigation', async () => {
      const artifacts = await runner._navigation({
        driver,
        page,
        resolvedConfig: createMockConfig().resolvedConfig,
        requestor,
        computedCache,
        baseArtifacts,
      });
      const artifactIds = Object.keys(artifacts);
      expect(artifactIds).toContain('Timespan');
      expect(artifactIds).toContain('Snapshot');

      // Once for the requested URL. about:blank is done outside this function.
      expect(mocks.navigationMock.gotoURL).toHaveBeenCalledTimes(1);
    });

    it('collects timespan, snapshot, and navigation artifacts', async () => {
      const artifacts = await runner._navigation({
        driver,
        page,
        resolvedConfig: createMockConfig().resolvedConfig,
        requestor,
        computedCache,
        baseArtifacts,
      });
      expect(artifacts).toEqual({
        Navigation: {type: 'navigation'},
        Timespan: {type: 'timespan'},
        Snapshot: {type: 'snapshot'},
      });
    });

    it('supports dependencies between phases', async () => {
      const {resolvedConfig, gatherers} = createMockConfig();
      if (!resolvedConfig.artifacts) throw new Error('No artifacts');
      resolvedConfig.artifacts[1].dependencies = {Accessibility: {id: 'Timespan'}};
      resolvedConfig.artifacts[2].dependencies = {Accessibility: {id: 'Timespan'}};

      const artifacts = await runner._navigation({
        driver,
        page,
        resolvedConfig,
        requestor,
        computedCache,
        baseArtifacts,
      });
      expect(artifacts).toEqual({
        Navigation: {type: 'navigation'},
        Timespan: {type: 'timespan'},
        Snapshot: {type: 'snapshot'},
      });

      expect(gatherers.navigation.getArtifact).toHaveBeenCalled();
      const navigationArgs = gatherers.navigation.getArtifact.mock.calls[0];
      expect(navigationArgs[0].dependencies).toEqual({Accessibility: {type: 'timespan'}});

      expect(gatherers.snapshot.getArtifact).toHaveBeenCalled();
      const snapshotArgs = gatherers.snapshot.getArtifact.mock.calls[0];
      expect(snapshotArgs[0].dependencies).toEqual({Accessibility: {type: 'timespan'}});
    });

    it('passes through an error in dependencies', async () => {
      const {resolvedConfig} = createMockConfig();
      if (!resolvedConfig.artifacts) throw new Error('No artifacts');

      const err = new Error('Error in dependency chain');
      resolvedConfig.artifacts[0].gatherer.instance.startInstrumentation = jestMock
        .fn()
        .mockRejectedValue(err);
      resolvedConfig.artifacts[1].dependencies = {Accessibility: {id: 'Timespan'}};
      resolvedConfig.artifacts[2].dependencies = {Accessibility: {id: 'Timespan'}};

      const artifacts = await runner._navigation({
        driver,
        page,
        resolvedConfig,
        requestor,
        computedCache,
        baseArtifacts,
      });

      expect(artifacts).toEqual({
        Navigation: expect.any(Error),
        Timespan: err,
        Snapshot: expect.any(Error),
      });
    });

    it('passes through an error in startSensitiveInstrumentation', async () => {
      const {resolvedConfig, gatherers} = createMockConfig();
      if (!resolvedConfig.artifacts) throw new Error('No artifacts');

      const err = new Error('Error in startSensitiveInstrumentation');
      gatherers.navigation.startSensitiveInstrumentation.mockRejectedValue(err);

      const artifacts = await runner._navigation({
        driver,
        page,
        resolvedConfig,
        requestor,
        computedCache,
        baseArtifacts,
      });

      expect(artifacts).toEqual({
        Navigation: err,
        Timespan: {type: 'timespan'},
        Snapshot: {type: 'snapshot'},
      });
    });

    it('passes through an error in startInstrumentation', async () => {
      const {resolvedConfig, gatherers} = createMockConfig();
      if (!resolvedConfig.artifacts) throw new Error('No artifacts');

      const err = new Error('Error in startInstrumentation');
      gatherers.timespan.startInstrumentation.mockRejectedValue(err);

      const artifacts = await runner._navigation({
        driver,
        page,
        resolvedConfig,
        requestor,
        computedCache,
        baseArtifacts,
      });

      expect(artifacts).toEqual({
        Navigation: {type: 'navigation'},
        Timespan: err,
        Snapshot: {type: 'snapshot'},
      });
    });

    it('sets navigate errors on base artifacts', async () => {
      const {resolvedConfig} = createMockConfig();
      const noFcp = new LighthouseError(LighthouseError.errors.NO_FCP);

      mocks.navigationMock.gotoURL.mockImplementation(
        /** @param {*} context @param {string} url */
        (context, url) => {
          if (url.includes('blank')) return {finalDisplayedUrl: 'about:blank', warnings: []};
          throw noFcp;
        }
      );

      const artifacts = await runner._navigation({
        driver,
        page,
        resolvedConfig,
        requestor,
        computedCache,
        baseArtifacts,
      });
      expect(baseArtifacts.PageLoadError).toBe(noFcp);
      expect(artifacts).toEqual({});
    });

    it('finds page load errors in network records when available', async () => {
      mocks.navigationMock.gotoURL.mockReturnValue({
        requestedUrl,
        mainDocumentUrl: requestedUrl,
        warnings: [],
      });

      const devtoolsLogInstance = new DevtoolsLogGatherer();
      const traceInstance = new TraceGatherer();

      // @ts-expect-error mock config
      const resolvedConfig = /** @type {LH.Config.ResolvedConfig} */ ({
        settings: JSON.parse(JSON.stringify(defaultSettings)),
        artifacts: [
          {id: 'DevtoolsLog', gatherer: {instance: devtoolsLogInstance}},
          {id: 'Trace', gatherer: {instance: traceInstance}},
        ],
      });

      const devtoolsLog = networkRecordsToDevtoolsLog([{url: requestedUrl, failed: true}]);
      devtoolsLogInstance.getDebugData = fnAny().mockReturnValue(devtoolsLog);
      traceInstance.getDebugData = fnAny().mockReturnValue({traceEvents: []});

      const artifacts = await runner._navigation({
        driver,
        page,
        resolvedConfig,
        requestor,
        computedCache,
        baseArtifacts,
      });

      expect(baseArtifacts.PageLoadError).toBeInstanceOf(LighthouseError);
      expect(artifacts).toEqual({
        DevtoolsLogError: expect.any(Array),
        TraceError: {traceEvents: []},
        devtoolsLogs: {'pageLoadError-defaultPass': expect.any(Array)},
        traces: {'pageLoadError-defaultPass': {traceEvents: []}},
      });
    });

    it('cleans up throttling before getArtifact', async () => {
      const {resolvedConfig, gatherers} = createMockConfig();
      gatherers.navigation.getArtifact = fnAny().mockImplementation(() => {
        expect(mocks.emulationMock.clearThrottling).toHaveBeenCalled();
      });

      await runner._navigation({
        driver,
        page,
        resolvedConfig,
        requestor,
        computedCache,
        baseArtifacts,
      });

      expect(mocks.emulationMock.clearThrottling).toHaveBeenCalledTimes(1);
    });

    it('throws if artifacts are missing', async () => {
      const {resolvedConfig} = createMockConfig();
      resolvedConfig.artifacts = null;

      const artifactsPromise = runner._navigation({
        driver,
        page,
        resolvedConfig,
        requestor,
        computedCache,
        baseArtifacts,
      });

      await expect(artifactsPromise).rejects.toThrow('No artifacts were defined on the config');
    });
  });

  describe('_navigate', () => {
    const run = () =>
      runner._navigate({
        driver,
        page,
        requestor,
        resolvedConfig,
        computedCache,
        baseArtifacts,
      });

    it('should navigate the page', async () => {
      await run();
      expect(mocks.navigationMock.gotoURL).toHaveBeenCalledWith(
        expect.anything(),
        requestedUrl,
        expect.anything()
      );
    });

    it('should return navigate results', async () => {
      const mainDocumentUrl = 'https://lighthouse.example.com/nested/page';
      const warnings = ['Warning A', 'Warning B'];
      mocks.navigationMock.gotoURL.mockResolvedValue({requestedUrl, mainDocumentUrl, warnings});
      const result = await run();
      expect(result).toEqual({requestedUrl, mainDocumentUrl, navigationError: undefined});
      expect(baseArtifacts.LighthouseRunWarnings).toEqual(warnings);
    });

    it('should catch navigation errors', async () => {
      const navigationError = new LighthouseError(LighthouseError.errors.PAGE_HUNG);
      mocks.navigationMock.gotoURL.mockRejectedValue(navigationError);
      const result = await run();
      expect(result).toEqual({
        requestedUrl,
        mainDocumentUrl: requestedUrl,
        navigationError,
      });
      expect(baseArtifacts.LighthouseRunWarnings).toEqual([]);
    });

    it('should throw regular errors', async () => {
      mocks.navigationMock.gotoURL.mockRejectedValue(new Error('Other fatal error'));
      await expect(run()).rejects.toThrowError('Other fatal error');
    });
  });

  describe('_cleanup', () => {
    it('should clear storage when storage was reset', async () => {
      resolvedConfig.settings.disableStorageReset = false;
      await runner._cleanup({requestedUrl, driver, resolvedConfig});
      expect(mocks.storageMock.clearDataForOrigin).toHaveBeenCalled();
    });

    it('should clear storage with user-config clearStorageTypes', async () => {
      resolvedConfig.settings.disableStorageReset = false;
      resolvedConfig.settings.clearStorageTypes = ['cookies', 'indexeddb'];
      await runner._cleanup({requestedUrl, driver, resolvedConfig});
      expect(mocks.storageMock.clearDataForOrigin).toHaveBeenCalledWith(expect.anything(), 'http://example.com', ['cookies', 'indexeddb']);
    });

    it('should not clear storage when storage reset was disabled', async () => {
      resolvedConfig.settings.disableStorageReset = true;
      await runner._cleanup({requestedUrl, driver, resolvedConfig});
      expect(mocks.storageMock.clearDataForOrigin).not.toHaveBeenCalled();
    });
  });

  describe('navigation', () => {
    it('should throw on invalid URL', async () => {
      mockRunner.gather.mockImplementation(runnerActual.gather);

      const navigatePromise = runner.navigationGather(mockDriver._page.asPage(), '');

      await expect(navigatePromise).rejects.toThrow('INVALID_URL');
    });

    it('should initialize config', async () => {
      const flags = {
        formFactor: /** @type {const} */ ('desktop'),
        maxWaitForLoad: 1234,
        screenEmulation: {mobile: false},
      };

      await runner.navigationGather(
        mockDriver._page.asPage(),
        'http://example.com',
        {flags}
      );

      expect(mockRunner.gather.mock.calls[0][1]).toMatchObject({
        resolvedConfig: {
          settings: flags,
        },
      });
    });
  });
});
