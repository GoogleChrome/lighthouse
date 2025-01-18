/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as helpers from '../../gather/runner-helpers.js';
import BaseGatherer from '../../gather/base-gatherer.js';
import {defaultSettings} from '../../config/constants.js';
import {createMockDriver, createMockGathererInstance, createMockBaseArtifacts} from './mock-driver.js'; // eslint-disable-line max-len

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
});
