/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as helpers from '../../gather/runner-helpers.js';
import BaseGatherer, {sharedDomCssDomainSymbol} from '../../gather/base-gatherer.js';
import Stylesheets from '../../gather/gatherers/stylesheets.js';
import CSSUsage from '../../gather/gatherers/css-usage.js';
import AnchorElements from '../../gather/gatherers/anchor-elements.js';
import ImageElements from '../../gather/gatherers/image-elements.js';
import {defaultSettings} from '../../config/constants.js';
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

  describe('shared DOM/CSS domain lifecycle', () => {
    /**
     * @param {(context: LH.Gatherer.Context) => Promise<any>} getArtifactImpl
     * @param {{shared?: boolean}} [opts]
     */
    function createSharedTestGatherer(getArtifactImpl, {shared = true} = {}) {
      const mock = createMockGathererInstance({supportedModes: ['navigation', 'snapshot']});
      mock.getArtifact.mockImplementation(getArtifactImpl);
      if (shared) {
        Object.assign(mock, {[sharedDomCssDomainSymbol]: true});
      }
      return mock;
    }

    it('marks Stylesheets, CSSUsage, AnchorElements, and ImageElements as shared', () => {
      expect(new Stylesheets()[sharedDomCssDomainSymbol]).toBe(true);
      expect(new CSSUsage()[sharedDomCssDomainSymbol]).toBe(true);
      expect(new AnchorElements()[sharedDomCssDomainSymbol]).toBe(true);
      expect(new ImageElements()[sharedDomCssDomainSymbol]).toBe(true);
      expect(sharedDomCssDomainSymbol in new BaseGatherer()).toBe(false);
    });

    it('keeps DOM/CSS alive across consecutive shared gatherers and disables after', async () => {
      /** @type {string[]} */
      const callOrder = [];
      mockDriver._session.sendCommand
        .mockResponse('DOM.enable', () => {
          callOrder.push('DOM.enable');
        })
        .mockResponse('CSS.enable', () => {
          callOrder.push('CSS.enable');
        })
        .mockResponse('DOM.enable', () => {
          callOrder.push('DOM.enable');
        })
        .mockResponse('CSS.enable', () => {
          callOrder.push('CSS.enable');
        })
        .mockResponse('DOM.enable', () => {
          callOrder.push('DOM.enable');
        })
        .mockResponse('DOM.enable', () => {
          callOrder.push('DOM.enable');
        })
        .mockResponse('CSS.enable', () => {
          callOrder.push('CSS.enable');
        })
        .mockResponse('CSS.disable', () => {
          callOrder.push('CSS.disable');
        })
        .mockResponse('DOM.disable', () => {
          callOrder.push('DOM.disable');
        });

      const stylesheets = createSharedTestGatherer(async ctx => {
        callOrder.push('Stylesheets');
        await ctx.driver.defaultSession.sendCommand('DOM.enable');
        await ctx.driver.defaultSession.sendCommand('CSS.enable');
        return [];
      });
      const cssUsage = createSharedTestGatherer(async ctx => {
        callOrder.push('CSSUsage');
        expect(ctx.driver.defaultSession.isDomainEnabled?.('DOM')).toBe(true);
        expect(ctx.driver.defaultSession.isDomainEnabled?.('CSS')).toBe(true);
        await ctx.driver.defaultSession.sendCommand('DOM.enable');
        await ctx.driver.defaultSession.sendCommand('CSS.enable');
        return [];
      });
      const anchorElements = createSharedTestGatherer(async ctx => {
        callOrder.push('AnchorElements');
        expect(ctx.driver.defaultSession.isDomainEnabled?.('DOM')).toBe(true);
        expect(ctx.driver.defaultSession.isDomainEnabled?.('CSS')).toBe(true);
        await ctx.driver.defaultSession.sendCommand('DOM.enable');
        return [];
      });
      const imageElements = createSharedTestGatherer(async ctx => {
        callOrder.push('ImageElements');
        expect(ctx.driver.defaultSession.isDomainEnabled?.('DOM')).toBe(true);
        expect(ctx.driver.defaultSession.isDomainEnabled?.('CSS')).toBe(true);
        await ctx.driver.defaultSession.sendCommand('DOM.enable');
        await ctx.driver.defaultSession.sendCommand('CSS.enable');
        return [];
      });
      const consoleMessages = createSharedTestGatherer(async ctx => {
        callOrder.push('ConsoleMessages');
        expect(ctx.driver.defaultSession.isDomainEnabled?.('DOM')).toBe(false);
        expect(ctx.driver.defaultSession.isDomainEnabled?.('CSS')).toBe(false);
        return [];
      }, {shared: false});

      const artifactDefinitions = [
        {id: 'Stylesheets', gatherer: {instance: stylesheets.asGatherer()}},
        {id: 'CSSUsage', gatherer: {instance: cssUsage.asGatherer()}},
        {id: 'AnchorElements', gatherer: {instance: anchorElements.asGatherer()}},
        {id: 'ImageElements', gatherer: {instance: imageElements.asGatherer()}},
        {id: 'ConsoleMessages', gatherer: {instance: consoleMessages.asGatherer()}},
      ];

      await helpers.collectPhaseArtifacts({
        driver,
        page,
        artifactDefinitions,
        artifactState,
        gatherMode: 'navigation',
        phase: 'stopInstrumentation',
        baseArtifacts,
        computedCache: new Map(),
        settings: defaultSettings,
      });
      expect(mockDriver._session.sendCommand).not.toHaveBeenCalled();

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

      expect(callOrder).toEqual([
        'Stylesheets',
        'DOM.enable',
        'CSS.enable',
        'CSSUsage',
        'DOM.enable',
        'CSS.enable',
        'AnchorElements',
        'DOM.enable',
        'ImageElements',
        'DOM.enable',
        'CSS.enable',
        'CSS.disable',
        'DOM.disable',
        'ConsoleMessages',
      ]);
    });

    it('disables CSS and DOM before an interleaved non-shared gatherer runs', async () => {
      /** @type {string[]} */
      const callOrder = [];
      mockDriver._session.sendCommand
        .mockResponse('DOM.enable', () => {
          callOrder.push('DOM.enable');
        })
        .mockResponse('CSS.enable', () => {
          callOrder.push('CSS.enable');
        })
        .mockResponse('CSS.disable', () => {
          callOrder.push('CSS.disable');
        })
        .mockResponse('DOM.disable', () => {
          callOrder.push('DOM.disable');
        })
        .mockResponse('DOM.enable', () => {
          callOrder.push('DOM.enable');
        })
        .mockResponse('CSS.enable', () => {
          callOrder.push('CSS.enable');
        })
        .mockResponse('CSS.disable', () => {
          callOrder.push('CSS.disable');
        })
        .mockResponse('DOM.disable', () => {
          callOrder.push('DOM.disable');
        });

      const sharedFirst = createSharedTestGatherer(async ctx => {
        callOrder.push('Stylesheets');
        await ctx.driver.defaultSession.sendCommand('DOM.enable');
        await ctx.driver.defaultSession.sendCommand('CSS.enable');
        return [];
      });
      const customGatherer = createSharedTestGatherer(async ctx => {
        callOrder.push('CustomGatherer');
        expect(ctx.driver.defaultSession.isDomainEnabled?.('CSS')).toBe(false);
        expect(ctx.driver.defaultSession.isDomainEnabled?.('DOM')).toBe(false);
        return {};
      }, {shared: false});
      const sharedSecond = createSharedTestGatherer(async ctx => {
        callOrder.push('ImageElements');
        expect(ctx.driver.defaultSession.isDomainEnabled?.('CSS')).toBe(false);
        expect(ctx.driver.defaultSession.isDomainEnabled?.('DOM')).toBe(false);
        await ctx.driver.defaultSession.sendCommand('DOM.enable');
        await ctx.driver.defaultSession.sendCommand('CSS.enable');
        return [];
      });

      await helpers.collectPhaseArtifacts({
        driver,
        page,
        artifactDefinitions: [
          {id: 'Stylesheets', gatherer: {instance: sharedFirst.asGatherer()}},
          {id: 'CustomGatherer', gatherer: {instance: customGatherer.asGatherer()}},
          {id: 'ImageElements', gatherer: {instance: sharedSecond.asGatherer()}},
        ],
        artifactState,
        gatherMode: 'navigation',
        phase: 'getArtifact',
        baseArtifacts,
        computedCache: new Map(),
        settings: defaultSettings,
      });

      expect(callOrder).toEqual([
        'Stylesheets',
        'DOM.enable',
        'CSS.enable',
        'CSS.disable',
        'DOM.disable',
        'CustomGatherer',
        'ImageElements',
        'DOM.enable',
        'CSS.enable',
        'CSS.disable',
        'DOM.disable',
      ]);
    });

    it('disables CSS and DOM after CSSUsage when ImageElements is filtered out', async () => {
      /** @type {string[]} */
      const callOrder = [];
      mockDriver._session.sendCommand
        .mockResponse('DOM.enable', () => {
          callOrder.push('DOM.enable');
        })
        .mockResponse('CSS.enable', () => {
          callOrder.push('CSS.enable');
        })
        .mockResponse('DOM.enable', () => {
          callOrder.push('DOM.enable');
        })
        .mockResponse('CSS.enable', () => {
          callOrder.push('CSS.enable');
        })
        .mockResponse('CSS.disable', () => {
          callOrder.push('CSS.disable');
        })
        .mockResponse('DOM.disable', () => {
          callOrder.push('DOM.disable');
        });

      const stylesheets = createSharedTestGatherer(async ctx => {
        callOrder.push('Stylesheets');
        await ctx.driver.defaultSession.sendCommand('DOM.enable');
        await ctx.driver.defaultSession.sendCommand('CSS.enable');
        return [];
      });
      const cssUsage = createSharedTestGatherer(async ctx => {
        callOrder.push('CSSUsage');
        expect(ctx.driver.defaultSession.isDomainEnabled?.('DOM')).toBe(true);
        expect(ctx.driver.defaultSession.isDomainEnabled?.('CSS')).toBe(true);
        await ctx.driver.defaultSession.sendCommand('DOM.enable');
        await ctx.driver.defaultSession.sendCommand('CSS.enable');
        return [];
      });

      await helpers.collectPhaseArtifacts({
        driver,
        page,
        artifactDefinitions: [
          {id: 'Stylesheets', gatherer: {instance: stylesheets.asGatherer()}},
          {id: 'CSSUsage', gatherer: {instance: cssUsage.asGatherer()}},
        ],
        artifactState,
        gatherMode: 'navigation',
        phase: 'getArtifact',
        baseArtifacts,
        computedCache: new Map(),
        settings: defaultSettings,
      });

      expect(callOrder).toEqual([
        'Stylesheets',
        'DOM.enable',
        'CSS.enable',
        'CSSUsage',
        'DOM.enable',
        'CSS.enable',
        'CSS.disable',
        'DOM.disable',
      ]);
      expect(mockDriver._session.isDomainEnabled('CSS')).toBe(false);
      expect(mockDriver._session.isDomainEnabled('DOM')).toBe(false);
    });

    it('disables only enabled domains even when a shared gatherer rejects', async () => {
      mockDriver._session.sendCommand
        .mockResponse('DOM.enable')
        .mockResponse('CSS.enable', () => Promise.reject(new Error('CSS enable failed')))
        .mockResponse('DOM.disable');

      const failingGatherer = createSharedTestGatherer(async ctx => {
        await ctx.driver.defaultSession.sendCommand('DOM.enable');
        await ctx.driver.defaultSession.sendCommand('CSS.enable');
        return [];
      });

      await helpers.collectPhaseArtifacts({
        driver,
        page,
        artifactDefinitions: [
          {id: 'Stylesheets', gatherer: {instance: failingGatherer.asGatherer()}},
        ],
        artifactState,
        gatherMode: 'navigation',
        phase: 'getArtifact',
        baseArtifacts,
        computedCache: new Map(),
        settings: defaultSettings,
      });

      await expect(artifactState.getArtifact.Stylesheets).rejects.toThrow('CSS enable failed');
      expect(mockDriver._session.sendCommand.mock.calls.map(c => c[0])).toEqual([
        'DOM.enable',
        'CSS.enable',
        'DOM.disable',
      ]);
      expect(mockDriver._session.isDomainEnabled('CSS')).toBe(false);
      expect(mockDriver._session.isDomainEnabled('DOM')).toBe(false);
    });
  });
});
