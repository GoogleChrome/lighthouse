/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as jestMock from 'jest-mock';

import * as helpers from '../../gather/runner-helpers.js';
import BaseGatherer from '../../gather/base-gatherer.js';
import {defaultSettings} from '../../config/constants.js';
import {LighthouseError} from '../../lib/lh-error.js';
import {Sentry} from '../../lib/sentry.js';
import {createMockDriver, createMockGathererInstance, createMockBaseArtifacts} from './mock-driver.js';

describe('collectArtifactDependencies', () => {
  /** @type {LH.Config.AnyArtifactDefn} */
  let artifact;
  /** @type {Record<string, any>} */
  let artifactStateById;

  beforeEach(() => {
    class GathererWithDependency extends BaseGatherer {
      meta = {...new BaseGatherer().meta, dependencies: {ImageElements: Symbol('')}};
    }

    artifact = {
      id: 'Artifact',
      gatherer: {instance: new GathererWithDependency()},
      dependencies: {ImageElements: {id: 'Dependency'}},
    };
    artifactStateById = {
      Dependency: [],
    };
  });

  it('should handle no dependencies', async () => {
    artifact.dependencies = undefined;
    const result = await helpers.collectArtifactDependencies(artifact, artifactStateById);
    expect(result).toEqual({});
  });

  it('should handle empty dependencies', async () => {
    // @ts-expect-error - this isn't valid given our set of types, but plugins might do this.
    artifact.dependencies = {};
    const result = await helpers.collectArtifactDependencies(artifact, artifactStateById);
    expect(result).toEqual({});
  });

  it('should handle successful dependencies', async () => {
    const result = await helpers.collectArtifactDependencies(artifact, artifactStateById);
    expect(result).toEqual({ImageElements: []});
  });

  it('should handle successful promise dependencies', async () => {
    artifactStateById.Dependency = Promise.resolve([]);
    const result = await helpers.collectArtifactDependencies(artifact, artifactStateById);
    expect(result).toEqual({ImageElements: []});
  });

  it('should handle falsy dependencies', async () => {
    artifactStateById.Dependency = null;
    const result = await helpers.collectArtifactDependencies(artifact, artifactStateById);
    expect(result).toEqual({ImageElements: null});
  });

  it('should handle missing dependencies', async () => {
    artifactStateById.Dependency = undefined;
    const result = helpers.collectArtifactDependencies(artifact, artifactStateById);
    await expect(result).rejects.toMatchObject({message: expect.stringContaining('did not run')});
  });

  it('should handle errored dependencies', async () => {
    artifactStateById.Dependency = Promise.reject(new Error('DEP_FAILURE'));
    const result = helpers.collectArtifactDependencies(artifact, artifactStateById);
    await expect(result).rejects.toMatchObject({
      message: expect.stringContaining('"Dependency" failed with exception: DEP_FAILURE'),
    });
  });
});

