/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import assert from 'assert/strict';
import path from 'path';

import jestMock from 'jest-mock';
import * as td from 'testdouble';

import {makeMocksForGatherRunner} from './test-utils.js';
import {createMockDriver} from './gather/mock-driver.js';

await makeMocksForGatherRunner();

/** @type {jestMock.Mock} */
let saveArtifactsSpy;
/** @type {jestMock.Mock} */
let saveLhrSpy;
/** @type {jestMock.Mock} */
let loadArtifactsSpy;
/** @type {jestMock.Mock} */
let runAuditSpy;
/** @type {jestMock.Mock} */
let mockGatherImpl;

let driverMock = createMockDriver();

await td.replaceEsm('../lib/asset-saver.js', {
  saveArtifacts: saveArtifactsSpy = jestMock.fn((...args) => assetSaver.saveArtifacts(...args)),
  saveLhr: saveLhrSpy = jestMock.fn(),
  loadArtifacts: loadArtifactsSpy = jestMock.fn((...args) => assetSaver.loadArtifacts(...args)),
});

// Some imports needs to be done dynamically, so that their dependencies will be mocked.
// https://github.com/GoogleChrome/lighthouse/blob/main/docs/hacking-tips.md#mocking-modules-with-testdouble
const {Runner} = await import('../runner.js');
const {initializeConfig} = await import('../config/config.js');
const {Audit} = await import('../audits/audit.js');
const {default: Gatherer} = await import('../gather/base-gatherer.js');
const i18n = await import('../lib/i18n/i18n.js');
const {getModuleDirectory} = await import('../../shared/esm-utils.js');
const {LighthouseError} = await import('../lib/lh-error.js');
const {finalizeArtifacts, getBaseArtifacts} = await import('../gather/base-artifacts.js');
const {gotoURL} = await import('../gather/driver/navigation.js');
const {
  awaitArtifacts,
  collectPhaseArtifacts,
  getEmptyArtifactState,
} = await import('../gather/runner-helpers.js');

// All mocks must come first, then we can load the "original" version of asset-saver (which will
// contain references to all the correct mocked modules, and have the same LighthouseError class
// that the test file uses).
const assetSaver = await import('../lib/asset-saver.js?__quibbleoriginal');

const moduleDir = getModuleDirectory(import.meta);

beforeEach(() => {
  driverMock = createMockDriver();
  driverMock._executionContext.evaluate.mockReturnValue({});
  runAuditSpy = jestMock.spyOn(Runner, '_runAudit');
  mockGatherImpl = jestMock.fn().mockImplementation(async (url, opts) => {
    const baseArtifacts =
      await getBaseArtifacts(opts.resolvedConfig, driverMock, {gatherMode: 'navigation'});
    baseArtifacts.URL = {
      requestedUrl: url,
      mainDocumentUrl: url,
      finalDisplayedUrl: url,
    };

    const artifactDefinitions = opts.resolvedConfig.artifacts || [];
    const artifactState = getEmptyArtifactState();
    await gotoURL(driverMock, url);
    await collectPhaseArtifacts({
      phase: 'getArtifact',
      gatherMode: 'navigation',
      driver: driverMock,
      page: driverMock._page,
      baseArtifacts,
      artifactDefinitions,
      artifactState,
      computedCache: new Map(),
      settings: opts.resolvedConfig.settings,
    });

    await driverMock.disconnect();

    const artifacts = await awaitArtifacts(artifactState);
    return finalizeArtifacts(baseArtifacts, artifacts);
  });
});

afterEach(() => {
  saveArtifactsSpy.mockClear();
  saveLhrSpy.mockClear();
  loadArtifactsSpy.mockClear();
  runAuditSpy.mockRestore();
});

