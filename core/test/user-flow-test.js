/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import jestMock from 'jest-mock';
import * as td from 'testdouble';

import {Runner} from '../runner.js';
import {createMockPage, mockRunnerModule} from './gather/mock-driver.js';

const snapshotModule = {snapshotGather: jestMock.fn()};
await td.replaceEsm('../gather/snapshot-runner.js', snapshotModule);
const navigationModule = {navigationGather: jestMock.fn()};
await td.replaceEsm('../gather/navigation-runner.js', navigationModule);
const timespanModule = {startTimespanGather: jestMock.fn()};
await td.replaceEsm('../gather/timespan-runner.js', timespanModule);

const mockRunner = await mockRunnerModule();

// Some imports needs to be done dynamically, so that their dependencies will be mocked.
// https://github.com/GoogleChrome/lighthouse/blob/main/docs/hacking-tips.md#mocking-modules-with-testdouble
const {getStepName, getFlowName, UserFlow, auditGatherSteps} = await import('../user-flow.js');

describe('UserFlow', () => {
  let mockPage = createMockPage();

  beforeEach(() => {
    mockPage = createMockPage();

    mockRunner.reset();

    snapshotModule.snapshotGather.mockReset();
    snapshotModule.snapshotGather.mockResolvedValue({
      artifacts: {
        URL: {finalDisplayedUrl: 'https://www.example.com'},
        GatherContext: {gatherMode: 'snapshot'},
        settings: {locale: 'en-US'},
      },
      runnerOptions: {
        config: {},
        computedCache: new Map(),
      },
    });

    navigationModule.navigationGather.mockReset();
    navigationModule.navigationGather.mockResolvedValue({
      artifacts: {
        URL: {finalDisplayedUrl: 'https://www.example.com'},
        GatherContext: {gatherMode: 'navigation'},
        settings: {locale: 'en-US'},
      },
      runnerOptions: {
        config: {},
        computedCache: new Map(),
      },
    });

    const timespanGatherResult = {
      artifacts: {
        URL: {finalDisplayedUrl: 'https://www.example.com'},
        GatherContext: {gatherMode: 'timespan'},
        settings: {locale: 'en-US'},
      },
      runnerOptions: {
        config: {},
        computedCache: new Map(),
      },
    };
    const timespan = {endTimespanGather: jestMock.fn().mockResolvedValue(timespanGatherResult)};
    timespanModule.startTimespanGather.mockReset();
    timespanModule.startTimespanGather.mockResolvedValue(timespan);
  });

  describe('.navigate()', () => {
    it('should throw if a timespan is active', async () => {
      const flow = new UserFlow(mockPage.asPage());
      await flow.startTimespan();
      await expect(flow.navigate('https://example.com')).rejects.toBeTruthy();
    });

    it('should invoke navigation runner', async () => {
      const flow = new UserFlow(mockPage.asPage());

      await flow.navigate('https://example.com/1', {name: 'My Step'});

      const flags = {maxWaitForLoad: 1000};
      await flow.navigate('https://example.com/2', flags);

      await flow.navigate('https://example.com/3');

      expect(navigationModule.navigationGather).toHaveBeenCalledTimes(3);
      expect(flow._gatherSteps).toMatchObject([
        {flags: {name: 'My Step'}},
        {flags: {maxWaitForLoad: 1000, skipAboutBlank: true, disableStorageReset: true}},
        {flags: {skipAboutBlank: true, disableStorageReset: true}},
      ]);
    });

    it('should merge flow flags with step flags', async () => {
      const flowFlags = {maxWaitForLoad: 500, maxWaitForFcp: 500};
      const flow = new UserFlow(mockPage.asPage(), {flags: flowFlags});
      await flow.navigate('https://example.com/1');

      const flags = {maxWaitForLoad: 1000};
      await flow.navigate('https://example.com/2', flags);

      expect(navigationModule.navigationGather).toHaveBeenCalledTimes(2);
      /** @type {any[][]} */
      const [[,, call1], [,, call2]] =
        navigationModule.navigationGather.mock.calls;

      expect(call1.flags.maxWaitForLoad).toBe(500);
      expect(call1.flags.maxWaitForFcp).toBe(500);
      expect(call2.flags.maxWaitForLoad).toBe(1000);
      expect(call2.flags.maxWaitForFcp).toBe(500);

      // Check that we didn't mutate the original objects.
      expect(flowFlags).toEqual({maxWaitForLoad: 500, maxWaitForFcp: 500});
      expect(flags).toEqual({maxWaitForLoad: 1000});
    });

    it('should disable storage reset on subsequent navigations', async () => {
      const flow = new UserFlow(mockPage.asPage());
      await flow.navigate('https://example.com/1');

      // Try once when we have some other settings.
      const flags = {maxWaitForLoad: 1000};
      await flow.navigate('https://example.com/2', flags);

      // Try once when we don't have any other settings.
      await flow.navigate('https://example.com/3');

      // Try once when we explicitly set it.
      const flagsExplicit = {disableStorageReset: false};
      await flow.navigate('https://example.com/4', flagsExplicit);

      // Try once when we explicitly set it on the flow.
      const flowFlagsExplicit = {disableStorageReset: false};
      const flow2 = new UserFlow(mockPage.asPage(), {flags: flowFlagsExplicit});
      await flow2.navigate('https://example.com/5');

      // Check that we have the property set.
      expect(navigationModule.navigationGather).toHaveBeenCalledTimes(5);
      /** @type {any[][]} */
      const [[,, call1], [,, call2], [,, call3], [,, call4], [,, call5]] =
        navigationModule.navigationGather.mock.calls;
      expect(call1).not.toHaveProperty('flags.disableStorageReset');
      expect(call2).toHaveProperty('flags.disableStorageReset');
      expect(call3).toHaveProperty('flags.disableStorageReset');
      expect(call4).toHaveProperty('flags.disableStorageReset');
      expect(call5).toHaveProperty('flags.disableStorageReset');
      expect(call2.flags.disableStorageReset).toBe(true);
      expect(call3.flags.disableStorageReset).toBe(true);
      expect(call4.flags.disableStorageReset).toBe(false);
      expect(call5.flags.disableStorageReset).toBe(false);

      // Check that we didn't mutate the original objects.
      expect(flags).toEqual({maxWaitForLoad: 1000});
      expect(flagsExplicit).toEqual({disableStorageReset: false});
      expect(flowFlagsExplicit).toEqual({disableStorageReset: false});
    });

    it('should disable about:blank jumps by default', async () => {
      const flow = new UserFlow(mockPage.asPage());
      await flow.navigate('https://example.com/1');

      // Try once when we have some other settings.
      const flags = {maxWaitForLoad: 1000};
      await flow.navigate('https://example.com/2', flags);

      // Try once when we explicitly set it.
      const flagsExplicit = {skipAboutBlank: false};
      await flow.navigate('https://example.com/3', flagsExplicit);

      // Try once when we explicitly set it on the flow.
      const flowFlagsExplicit = {skipAboutBlank: false};
      const flow2 = new UserFlow(mockPage.asPage(), {flags: flowFlagsExplicit});
      await flow2.navigate('https://example.com/5');

      // Check that we have the property set.
      expect(navigationModule.navigationGather).toHaveBeenCalledTimes(4);
      /** @type {any[][]} */
      const [[,, call1], [,, call2], [,, call3], [,, call4]] =
        navigationModule.navigationGather.mock.calls;
      expect(call1).toHaveProperty('flags.skipAboutBlank');
      expect(call2).toHaveProperty('flags.skipAboutBlank');
      expect(call3).toHaveProperty('flags.skipAboutBlank');
      expect(call4).toHaveProperty('flags.skipAboutBlank');
      expect(call1.flags.skipAboutBlank).toBe(true);
      expect(call2.flags.skipAboutBlank).toBe(true);
      expect(call3.flags.skipAboutBlank).toBe(false);
      expect(call4.flags.skipAboutBlank).toBe(false);

      // Check that we didn't mutate the original objects.
      expect(flags).toEqual({maxWaitForLoad: 1000});
      expect(flagsExplicit).toEqual({skipAboutBlank: false});
      expect(flowFlagsExplicit).toEqual({skipAboutBlank: false});
    });
  });

  describe('.startNavigation()', () => {
    it('should only run navigation setup', async () => {
      let setupDone = false;
      let teardownDone = false;
      navigationModule.navigationGather.mockImplementation(async (_, cb) => {
        setupDone = true;
        // @ts-expect-error
        await cb();
        teardownDone = true;
      });
      const flow = new UserFlow(mockPage.asPage());
      await flow.startNavigation();
      expect(setupDone).toBeTruthy();
      expect(teardownDone).toBeFalsy();
    });

    it('should throw errors from the setup phase', async () => {
      navigationModule.navigationGather.mockRejectedValue(new Error('Setup Error'));
      const flow = new UserFlow(mockPage.asPage());
      const startPromise = flow.startNavigation();
      await expect(startPromise).rejects.toThrowError('Setup Error');
    });
  });

  describe('.endNavigation()', () => {
    it('should throw if a timespan is active', async () => {
      const flow = new UserFlow(mockPage.asPage());
      await flow.startTimespan();
      await expect(flow.startNavigation()).rejects.toThrowError('Timespan already in progress');
    });

    it('should throw if a navigation is not active', async () => {
      const flow = new UserFlow(mockPage.asPage());
      await expect(flow.endNavigation()).rejects.toThrowError('No navigation in progress');
    });

    it('should throw errors from the teardown phase', async () => {
      navigationModule.navigationGather.mockImplementation(async (_, cb) => {
        // @ts-expect-error
        await cb();
        throw new Error('Teardown Error');
      });
      const flow = new UserFlow(mockPage.asPage());

      // Should not throw the error here.
      await flow.startNavigation();

      const teardownPromise = flow.endNavigation();
      await expect(teardownPromise).rejects.toThrowError('Teardown Error');
    });
  });

  describe('.startTimespan()', () => {
    it('should throw if a timespan is active', async () => {
      const flow = new UserFlow(mockPage.asPage());
      await flow.startTimespan();
      await expect(flow.startTimespan()).rejects.toBeTruthy();
    });

    it('should invoke timespan runner', async () => {
      const flow = new UserFlow(mockPage.asPage());

      await flow.startTimespan({name: 'My Timespan'});
      await flow.endTimespan();

      await flow.startTimespan();
      await flow.endTimespan();

      expect(timespanModule.startTimespanGather).toHaveBeenCalledTimes(2);
      expect(flow._gatherSteps).toMatchObject([
        {flags: {name: 'My Timespan', usePassiveGathering: true}},
        {flags: {usePassiveGathering: true}},
      ]);
    });

    it('should merge flow flags with step flags', async () => {
      const flowFlags = {maxWaitForLoad: 500, maxWaitForFcp: 500};
      const flow = new UserFlow(mockPage.asPage(), {flags: flowFlags});
      await flow.startTimespan();
      await flow.endTimespan();

      const flags = {maxWaitForLoad: 1000};
      await flow.startTimespan(flags);
      await flow.endTimespan();

      expect(timespanModule.startTimespanGather).toHaveBeenCalledTimes(2);
      /** @type {any[][]} */
      const [[, call1], [, call2]] =
        timespanModule.startTimespanGather.mock.calls;

      expect(call1.flags.maxWaitForLoad).toBe(500);
      expect(call1.flags.maxWaitForFcp).toBe(500);
      expect(call2.flags.maxWaitForLoad).toBe(1000);
      expect(call2.flags.maxWaitForFcp).toBe(500);

      // Check that we didn't mutate the original objects.
      expect(flowFlags).toEqual({maxWaitForLoad: 500, maxWaitForFcp: 500});
      expect(flags).toEqual({maxWaitForLoad: 1000});
    });
  });

  describe('.endTimespan()', () => {
    it('should throw if a timespan has not started', async () => {
      const flow = new UserFlow(mockPage.asPage());
      await expect(flow.endTimespan()).rejects.toBeTruthy();
    });
  });

  describe('.snapshot()', () => {
    it('should throw if a timespan is active', async () => {
      const flow = new UserFlow(mockPage.asPage());
      await flow.startTimespan();
      await expect(flow.snapshot()).rejects.toBeTruthy();
    });

    it('should invoke snapshot runner', async () => {
      const flow = new UserFlow(mockPage.asPage());

      await flow.snapshot({name: 'My Snapshot'});
      await flow.snapshot();

      expect(snapshotModule.snapshotGather).toHaveBeenCalledTimes(2);
      expect(flow._gatherSteps).toMatchObject([
        {flags: {name: 'My Snapshot', usePassiveGathering: true}},
        {flags: {usePassiveGathering: true}},
      ]);
    });

    it('should merge flow flags with step flags', async () => {
      const flowFlags = {maxWaitForLoad: 500, maxWaitForFcp: 500};
      const flow = new UserFlow(mockPage.asPage(), {flags: flowFlags});
      await flow.snapshot();

      const flags = {maxWaitForLoad: 1000};
      await flow.snapshot(flags);

      expect(snapshotModule.snapshotGather).toHaveBeenCalledTimes(2);
      /** @type {any[][]} */
      const [[, call1], [, call2]] =
        snapshotModule.snapshotGather.mock.calls;

      expect(call1.flags.maxWaitForLoad).toBe(500);
      expect(call1.flags.maxWaitForFcp).toBe(500);
      expect(call2.flags.maxWaitForLoad).toBe(1000);
      expect(call2.flags.maxWaitForFcp).toBe(500);

      // Check that we didn't mutate the original objects.
      expect(flowFlags).toEqual({maxWaitForLoad: 500, maxWaitForFcp: 500});
      expect(flags).toEqual({maxWaitForLoad: 1000});
    });
  });

  describe('.getFlowResult', () => {
    it('should throw if no flow steps have been run', async () => {
      const flow = new UserFlow(mockPage.asPage());
      const flowResultPromise = flow.createFlowResult();
      await expect(flowResultPromise).rejects.toThrow(/Need at least one step/);
    });

    it('should audit active gather steps', async () => {
      mockRunner.audit.mockImplementation(artifacts => ({
        lhr: {
          finalDisplayedUrl: artifacts.URL.finalDisplayedUrl,
          gatherMode: artifacts.GatherContext.gatherMode,
        },
      }));
      const flow = new UserFlow(mockPage.asPage());

      await flow.navigate('https://www.example.com/');
      await flow.startTimespan({name: 'My Timespan'});
      await flow.endTimespan();
      await flow.snapshot({name: 'My Snapshot'});

      const flowResult = await flow.createFlowResult();
      expect(flowResult).toMatchObject({
        steps: [
          {
            lhr: {finalDisplayedUrl: 'https://www.example.com', gatherMode: 'navigation'},
            name: 'Navigation report (www.example.com/)',
          },
          {
            lhr: {finalDisplayedUrl: 'https://www.example.com', gatherMode: 'timespan'},
            name: 'My Timespan',
          },
          {
            lhr: {finalDisplayedUrl: 'https://www.example.com', gatherMode: 'snapshot'},
            name: 'My Snapshot',
          },
        ],
        name: 'User flow (www.example.com)',
      });
    });
  });

  describe('auditGatherSteps', () => {
    it('should audit gather steps', async () => {
      mockRunner.getGathererList.mockImplementation(Runner.getGathererList);
      mockRunner.getAuditList.mockImplementation(Runner.getAuditList);
      mockRunner.audit.mockImplementation(artifacts => ({
        lhr: {
          finalDisplayedUrl: artifacts.URL.finalDisplayedUrl,
          gatherMode: artifacts.GatherContext.gatherMode,
        },
      }));

      /** @type {LH.Config} */
      const flowConfig = {
        extends: 'lighthouse:default',
        settings: {
          skipAudits: ['uses-http2'],
        },
      };

      /** @type {any} */
      const gatherSteps = [
        {
          flags: {name: 'Navigation'},
          artifacts: {
            URL: {
              requestedUrl: 'https://www.example.com',
              mainDocumentUrl: 'https://www.example.com',
              finalDisplayedUrl: 'https://www.example.com',
            },
            GatherContext: {gatherMode: 'navigation'},
            settings: {locale: 'en-US'},
          },
        },
        {
          flags: {name: 'Timespan', onlyCategories: ['performance']},
          artifacts: {
            URL: {
              finalDisplayedUrl: 'https://www.example.com',
            },
            GatherContext: {gatherMode: 'timespan'},
            settings: {locale: 'en-US'},
          },
        },
        {
          flags: {name: 'Snapshot', onlyCategories: ['accessibility']},
          artifacts: {
            URL: {
              finalDisplayedUrl: 'https://www.example.com',
            },
            GatherContext: {gatherMode: 'snapshot'},
            settings: {locale: 'en-US'},
          },
        },
      ];

      const flowResult = await auditGatherSteps(gatherSteps, {config: flowConfig});

      // @ts-expect-error toMatchObject is giving a loud annoying error...
      // Not sure why.
      //     Index signature for type 'string' is missing
      //     in type '(Artifacts | { config: { settings: { skipAudits: string[]; }; }; })[]'
      expect(mockRunner.audit.mock.calls).toMatchObject([
        [
          gatherSteps[0].artifacts,
          {
            resolvedConfig: {
              settings: {
                skipAudits: ['uses-http2'],
              },
            },
          },
        ],
        [
          gatherSteps[1].artifacts,
          {
            resolvedConfig: {
              settings: {
                onlyCategories: ['performance'],
              },
            },
          },
        ],
        [
          gatherSteps[2].artifacts,
          {
            resolvedConfig: {
              settings: {
                onlyCategories: ['accessibility'],
              },
            },
          },
        ],
      ]);

      expect(flowResult).toMatchObject({
        steps: [
          {
            lhr: {finalDisplayedUrl: 'https://www.example.com', gatherMode: 'navigation'},
            name: 'Navigation',
          },
          {
            lhr: {finalDisplayedUrl: 'https://www.example.com', gatherMode: 'timespan'},
            name: 'Timespan',
          },
          {
            lhr: {finalDisplayedUrl: 'https://www.example.com', gatherMode: 'snapshot'},
            name: 'Snapshot',
          },
        ],
        name: 'User flow (www.example.com)',
      });
    });
  });

  describe('getStepName', () => {
    it('returns name from flags if provided', () => {
      /** @type {any} */
      const artifacts = {
        URL: {
          finalDisplayedUrl: 'https://example.com',
        },
        GatherContext: {gatherMode: 'navigation'},
        settings: {
          locale: 'en-US',
        },
      };
      const name = getStepName({name: 'Example name'}, artifacts);
      expect(name).toEqual('Example name');
    });

    it('returns default navigation name if no name provided', () => {
      /** @type {any} */
      const artifacts = {
        URL: {
          finalDisplayedUrl: 'https://example.com',
        },
        GatherContext: {gatherMode: 'navigation'},
        settings: {
          locale: 'en-US',
        },
      };
      const name = getStepName({}, artifacts);
      expect(name).toEqual('Navigation report (example.com/)');
    });

    it('returns default timespan name if no name provided', () => {
      /** @type {any} */
      const artifacts = {
        URL: {
          finalDisplayedUrl: 'https://example.com',
        },
        GatherContext: {gatherMode: 'timespan'},
        settings: {
          locale: 'en-US',
        },
      };
      const name = getStepName({}, artifacts);
      expect(name).toEqual('Timespan report (example.com/)');
    });

    it('returns default snapshot name if no name provided', () => {
      /** @type {any} */
      const artifacts = {
        URL: {
          finalDisplayedUrl: 'https://example.com',
        },
        GatherContext: {gatherMode: 'snapshot'},
        settings: {
          locale: 'en-US',
        },
      };
      const name = getStepName({}, artifacts);
      expect(name).toEqual('Snapshot report (example.com/)');
    });

    it('throws on invalid gather mode', () => {
      /** @type {any} */
      const artifacts = {
        URL: {
          finalDisplayedUrl: 'https://example.com',
        },
        GatherContext: {gatherMode: 'invalid'},
        settings: {
          locale: 'en-US',
        },
      };
      expect(() => getStepName({}, artifacts)).toThrow('Unsupported gather mode');
    });

    it('returns translated name for non-default locale', () => {
      /** @type {any} */
      const artifacts = {
        URL: {
          finalDisplayedUrl: 'https://example.com',
        },
        GatherContext: {gatherMode: 'navigation'},
        settings: {
          locale: 'en-XL',
        },
      };
      const name = getStepName({}, artifacts);
      expect(name).toEqual('N̂áv̂íĝát̂íôń r̂ép̂ór̂t́ (example.com/)');
    });
  });

  describe('getFlowName', () => {
    it('returns name from options if provided', () => {
      /** @type {any} */
      const gatherSteps = [{
        artifacts: {
          URL: {
            finalDisplayedUrl: 'https://example.com',
          },
          GatherContext: {gatherMode: 'navigation'},
          settings: {
            locale: 'en-US',
          },
        },
      }];
      const name = getFlowName('Example name', gatherSteps);
      expect(name).toEqual('Example name');
    });

    it('returns default navigation name if no name provided', () => {
      /** @type {any} */
      const gatherSteps = [{
        artifacts: {
          URL: {
            finalDisplayedUrl: 'https://example.com',
          },
          GatherContext: {gatherMode: 'navigation'},
          settings: {
            locale: 'en-US',
          },
        },
      }];
      const name = getFlowName(undefined, gatherSteps);
      expect(name).toEqual('User flow (example.com)');
    });

    it('returns translated name for non-default locale', () => {
      /** @type {any} */
      const gatherSteps = [{
        artifacts: {
          URL: {
            finalDisplayedUrl: 'https://example.com',
          },
          GatherContext: {gatherMode: 'navigation'},
          settings: {
            locale: 'en-XL',
          },
        },
      }];
      const name = getFlowName(undefined, gatherSteps);
      expect(name).toEqual('Ûśêŕ f̂ĺôẃ (example.com)');
    });
  });
});