describe('collectPhaseArtifacts', () => {
  /** @type {import('../../gather/runner-helpers').ArtifactState} */
  let artifactState = {
    startInstrumentation: {},
    startSensitiveInstrumentation: {},
    stopSensitiveInstrumentation: {},
    stopInstrumentation: {},
    getArtifact: {},
  };

  /** @type {ReturnType<ReturnType<typeof createMockDriver>['asDriver']>} */
  let driver;
  /** @type {LH.Puppeteer.Page} */
  let page;
  /** @type {ReturnType<typeof createMockDriver>} */
  let mockDriver;
  /** @type {LH.BaseArtifacts} */
  let baseArtifacts;

  function createGathererSet() {
    const timespan = createMockGathererInstance({supportedModes: ['timespan', 'navigation']});
    timespan.getArtifact.mockResolvedValue({type: 'timespan'});
    const snapshot = createMockGathererInstance({supportedModes: ['snapshot', 'navigation']});
    snapshot.getArtifact.mockResolvedValue({type: 'snapshot'});
    const navigation = createMockGathererInstance({supportedModes: ['navigation']});
    navigation.getArtifact.mockResolvedValue({type: 'navigation'});

    return {
      artifactDefinitions: [
        {id: 'Timespan', gatherer: {instance: timespan.asGatherer()}},
        {id: 'Snapshot', gatherer: {instance: snapshot.asGatherer()}},
        {id: 'Navigation', gatherer: {instance: navigation.asGatherer()}},
      ],
      gatherers: {timespan, snapshot, navigation},
    };
  }

  beforeEach(() => {
    mockDriver = createMockDriver();
    page = mockDriver._page.asPage();
    driver = mockDriver.asDriver();
    artifactState = {
      startInstrumentation: {},
      startSensitiveInstrumentation: {},
      stopSensitiveInstrumentation: {},
      stopInstrumentation: {},
      getArtifact: {},
    };
    baseArtifacts = createMockBaseArtifacts();
  });

  for (const phase_ of Object.keys(artifactState)) {
    const phase = /** @type {keyof typeof artifactState} */ (phase_);
    for (const gatherMode of ['navigation', 'timespan', 'snapshot']) {
      it(`should run the ${phase} phase of gatherers in ${gatherMode} mode`, async () => {
        const {artifactDefinitions, gatherers} = createGathererSet();
        await helpers.collectPhaseArtifacts({
          driver,
          page,
          artifactDefinitions,
          artifactState,
          phase,
          baseArtifacts,
          gatherMode: /** @type {any} */ (gatherMode),
          computedCache: new Map(),
          settings: defaultSettings,
        });
        expect(artifactState[phase]).toEqual({
          Timespan: expect.any(Promise),
          Snapshot: expect.any(Promise),
          Navigation: expect.any(Promise),
        });
        expect(gatherers.navigation[phase]).toHaveBeenCalled();
        expect(gatherers.timespan[phase]).toHaveBeenCalled();
        expect(gatherers.snapshot[phase]).toHaveBeenCalled();
      });
    }
  }

  it('should gather the artifacts', async () => {
    const {artifactDefinitions} = createGathererSet();
    await helpers.collectPhaseArtifacts({
      driver,
      page,
      artifactDefinitions,
      artifactState,
      gatherMode: 'navigation',
      phase: 'getArtifact',
      baseArtifacts,
      computedCache: new Map(),
      settings: defaultSettings,
    });
    expect(await artifactState.getArtifact.Snapshot).toEqual({type: 'snapshot'});
    expect(await artifactState.getArtifact.Timespan).toEqual({type: 'timespan'});
    expect(await artifactState.getArtifact.Navigation).toEqual({type: 'navigation'});
  });

  it('should pass dependencies to gatherers', async () => {
    const {artifactDefinitions: artifacts_, gatherers} = createGathererSet();
    const gatherer =
      /** @type {{instance: LH.Gatherer.GathererInstance}} */
      (artifacts_[1].gatherer);
    const imageElementsGatherer =
      /** @type {{instance: LH.Gatherer.GathererInstance<'ImageElements'>}} */
      (artifacts_[1].gatherer);
    const artifactDefinitions = [
      {id: 'Dependency', gatherer},
      {
        id: 'Snapshot',
        gatherer: imageElementsGatherer,
        dependencies: {ImageElements: {id: 'Dependency'}},
      },
    ];

    await helpers.collectPhaseArtifacts({
      driver,
      page,
      artifactDefinitions,
      artifactState,
      gatherMode: 'navigation',
      phase: 'getArtifact',
      baseArtifacts,
      computedCache: new Map(),
      settings: defaultSettings,
    });
    expect(artifactState.getArtifact).toEqual({
      Dependency: expect.any(Promise),
      Snapshot: expect.any(Promise),
    });

    // Ensure neither threw an exception
    await artifactState.getArtifact.Dependency;
    await artifactState.getArtifact.Snapshot;

    expect(gatherers.snapshot.getArtifact).toHaveBeenCalledTimes(2);

    const receivedDependencies = gatherers.snapshot.getArtifact.mock.calls[1][0].dependencies;
    expect(receivedDependencies).toEqual({
      ImageElements: {type: 'snapshot'},
    });
  });

  it('should combine the previous promises', async () => {
    artifactState.stopInstrumentation = {
      Timespan: Promise.reject(new Error('stopInstrumentation rejection')),
    };

    const {artifactDefinitions, gatherers} = createGathererSet();
    await helpers.collectPhaseArtifacts({
      driver,
      page,
      artifactDefinitions,
      artifactState,
      gatherMode: 'navigation',
      phase: 'getArtifact',
      baseArtifacts,
      computedCache: new Map(),
      settings: defaultSettings,
    });
    expect(artifactState.getArtifact).toEqual({
      Snapshot: expect.any(Promise),
      Timespan: expect.any(Promise),
      Navigation: expect.any(Promise),
    });

    // Ensure the others didn't reject.
    await artifactState.getArtifact.Snapshot;
    await artifactState.getArtifact.Navigation;

    await expect(artifactState.getArtifact.Timespan).rejects.toMatchObject({
      message: 'stopInstrumentation rejection',
    });
    expect(gatherers.timespan.getArtifact).not.toHaveBeenCalled();
  });

  describe('PAGE_HUNG attribution in getArtifact', () => {
    /** @type {jestMock.SpiedFunction<typeof Sentry.captureException>} */
    let captureExceptionSpy;

    beforeEach(() => {
      captureExceptionSpy = jestMock.spyOn(Sentry, 'captureException');
    });

    afterEach(() => {
      captureExceptionSpy.mockRestore();
    });

    it('attributes PROTOCOL_TIMEOUT to PAGE_HUNG and skips remaining gatherers', async () => {
      const {artifactDefinitions, gatherers} = createGathererSet();
      const timeoutError = new LighthouseError(LighthouseError.errors.PROTOCOL_TIMEOUT, {
        protocolMethod: 'Runtime.evaluate',
      });
      gatherers.snapshot.getArtifact.mockRejectedValue(timeoutError);

      // `isPageHung` Runtime.evaluate("ping") also times out.
      mockDriver.defaultSession.sendCommand.mockResponse('Runtime.evaluate', () =>
        Promise.reject(new LighthouseError(LighthouseError.errors.PROTOCOL_TIMEOUT, {
          protocolMethod: 'Runtime.evaluate',
        }))
      );
      mockDriver.defaultSession.sendCommand.mockResponse('Emulation.setScriptExecutionDisabled');
      mockDriver.defaultSession.sendCommand.mockResponse('Runtime.terminateExecution');

      await helpers.collectPhaseArtifacts({
        driver,
        page,
        artifactDefinitions,
        artifactState,
        gatherMode: 'navigation',
        phase: 'getArtifact',
        baseArtifacts,
        computedCache: new Map(),
        settings: defaultSettings,
      });

      // Earlier gatherer succeeded and keeps its artifact.
      expect(await artifactState.getArtifact.Timespan).toEqual({type: 'timespan'});

      // Timed-out gatherer is converted to PAGE_HUNG with original cause preserved.
      await expect(artifactState.getArtifact.Snapshot).rejects.toMatchObject({
        code: 'PAGE_HUNG',
        cause: timeoutError,
      });

      // Subsequent gatherer short-circuits with PAGE_HUNG without running getArtifact.
      await expect(artifactState.getArtifact.Navigation).rejects.toMatchObject({
        code: 'PAGE_HUNG',
      });
      expect(gatherers.navigation.getArtifact).not.toHaveBeenCalled();

      // JS execution was disabled and terminated.
      expect(
        mockDriver.defaultSession.sendCommand.findInvocation('Emulation.setScriptExecutionDisabled')
      ).toEqual({value: true});
      expect(mockDriver.defaultSession.sendCommand).toHaveBeenCalledWith(
        'Runtime.terminateExecution'
      );

      // Top-level run warning was added once and Sentry was only notified once.
      expect(baseArtifacts.LighthouseRunWarnings).toHaveLength(1);
      expect(baseArtifacts.LighthouseRunWarnings[0]).toBeDisplayString(/stopped responding/);
      expect(captureExceptionSpy).toHaveBeenCalledTimes(1);
    });

    it('attributes "Execution was terminated" errors to PAGE_HUNG when hung', async () => {
      const {artifactDefinitions, gatherers} = createGathererSet();
      const evalTerminatedError = LighthouseError.fromProtocolMessage('Runtime.evaluate', {
        message: 'Execution was terminated',
      });
      gatherers.snapshot.getArtifact.mockRejectedValue(evalTerminatedError);

      mockDriver.defaultSession.sendCommand.mockResponse('Runtime.evaluate', () =>
        Promise.reject(new LighthouseError(LighthouseError.errors.PROTOCOL_TIMEOUT, {
          protocolMethod: 'Runtime.evaluate',
        }))
      );

      await helpers.collectPhaseArtifacts({
        driver,
        page,
        artifactDefinitions,
        artifactState,
        gatherMode: 'navigation',
        phase: 'getArtifact',
        baseArtifacts,
        computedCache: new Map(),
        settings: defaultSettings,
      });

      await expect(artifactState.getArtifact.Snapshot).rejects.toMatchObject({
        code: 'PAGE_HUNG',
        cause: evalTerminatedError,
      });
      await expect(artifactState.getArtifact.Navigation).rejects.toMatchObject({
        code: 'PAGE_HUNG',
      });
      expect(gatherers.navigation.getArtifact).not.toHaveBeenCalled();
    });

    it('preserves PROTOCOL_TIMEOUT and continues when page responds to ping', async () => {
      const {artifactDefinitions, gatherers} = createGathererSet();
      const timeoutError = new LighthouseError(LighthouseError.errors.PROTOCOL_TIMEOUT, {
        protocolMethod: 'Network.getResponseBody',
      });
      gatherers.snapshot.getArtifact.mockRejectedValue(timeoutError);

      // `isPageHung` Runtime.evaluate("ping") succeeds -> page is NOT hung.
      mockDriver.defaultSession.sendCommand.mockResponse('Runtime.evaluate', {
        result: {type: 'string', value: 'ping'},
      });

      await helpers.collectPhaseArtifacts({
        driver,
        page,
        artifactDefinitions,
        artifactState,
        gatherMode: 'navigation',
        phase: 'getArtifact',
        baseArtifacts,
        computedCache: new Map(),
        settings: defaultSettings,
      });

      expect(await artifactState.getArtifact.Timespan).toEqual({type: 'timespan'});
      await expect(artifactState.getArtifact.Snapshot).rejects.toBe(timeoutError);
      expect(await artifactState.getArtifact.Navigation).toEqual({type: 'navigation'});
      expect(gatherers.navigation.getArtifact).toHaveBeenCalledTimes(1);
      expect(baseArtifacts.LighthouseRunWarnings).toEqual([]);
    });

    it('attributes to TARGET_CRASHED when hang check detects a crashed target', async () => {
      const {artifactDefinitions, gatherers} = createGathererSet();
      const timeoutError = new LighthouseError(LighthouseError.errors.PROTOCOL_TIMEOUT, {
        protocolMethod: 'Runtime.evaluate',
      });
      gatherers.snapshot.getArtifact.mockRejectedValue(timeoutError);

      const crashError = new LighthouseError(LighthouseError.errors.TARGET_CRASHED);
      mockDriver.defaultSession.sendCommand.mockResponse('Runtime.evaluate', () =>
        Promise.reject(crashError)
      );

      await helpers.collectPhaseArtifacts({
        driver,
        page,
        artifactDefinitions,
        artifactState,
        gatherMode: 'navigation',
        phase: 'getArtifact',
        baseArtifacts,
        computedCache: new Map(),
        settings: defaultSettings,
      });

      await expect(artifactState.getArtifact.Snapshot).rejects.toBe(crashError);
      await expect(artifactState.getArtifact.Navigation).rejects.toBe(crashError);
      expect(gatherers.navigation.getArtifact).not.toHaveBeenCalled();
      expect(baseArtifacts.LighthouseRunWarnings).toHaveLength(1);
      expect(baseArtifacts.LighthouseRunWarnings[0]).toBeDisplayString(/unexpectedly crashed/);
      expect(captureExceptionSpy).toHaveBeenCalledTimes(1);
    });
  });
});