describe('Runner', () => {
  const createGatherFn = url => {
    return opts => {
      return mockGatherImpl(url, opts);
    };
  };

  const runGatherAndAudit = async (gatherFn, opts) => {
    const artifacts = await Runner.gather(gatherFn, opts);
    return Runner.audit(artifacts, opts);
  };

  const basicAuditMeta = {
    id: 'test-audit',
    title: 'A test audit',
    failureTitle: 'A test audit',
    description: 'An audit for testing',
    requiredArtifacts: [],
  };

  describe('Gather Mode & Audit Mode', () => {
    const url = 'https://example.com';
    const generateConfig = settings => initializeConfig('navigation', {
      artifacts: [
        {id: 'MetaElements', gatherer: 'meta-elements'},
      ],
      audits: ['viewport'],
      settings,
    }).then(r => r.resolvedConfig);
    const artifactsPath = '.tmp/test_artifacts';
    const resolvedPath = path.resolve(process.cwd(), artifactsPath);

    after(() => {
      fs.rmSync(resolvedPath, {recursive: true, force: true});
    });

    it('-G gathers, quits, and doesn\'t run audits', async () => {
      const opts = {resolvedConfig: await generateConfig({gatherMode: artifactsPath}), driverMock};
      return runGatherAndAudit(createGatherFn(url), opts).then(_ => {
        expect(loadArtifactsSpy).not.toHaveBeenCalled();
        expect(saveArtifactsSpy).toHaveBeenCalled();

        const saveArtifactArg = saveArtifactsSpy.mock.calls[0][0];
        assert.ok(saveArtifactArg.MetaElements);

        expect(mockGatherImpl).toHaveBeenCalled();
        expect(runAuditSpy).not.toHaveBeenCalled();
        expect(saveLhrSpy).not.toHaveBeenCalled();

        assert.ok(fs.existsSync(resolvedPath));
        assert.ok(fs.existsSync(`${resolvedPath}/artifacts.json`));
      });
    });

    // uses the files on disk from the -G test. ;)
    it('-A audits from saved artifacts and doesn\'t gather', async () => {
      const opts = {
        resolvedConfig: await generateConfig({auditMode: artifactsPath}),
        driverMock,
        computedCache: new Map(),
      };
      return runGatherAndAudit(createGatherFn(), opts).then(_ => {
        expect(loadArtifactsSpy).toHaveBeenCalled();
        expect(mockGatherImpl).not.toHaveBeenCalled();
        expect(saveArtifactsSpy).not.toHaveBeenCalled();
        expect(saveLhrSpy).toHaveBeenCalled();
        expect(runAuditSpy).toHaveBeenCalled();
      });
    });

    it('-A throws if the settings change', async () => {
      // Change throttlingMethod from its default of 'simulate'
      const settings = {auditMode: artifactsPath, throttlingMethod: 'provided'};
      const opts = {resolvedConfig: await generateConfig(settings), driverMock,
        computedCache: new Map()};
      try {
        await runGatherAndAudit(createGatherFn(), opts);
        assert.fail('should have thrown');
      } catch (err) {
        assert.ok(/Cannot change settings/.test(err.message), 'should have prevented run');
      }
    });

    it('does not include a top-level runtimeError when gatherers were successful', async () => {
      const {resolvedConfig} = await initializeConfig('navigation', {
        settings: {
          auditMode: moduleDir + '/fixtures/artifacts/perflog/',
        },
        audits: [
          'viewport',
        ],
      });

      const {lhr} = await runGatherAndAudit(undefined, {resolvedConfig, computedCache: new Map()});
      assert.strictEqual(lhr.runtimeError, undefined);
    });

    it('-GA is a normal run but it saves artifacts and LHR to disk', async () => {
      const settings = {auditMode: artifactsPath, gatherMode: artifactsPath};
      const opts = {resolvedConfig: await generateConfig(settings), driverMock,
        computedCache: new Map()};
      return runGatherAndAudit(createGatherFn(url), opts).then(_ => {
        expect(loadArtifactsSpy).not.toHaveBeenCalled();
        expect(mockGatherImpl).toHaveBeenCalled();
        expect(saveArtifactsSpy).toHaveBeenCalled();
        expect(saveLhrSpy).toHaveBeenCalled();
        expect(runAuditSpy).toHaveBeenCalled();
      });
    });

    it('non -G/-A run doesn\'t save artifacts to disk', async () => {
      const opts = {resolvedConfig: await generateConfig(), driverMock, computedCache: new Map()};
      return runGatherAndAudit(createGatherFn(url), opts).then(_ => {
        expect(loadArtifactsSpy).not.toHaveBeenCalled();
        expect(mockGatherImpl).toHaveBeenCalled();
        expect(saveArtifactsSpy).not.toHaveBeenCalled();
        expect(saveLhrSpy).not.toHaveBeenCalled();
        expect(runAuditSpy).toHaveBeenCalled();
      });
    });

    it('omits full page screenshot if it is erroneous', async () => {
      const opts = {resolvedConfig: await generateConfig(), driverMock, computedCache: new Map()};
      const baseGatherFn = createGatherFn(url);
      const badFpsGatherFn = async (...args) => {
        const artifacts = await baseGatherFn(...args);
        artifacts.FullPageScreenshot = new Error('Bad FPS');
        return artifacts;
      };
      const result = await runGatherAndAudit(badFpsGatherFn, opts);
      expect(result.artifacts.FullPageScreenshot).toBeInstanceOf(Error);
      expect(result.lhr.fullPageScreenshot).toBeUndefined();
    });

    it('serializes IcuMessages in gatherMode and is able to use them in auditMode', async () => {
      // Can use this to access shared UIStrings in i18n.js.
      // For future changes: exact messages aren't important, just choose ones with replacements.
      const str_ = i18n.createIcuMessageFn(import.meta.url, {});

      // A gatherer that produces an IcuMessage runWarning and LighthouseError artifact.
      class WarningAndErrorGatherer extends Gatherer {
        meta = {
          supportedModes: ['navigation'],
        };

        getArtifact(context) {
          const warning = str_(i18n.UIStrings.displayValueByteSavings, {wastedBytes: 2222});
          context.baseArtifacts.LighthouseRunWarnings.push(warning);
          throw new LighthouseError(
            LighthouseError.errors.UNSUPPORTED_OLD_CHROME, {featureName: 'VRML'});
        }
      }
      const {resolvedConfig: gatherConfig} = await initializeConfig('navigation', {
        settings: {gatherMode: artifactsPath},
        artifacts: [
          {id: 'WarningAndErrorGatherer', gatherer: WarningAndErrorGatherer},
        ],
      });
      await runGatherAndAudit(createGatherFn(url),
        {resolvedConfig: gatherConfig, driverMock, computedCache: new Map()});

      // Artifacts are still localizable.
      const artifacts = assetSaver.loadArtifacts(resolvedPath);
      expect(artifacts.LighthouseRunWarnings[0]).not.toBe('string');
      expect(artifacts.LighthouseRunWarnings[0]).toBeDisplayString('Potential savings of 2 KiB');
      expect(artifacts.WarningAndErrorGatherer).toMatchObject({
        name: 'LighthouseError',
        code: 'UNSUPPORTED_OLD_CHROME',
        // eslint-disable-next-line max-len
        friendlyMessage: expect.toBeDisplayString(`This version of Chrome is too old to support 'VRML'. Use a newer version to see full results.`),
      });

      // Now run auditMode using errored artifacts to ensure the errors come through.
      class DummyAudit extends Audit {
        static get meta() {
          return {
            id: 'dummy-audit',
            title: 'Dummy',
            failureTitle: 'Dummy',
            description: 'Will fail because required artifact is an error',
            requiredArtifacts: ['WarningAndErrorGatherer'],
          };
        }
        static audit() {}
      }
      const {resolvedConfig: auditConfig} = await initializeConfig('navigation', {
        settings: {auditMode: artifactsPath},
        audits: [{implementation: DummyAudit}],
        artifacts: [
          {id: 'WarningAndErrorGatherer', gatherer: WarningAndErrorGatherer},
        ],
      });
      const {lhr} = await runGatherAndAudit(createGatherFn(url),
        {resolvedConfig: auditConfig, computedCache: new Map()});

      // Messages are now localized and formatted.
      expect(lhr.runWarnings[0]).toBe('Potential savings of 2 KiB');
      expect(lhr.audits['dummy-audit']).toMatchObject({
        scoreDisplayMode: 'error',
        // eslint-disable-next-line max-len
        errorMessage: 'Required WarningAndErrorGatherer gatherer encountered an error: UNSUPPORTED_OLD_CHROME',
      });
    });
  });

  it('expands gatherers', async () => {
    const url = 'https://example.com';
    const {resolvedConfig} = await initializeConfig('navigation', {
      artifacts: [{
        id: 'MetaElements',
        gatherer: 'meta-elements',
      }],
      audits: [
        'viewport',
      ],
    });

    return runGatherAndAudit(createGatherFn(url),
        {resolvedConfig, driverMock, computedCache: new Map()}).then(_ => {
      expect(mockGatherImpl).toHaveBeenCalled();
      assert.ok(typeof resolvedConfig.artifacts[0] === 'object');
    });
  });

  it('accepts audit options', async () => {
    const url = 'https://example.com/';

    const calls = [];
    class EavesdropAudit extends Audit {
      static get meta() {
        return {
          id: 'eavesdrop-audit',
          title: 'It eavesdrops',
          failureTitle: 'It does not',
          description: 'Helpful when eavesdropping',
          requiredArtifacts: [],
        };
      }
      static audit(artifacts, context) {
        calls.push(context.options);
        return {score: 1};
      }
    }

    const {resolvedConfig} = await initializeConfig('navigation', {
      settings: {
        auditMode: moduleDir + '/fixtures/artifacts/empty-artifacts/',
      },
      audits: [
        {implementation: EavesdropAudit, options: {x: 1}},
        {implementation: EavesdropAudit, options: {x: 2}},
      ],
    });

    return runGatherAndAudit({}, {url, resolvedConfig}).then(results => {
      assert.equal(results.lhr.requestedUrl, url);
      assert.equal(results.lhr.audits['eavesdrop-audit'].score, 1);
      // assert that the options we received matched expectations
      assert.deepEqual(calls, [{x: 1}, {x: 2}]);
    });
  });

  it('accepts trace artifacts as paths and outputs appropriate data', async () => {
    const {resolvedConfig} = await initializeConfig('navigation', {
      settings: {
        auditMode: moduleDir + '/fixtures/artifacts/perflog/',
      },
      audits: [
        'user-timings',
      ],
      artifacts: [
        {id: 'Trace', gatherer: 'trace'},
        {id: 'traces', gatherer: 'trace-compat'},
      ],
    });

    return runGatherAndAudit({}, {resolvedConfig, computedCache: new Map()}).then(results => {
      expect(mockGatherImpl).not.toHaveBeenCalled();
      const audits = results.lhr.audits;
      assert.equal(audits['user-timings'].displayValue, '2 user timings');
      assert.deepStrictEqual(audits['user-timings'].details.items.map(i => i.startTime),
        [0.002, 1000.954]);
    });
  });

  it('finds correct timings for multiple gather/audit pairs run separately', async () => {
    const {resolvedConfig} = await initializeConfig('navigation', {
      artifacts: [{
        id: 'MetaElements',
        gatherer: 'meta-elements',
      }],
      audits: [
        'viewport',
      ],
    });
    const options1 = {resolvedConfig, driverMock, computedCache: new Map()};
    const options2 = {resolvedConfig, driverMock, computedCache: new Map()};

    const artifacts1 = await Runner.gather(createGatherFn('https://example.com'), options1);
    const artifacts2 = await Runner.gather(createGatherFn('https://google.com'), options2);

    const result1 = await Runner.audit(artifacts1, options1);
    const result2 = await Runner.audit(artifacts2, options2);

    // Ensure the timings of the first run do not pollute the timings of the second run.
    const gatherTiming1 = result1.lhr.timing.entries.find(t => t.name === 'lh:runner:gather');
    const gatherTiming2 = result2.lhr.timing.entries.find(t => t.name === 'lh:runner:gather');
    expect(gatherTiming1.startTime).not.toEqual(gatherTiming2.startTime);

    const auditTiming1 = result1.lhr.timing.entries.find(t => t.name === 'lh:runner:audit');
    const auditTiming2 = result2.lhr.timing.entries.find(t => t.name === 'lh:runner:audit');
    expect(auditTiming1.startTime).not.toEqual(auditTiming2.startTime);
  });

  describe('Bad required artifact handling', () => {
    it('outputs an error audit result when trace required but not provided', async () => {
      const {resolvedConfig} = await initializeConfig('navigation', {
        settings: {
          auditMode: moduleDir + '/fixtures/artifacts/empty-artifacts/',
        },
        audits: [
          // requires traces[Audit.DEFAULT_PASS]
          'user-timings',
        ],
        artifacts: [
          {id: 'Trace', gatherer: 'trace'},
          {id: 'traces', gatherer: 'trace-compat'},
        ],
      });

      const results = await runGatherAndAudit({}, {resolvedConfig});
      const auditResult = results.lhr.audits['user-timings'];
      assert.strictEqual(auditResult.score, null);
      assert.strictEqual(auditResult.scoreDisplayMode, 'error');
      assert.ok(auditResult.errorMessage.includes('traces'));
    });

    it('outputs an error audit result when devtoolsLog required but not provided', async () => {
      const {resolvedConfig} = await initializeConfig('navigation', {
        settings: {
          auditMode: moduleDir + '/fixtures/artifacts/empty-artifacts/',
        },
        audits: [
          // requires devtoolsLogs[Audit.DEFAULT_PASS]
          'is-on-https',
        ],
        artifacts: [
          {id: 'DevtoolsLog', gatherer: 'devtools-log'},
          {id: 'devtoolsLogs', gatherer: 'devtools-log-compat'},
          {id: 'InspectorIssues', gatherer: 'inspector-issues'},
        ],
      });

      const results = await runGatherAndAudit({}, {resolvedConfig});
      const auditResult = results.lhr.audits['is-on-https'];
      assert.strictEqual(auditResult.score, null);
      assert.strictEqual(auditResult.scoreDisplayMode, 'error');
      assert.strictEqual(auditResult.errorMessage, 'Required devtoolsLogs gatherer did not run.');
    });

    it('outputs an error audit result when missing a required artifact', async () => {
      const {resolvedConfig} = await initializeConfig('navigation', {
        settings: {
          auditMode: moduleDir + '/fixtures/artifacts/empty-artifacts/',
        },
        audits: [
          // requires the MetaElements artifact
          'viewport',
        ],
        artifacts: [
          {id: 'MetaElements', gatherer: 'meta-elements'},
        ],
      });

      return runGatherAndAudit({}, {resolvedConfig}).then(results => {
        const auditResult = results.lhr.audits['viewport'];
        assert.strictEqual(auditResult.score, null);
        assert.strictEqual(auditResult.scoreDisplayMode, 'error');
        assert.ok(auditResult.errorMessage.includes('MetaElements'));
      });
    });

    it('outputs an error audit result when required artifact was an Error', async () => {
      // Start with empty-artifacts.
      const baseArtifacts = assetSaver.loadArtifacts(moduleDir +
          '/fixtures/artifacts/empty-artifacts/');

      // Add error and save artifacts using assetSaver to serialize Error object.
      const errorMessage = 'blurst of times';
      const artifacts = {
        ...baseArtifacts,
        MetaElements: new Error(errorMessage),
      };
      const artifactsPath = '.tmp/test_artifacts';
      const resolvedPath = path.resolve(process.cwd(), artifactsPath);
      await assetSaver.saveArtifacts(artifacts, resolvedPath);

      // Load artifacts via auditMode.
      const {resolvedConfig} = await initializeConfig('navigation', {
        settings: {
          auditMode: resolvedPath,
        },
        audits: [
          // requires MetaElements artifact
          'viewport',
        ],
        artifacts: [
          {id: 'MetaElements', gatherer: 'meta-elements'},
        ],
      });

      const results = await runGatherAndAudit({}, {resolvedConfig});
      const auditResult = results.lhr.audits['viewport'];
      assert.strictEqual(auditResult.score, null);
      assert.strictEqual(auditResult.scoreDisplayMode, 'error');
      assert.ok(auditResult.errorMessage.includes(errorMessage));

      fs.rmSync(resolvedPath, {recursive: true});
    });

    it('only passes the requested artifacts to the audit (no optional artifacts)', async () => {
      class SimpleAudit extends Audit {
        static get meta() {
          return {
            id: 'simple',
            title: 'Requires some artifacts',
            failureTitle: 'Artifacts',
            description: 'Test for always throwing',
            requiredArtifacts: ['ArtifactA', 'ArtifactC'],
          };
        }
      }

      class SimpleGatherer extends Gatherer {
        meta = {
          supportedModes: ['navigation'],
        };
        getArtifact() {}
      }

      const auditMockFn = SimpleAudit.audit = jestMock.fn().mockReturnValue({score: 1});
      const {resolvedConfig} = await initializeConfig('navigation', {
        settings: {
          auditMode: moduleDir + '/fixtures/artifacts/alphabet-artifacts/',
        },
        audits: [
          SimpleAudit,
        ],
        artifacts: [
          {id: 'ArtifactA', gatherer: SimpleGatherer},
          {id: 'ArtifactB', gatherer: SimpleGatherer},
          {id: 'ArtifactC', gatherer: SimpleGatherer},
          {id: 'ArtifactD', gatherer: SimpleGatherer},
        ],
      });

      const results = await runGatherAndAudit({}, {resolvedConfig});
      expect(results.lhr).toMatchObject({audits: {simple: {score: 1}}});
      expect(auditMockFn).toHaveBeenCalled();
      expect(auditMockFn.mock.calls[0][0]).toEqual({
        ArtifactA: 'apple',
        ArtifactC: 'cherry',
      });
    });

    it('only passes the requested artifacts to the audit (w/ optional artifacts)', async () => {
      class SimpleAudit extends Audit {
        static get meta() {
          return {
            id: 'simple',
            title: 'Requires some artifacts',
            failureTitle: 'Artifacts',
            description: 'Test for always throwing',
            requiredArtifacts: ['ArtifactA', 'ArtifactC'],
            __internalOptionalArtifacts: ['ArtifactD'],
          };
        }
      }

      class SimpleGatherer extends Gatherer {
        meta = {
          supportedModes: ['navigation'],
        };
        getArtifact() {}
      }

      const auditMockFn = SimpleAudit.audit = jestMock.fn().mockReturnValue({score: 1});
      const {resolvedConfig} = await initializeConfig('navigation', {
        settings: {
          auditMode: moduleDir + '/fixtures/artifacts/alphabet-artifacts/',
        },
        audits: [
          SimpleAudit,
        ],
        artifacts: [
          {id: 'ArtifactA', gatherer: SimpleGatherer},
          {id: 'ArtifactB', gatherer: SimpleGatherer},
          {id: 'ArtifactC', gatherer: SimpleGatherer},
          {id: 'ArtifactD', gatherer: SimpleGatherer},
        ],
      });

      const results = await runGatherAndAudit({}, {resolvedConfig});
      expect(results.lhr).toMatchObject({audits: {simple: {score: 1}}});
      expect(auditMockFn).toHaveBeenCalled();
      expect(auditMockFn.mock.calls[0][0]).toEqual({
        ArtifactA: 'apple',
        ArtifactC: 'cherry',
        ArtifactD: 'date',
      });
    });
  });

  describe('Bad audit behavior handling', () => {
    const testAuditMeta = {
      id: 'throwy-audit',
      title: 'Always throws',
      failureTitle: 'Always throws is failing, natch',
      description: 'Test for always throwing',
      requiredArtifacts: [],
    };

    it('produces an error audit result when an audit throws an Error', async () => {
      const errorMessage = 'Audit yourself';
      const {resolvedConfig} = await initializeConfig('navigation', {
        settings: {
          auditMode: moduleDir + '/fixtures/artifacts/empty-artifacts/',
        },
        audits: [
          class ThrowyAudit extends Audit {
            static get meta() {
              return testAuditMeta;
            }
            static audit() {
              throw new Error(errorMessage);
            }
          },
        ],
      });

      return runGatherAndAudit({}, {resolvedConfig}).then(results => {
        const auditResult = results.lhr.audits['throwy-audit'];
        assert.strictEqual(auditResult.score, null);
        assert.strictEqual(auditResult.scoreDisplayMode, 'error');
        assert.ok(auditResult.errorMessage.includes(errorMessage));
        assert.ok(auditResult.errorStack.match(/at [a-zA-Z]*.audit/));
      });
    });

    it('produces an error audit result that prefers cause stack', async () => {
      const errorMessage = 'Audit yourself';
      const {resolvedConfig} = await initializeConfig('navigation', {
        settings: {
          auditMode: moduleDir + '/fixtures/artifacts/empty-artifacts/',
        },
        audits: [
          class ThrowyAudit extends Audit {
            static get meta() {
              return testAuditMeta;
            }
            static audit() {
              this.aFn();
            }
            static aFn() {
              throw new Error(errorMessage);
            }
          },
        ],
      });

      return runGatherAndAudit({}, {resolvedConfig}).then(results => {
        const auditResult = results.lhr.audits['throwy-audit'];
        assert.strictEqual(auditResult.score, null);
        assert.strictEqual(auditResult.scoreDisplayMode, 'error');
        assert.ok(auditResult.errorMessage.includes(errorMessage));
        assert.ok(auditResult.errorStack.match(/at [a-zA-Z]*.aFn/));
      });
    });
  });

  it('accepts devtoolsLog in artifacts', async () => {
    const {resolvedConfig} = await initializeConfig('navigation', {
      settings: {
        auditMode: moduleDir + '/fixtures/artifacts/perflog/',
      },
      audits: [
        'critical-request-chains',
      ],
      artifacts: [
        {id: 'Trace', gatherer: 'trace'},
        {id: 'DevtoolsLog', gatherer: 'devtools-log'},
        {id: 'traces', gatherer: 'trace-compat'},
        {id: 'devtoolsLogs', gatherer: 'devtools-log-compat'},
      ],
    });

    return runGatherAndAudit({}, {resolvedConfig, computedCache: new Map()}).then(results => {
      const audits = results.lhr.audits;
      assert.equal(audits['critical-request-chains'].displayValue, '5 chains found');
      assert.equal(audits['critical-request-chains'].details.longestChain.transferSize, 2468);
    });
  });

  it('rejects when not given audits to run (and not -G)', async () => {
    const url = 'https://example.com';
    const {resolvedConfig} = await initializeConfig('navigation', {
      artifacts: [{
        id: 'ViewportDimensions',
        gatherer: 'viewport-dimensions',
      }],
    });

    return runGatherAndAudit(createGatherFn(url), {resolvedConfig, driverMock})
      .then(_ => {
        assert.ok(false);
      }, err => {
        assert.ok(/No audits to evaluate/.test(err.message));
      });
  });

  it('returns data even if no config categories are provided', async () => {
    const url = 'https://example.com/';
    const {resolvedConfig} = await initializeConfig('navigation', {
      audits: [
        'viewport',
      ],
      artifacts: [
        {id: 'MetaElements', gatherer: 'meta-elements'},
      ],
    });

    return runGatherAndAudit(createGatherFn(url),
        {resolvedConfig, driverMock, computedCache: new Map()}).then(results => {
      assert.ok(results.lhr.lighthouseVersion);
      assert.ok(results.lhr.fetchTime);
      assert.equal(results.lhr.requestedUrl, url);
      assert.equal(results.lhr.audits['viewport'].id, 'viewport');
      expect(mockGatherImpl).toHaveBeenCalled();
    });
  });

  it('returns categories', async () => {
    const url = 'https://example.com/';
    const {resolvedConfig} = await initializeConfig('navigation', {
      artifacts: [{
        id: 'MetaElements',
        gatherer: 'meta-elements',
      }],
      audits: [
        'viewport',
      ],
      categories: {
        category: {
          title: 'Category',
          description: '',
          auditRefs: [
            {id: 'viewport', weight: 1},
          ],
        },
      },
    });

    return runGatherAndAudit(createGatherFn(url),
        {resolvedConfig, driverMock, computedCache: new Map()}).then(results => {
      expect(mockGatherImpl).toHaveBeenCalled();
      assert.ok(results.lhr.lighthouseVersion);
      assert.ok(results.lhr.fetchTime);
      assert.equal(results.lhr.requestedUrl, url);
      assert.equal(results.lhr.audits['viewport'].id, 'viewport');
      assert.equal(results.lhr.categories.category.auditRefs[0].id, 'viewport');
    });
  });

  it('only supports core audits with ids matching their filename', async () => {
    const coreAudits = Runner.getAuditList();
    for (const auditFilename of coreAudits) {
      const auditPath = '../audits/' + auditFilename;
      const auditExpectedName = path.basename(auditFilename, '.js');
      const {default: AuditClass} = await import(auditPath);
      assert.strictEqual(AuditClass.meta.id, auditExpectedName);
    }
  });

  it('results include artifacts when given artifacts and audits', async () => {
    const {resolvedConfig} = await initializeConfig('navigation', {
      settings: {
        auditMode: moduleDir + '/fixtures/artifacts/perflog/',
      },
      audits: [
        'viewport',
      ],
    });

    return runGatherAndAudit({}, {resolvedConfig, computedCache: new Map()}).then(results => {
      assert.strictEqual(results.artifacts.ViewportDimensions.innerWidth, 412);
      assert.strictEqual(results.artifacts.ViewportDimensions.innerHeight, 660);
    });
  });

  it('results include artifacts when given artifacts and audits', async () => {
    const url = 'https://example.com';
    const {resolvedConfig} = await initializeConfig('navigation', {
      artifacts: [
        {id: 'MetaElements', gatherer: 'meta-elements'},
      ],

      audits: [
        'viewport',
      ],
    });

    const options = {resolvedConfig, driverMock, computedCache: new Map()};
    return runGatherAndAudit(createGatherFn(url), options).then(results => {
      // User-specified artifact.
      assert.ok(results.artifacts.MetaElements);
    });
  });

  it('includes any LighthouseRunWarnings from artifacts in output', async () => {
    const {resolvedConfig} = await initializeConfig('navigation', {
      settings: {
        auditMode: moduleDir + '/fixtures/artifacts/perflog/',
      },
      audits: [],
    });

    return runGatherAndAudit(createGatherFn(),
        {resolvedConfig, driverMock, computedCache: new Map()}).then(results => {
      assert.deepStrictEqual(results.lhr.runWarnings, [
        'I\'m a warning!',
        'Also a warning',
      ]);
    });
  });

  it('includes any LighthouseRunWarnings from audits in LHR', async () => {
    const warningString = 'Really important audit warning!';

    const {resolvedConfig} = await initializeConfig('navigation', {
      settings: {
        auditMode: moduleDir + '/fixtures/artifacts/empty-artifacts/',
      },
      audits: [
        class WarningAudit extends Audit {
          static get meta() {
            return basicAuditMeta;
          }
          static audit() {
            return {
              numericValue: 5,
              score: 1,
              runWarnings: [warningString],
            };
          }
        },
      ],
    });

    return runGatherAndAudit(createGatherFn(), {resolvedConfig, driverMock}).then(results => {
      assert.deepStrictEqual(results.lhr.runWarnings, [warningString]);
    });
  });

  describe('lhr.runtimeError', () => {
    const NO_FCP = LighthouseError.errors.NO_FCP;
    class RuntimeErrorGatherer extends Gatherer {
      meta = {
        supportedModes: ['navigation'],
      };

      getArtifact() {
        throw new LighthouseError(NO_FCP);
      }
    }

    class WarningAudit extends Audit {
      static get meta() {
        return {
          id: 'test-audit',
          title: 'A test audit',
          failureTitle: 'A test audit',
          description: 'An audit for testing',
          requiredArtifacts: ['RuntimeErrorGatherer'],
        };
      }
      static audit() {
        throw new Error('Should not get here');
      }
    }

    const config = {
      artifacts: [
        {id: 'RuntimeErrorGatherer', gatherer: RuntimeErrorGatherer},
      ],
      audits: [WarningAudit],
    };

    it('includes a top-level runtimeError when a gatherer throws one', async () => {
      const {resolvedConfig} = await initializeConfig('navigation', config);
      const {lhr} = await runGatherAndAudit(createGatherFn('https://example.com/'),
        {resolvedConfig, driverMock, computedCache: new Map()});

      // Audit error included the runtimeError
      expect(lhr.audits['test-audit'].scoreDisplayMode).toEqual('error');
      expect(lhr.audits['test-audit'].errorMessage).toEqual(expect.stringContaining(NO_FCP.code));

      // And it bubbled up to the runtimeError.
      expect(lhr.runtimeError.code).toEqual(NO_FCP.code);
      expect(lhr.runtimeError.message).toMatch(/did not paint any content.*\(NO_FCP\)/);
    });
  });

  it('localized errors thrown in gather fn', async () => {
    function gatherFn() {
      throw new LighthouseError(
        LighthouseError.errors.PROTOCOL_TIMEOUT,
        {protocolMethod: 'Method.Failure'}
      );
    }

    try {
      const {resolvedConfig} = await initializeConfig('navigation');
      await runGatherAndAudit(gatherFn, {driverMock, resolvedConfig});
      assert.fail('should have thrown');
    } catch (err) {
      assert.equal(err.code, LighthouseError.errors.PROTOCOL_TIMEOUT.code);
      assert.ok(/^Waiting for DevTools protocol.*Method: Method.Failure/.test(err.friendlyMessage),
        'did not localize error message');
    }
  });

  it('can handle array of outputs', async () => {
    const url = 'https://example.com';
    const {resolvedConfig} = await initializeConfig('navigation', {
      extends: 'lighthouse:default',
      settings: {
        onlyCategories: ['performance'],
        output: ['json', 'html'],
      },
    });

    const results = await runGatherAndAudit(createGatherFn(url),
      {resolvedConfig, driverMock, computedCache: new Map()});
    assert.ok(Array.isArray(results.report) && results.report.length === 2,
      'did not return multiple reports');
    assert.ok(JSON.parse(results.report[0]), 'did not return json output');
    assert.ok(/<!doctype/.test(results.report[1]), 'did not return html output');
  });
});
