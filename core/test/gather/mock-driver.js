/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Mock driver for testing.
 */

import jestMock from 'jest-mock';
import * as td from 'testdouble';

import {
  createMockOnFn,
  createMockOnceFn,
  createMockSendCommandFn,
} from './mock-commands.js';
import * as constants from '../../config/constants.js';
import {fnAny} from '../test-utils.js';
import {NetworkMonitor} from '../../gather/driver/network-monitor.js';

/** @typedef {import('../../gather/driver.js').Driver} Driver */
/** @typedef {import('../../gather/driver/execution-context.js')} ExecutionContext */

function createMockSession() {
  const mockSendCommand = createMockSendCommandFn();
  return {
    setTargetInfo: fnAny(),
    sendCommand: mockSendCommand,
    sendCommandAndIgnore: mockSendCommand,
    setNextProtocolTimeout: fnAny(),
    hasNextProtocolTimeout: fnAny(),
    getNextProtocolTimeout: fnAny(),
    once: createMockOnceFn(),
    on: createMockOnFn(),
    off: fnAny(),
    addProtocolMessageListener: createMockOnFn(),
    removeProtocolMessageListener: fnAny(),
    dispose: fnAny(),
    onCrashPromise: fnAny().mockReturnValue(new Promise(() => {})),

    /** @return {LH.Gatherer.ProtocolSession} */
    asSession() {
      return this;
    },
  };
}

/**
 * @param {string} sessionId
 */
function createMockCdpSession(sessionId = 'DEFAULT_ID') {
  const connection = createMockCdpConnection();

  return {
    id: () => sessionId,
    send: createMockSendCommandFn(),
    once: createMockOnceFn(),
    on: createMockOnFn(),
    off: fnAny(),
    removeAllListeners: fnAny(),
    detach: fnAny(),

    connection() {
      return connection;
    },

    /** @return {LH.Puppeteer.CDPSession} */
    asCdpSession() {
      // @ts-expect-error - We'll rely on the tests passing to know this matches.
      return this;
    },
  };
}

function createMockCdpConnection() {
  return {
    on: createMockOnFn(),
    off: fnAny(),

    /** @return {LH.Puppeteer.Connection} */
    asCdpConnection() {
      // @ts-expect-error - We'll rely on the tests passing to know this matches.
      return this;
    },
  };
}

/**
 * @param {LH.Gatherer.AnyGathererInstance['meta']} meta
 */
function createMockGathererInstance(meta) {
  return {
    meta,
    startInstrumentation: fnAny(),
    stopInstrumentation: fnAny(),
    startSensitiveInstrumentation: fnAny(),
    stopSensitiveInstrumentation: fnAny(),
    getArtifact: fnAny(),

    /** @return {LH.Gatherer.AnyGathererInstance} */
    asGatherer() {
      return this;
    },
  };
}

function createMockPage() {
  return {
    url: fnAny().mockReturnValue('https://example.com'),
    goto: fnAny(),
    target: () => ({createCDPSession: () => createMockSession()}),

    /** @return {LH.Puppeteer.Page} */
    asPage() {
      // @ts-expect-error - We'll rely on the tests passing to know this matches.
      return this;
    },
  };
}

function createMockExecutionContext() {
  return {
    evaluate: fnAny(),
    evaluateAsync: fnAny(),
    evaluateOnNewDocument: fnAny(),
    cacheNativesOnNewDocument: fnAny(),

    /** @return {ExecutionContext} */
    asExecutionContext() {
      // @ts-expect-error - We'll rely on the tests passing to know this matches.
      return this;
    },
  };
}

/** @param {ReturnType<typeof createMockSession>} session */
function createMockTargetManager(session) {
  return {
    rootSession: () => session,
    mainFrameExecutionContexts: () => [{uniqueId: 'EXECUTION_CTX_ID'}],
    enable: fnAny(),
    disable: fnAny(),
    on: createMockOnFn(),
    off: fnAny(),

    /** @return {LH.Gatherer.Driver['targetManager']} */
    asTargetManager() {
      // @ts-expect-error - We'll rely on the tests passing to know this matches.
      return this;
    },
  };
}

function createMockDriver() {
  const page = createMockPage();
  const session = createMockSession();
  const context = createMockExecutionContext();
  const targetManager = createMockTargetManager(session);

  return {
    _page: page,
    _executionContext: context,
    _session: session,
    url: jestMock.fn(() => page.url()),
    defaultSession: session,
    connect: fnAny(),
    disconnect: fnAny(),
    executionContext: context.asExecutionContext(),
    targetManager: targetManager.asTargetManager(),
    fetcher: {
      fetchResource: fnAny(),
    },
    networkMonitor: new NetworkMonitor(targetManager.asTargetManager()),

    /** @return {Driver} */
    asDriver() {
      // @ts-expect-error - We'll rely on the tests passing to know this matches.
      return this;
    },
  };
}

const runnerMock = {
  getAuditList: fnAny().mockReturnValue([]),
  getGathererList: fnAny().mockReturnValue([]),
  audit: fnAny(),
  gather: fnAny(),
  reset() {
    runnerMock.getGathererList.mockReturnValue([]);
    runnerMock.getAuditList.mockReturnValue([]);
    runnerMock.audit.mockReset();
    runnerMock.gather.mockReset();
  },
};
async function mockRunnerModule() {
  await td.replaceEsm('../../runner.js', {Runner: runnerMock});
  return runnerMock;
}

/** @param {() => Driver} driverProvider */
function mockDriverModule(driverProvider) {
  return {
    // This must be a regular function becaues Driver is always invoked as a constructor.
    // Arrow functions cannot be invoked with `new`.
    Driver: function() {
      return driverProvider();
    },
  };
}

/**
 * @returns {LH.BaseArtifacts}
 */
function createMockBaseArtifacts() {
  return {
    fetchTime: new Date().toISOString(),
    URL: {
      requestedUrl: 'https://example.com',
      mainDocumentUrl: 'https://example.com',
      finalDisplayedUrl: 'https://example.com',
    },
    PageLoadError: null,
    settings: constants.defaultSettings,
    BenchmarkIndex: 500,
    LighthouseRunWarnings: [],
    Timing: [],
    HostFormFactor: 'desktop',
    HostUserAgent: 'Chrome/93.0.0.0',
    HostProduct: 'Chrome/93.0.1449.0',
    GatherContext: {gatherMode: 'navigation'},
  };
}

function createMockContext() {
  return {
    driver: createMockDriver(),
    url: 'https://example.com',
    gatherMode: 'navigation',
    computedCache: new Map(),
    dependencies: {},
    baseArtifacts: createMockBaseArtifacts(),
    settings: JSON.parse(JSON.stringify(constants.defaultSettings)),

    /** @return {LH.Gatherer.Context} */
    asContext() {
      // @ts-expect-error - We'll rely on the tests passing to know this matches.
      return this;
    },
  };
}

async function mockDriverSubmodules() {
  const navigationMock = {gotoURL: fnAny()};
  const prepareMock = {
    prepareThrottlingAndNetwork: fnAny(),
    prepareTargetForTimespanMode: fnAny(),
    prepareTargetForNavigationMode: fnAny(),
    prepareTargetForIndividualNavigation: fnAny(),
    enableAsyncStacks: fnAny().mockReturnValue(fnAny()),
  };
  const storageMock = {clearDataForOrigin: fnAny()};
  const emulationMock = {
    clearThrottling: fnAny(),
    emulate: fnAny(),
  };
  const networkMock = {
    fetchResponseBodyFromCache: fnAny(),
  };

  function reset() {
    navigationMock.gotoURL = fnAny().mockResolvedValue({finalDisplayedUrl: 'https://example.com', warnings: [], timedOut: false});
    prepareMock.prepareThrottlingAndNetwork = fnAny().mockResolvedValue(undefined);
    prepareMock.prepareTargetForTimespanMode = fnAny().mockResolvedValue(undefined);
    prepareMock.prepareTargetForNavigationMode = fnAny().mockResolvedValue({warnings: []});
    prepareMock.prepareTargetForIndividualNavigation = fnAny().mockResolvedValue({warnings: []});
    storageMock.clearDataForOrigin = fnAny();
    emulationMock.clearThrottling = fnAny();
    emulationMock.emulate = fnAny();
    networkMock.fetchResponseBodyFromCache = fnAny().mockResolvedValue('');
  }

  /**
   * @param {Record<string, (...args: any[]) => any>} target
   * @param {string} name
   * @return {(...args: any[]) => void}
   */
  const get = (target, name) => {
    // @ts-expect-error: hack? What is going on here? Should we just remove the proxy stuff?
    if (name === 'then') return target;
    if (!target[name]) throw new Error(`Target does not have property "${name}"`);
    return (...args) => target[name](...args);
  };

  await td.replaceEsm('../../gather/driver/navigation.js', new Proxy(navigationMock, {get}));
  await td.replaceEsm('../../gather/driver/prepare.js', new Proxy(prepareMock, {get}));
  await td.replaceEsm('../../gather/driver/storage.js', new Proxy(storageMock, {get}));
  await td.replaceEsm('../../gather/driver/network.js', new Proxy(networkMock, {get}));
  await td.replaceEsm('../../lib/emulation.js', new Proxy(emulationMock, {get}));

  reset();

  return {
    navigationMock,
    prepareMock,
    storageMock,
    emulationMock,
    networkMock,
    reset,
  };
}

export {
  mockRunnerModule,
  mockDriverModule,
  mockDriverSubmodules,
  createMockDriver,
  createMockPage,
  createMockSession,
  createMockCdpSession,
  createMockGathererInstance,
  createMockBaseArtifacts,
  createMockContext,
};
