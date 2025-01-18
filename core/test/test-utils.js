/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import url from 'url';
import {createRequire} from 'module';
import {gunzipSync} from 'zlib';

import * as td from 'testdouble';
import jestMock from 'jest-mock';

import {LH_ROOT} from '../../shared/root.js';
import * as mockCommands from './gather/mock-commands.js';
import {NetworkRecorder} from '../lib/network-recorder.js';
import {timers} from './test-env/fake-timers.js';
import {getModuleDirectory} from '../../shared/esm-utils.js';

const require = createRequire(import.meta.url);

/**
 * Some tests use the result of a LHR processed by our proto serialization.
 * Proto is an annoying dependency to setup, so we allows tests that use it
 * to be skipped when run locally. This makes external contributions simpler.
 *
 * Along with the sample LHR, this function returns jest `it` and `describe`
 * functions that will skip if the sample LHR could not be loaded.
 */
function getProtoRoundTrip() {
  let sampleResultsRoundtripStr;
  let describeIfProtoExists;
  let itIfProtoExists;
  try {
    sampleResultsRoundtripStr =
      fs.readFileSync(LH_ROOT + '/.tmp/sample_v2_round_trip.json', 'utf-8');
    describeIfProtoExists = describe;
    itIfProtoExists = it;
  } catch (err) {
    if (process.env.GITHUB_ACTIONS) {
      throw new Error('sample_v2_round_trip must be generated for CI proto test');
    }
    // Otherwise no proto roundtrip for tests, so skip them.
    // This is fine for running the tests locally.

    itIfProtoExists = it.skip;
    describeIfProtoExists = describe.skip;
  }

  return {
    itIfProtoExists,
    describeIfProtoExists,
    sampleResultsRoundtripStr,
  };
}

/**
 * @param {string} name
 * @return {{map: LH.Artifacts.RawSourceMap, content: string}}
 */
function loadSourceMapFixture(name) {
  const dir = `${LH_ROOT}/core/test/fixtures/source-maps`;
  const mapJson = fs.readFileSync(`${dir}/${name}.js.map`, 'utf-8');
  const content = fs.readFileSync(`${dir}/${name}.js`, 'utf-8');
  return {
    map: JSON.parse(mapJson),
    content,
  };
}

/**
 * @param {string} name
 * @return {{map: LH.Artifacts.RawSourceMap, content: string, usage: LH.Crdp.Profiler.ScriptCoverage}}
 */
function loadSourceMapAndUsageFixture(name) {
  const dir = `${LH_ROOT}/core/test/fixtures/source-maps`;
  const usagePath = `${dir}/${name}.usage.json`;
  const usageJson = fs.readFileSync(usagePath, 'utf-8');

  // Usage is exported from DevTools, which simplifies the real format of the
  // usage protocol.
  /** @type {{url: string, ranges: Array<{start: number, end: number, count: number}>}} */
  const exportedUsage = JSON.parse(usageJson);
  const usage = {
    scriptId: name,
    url: exportedUsage.url,
    functions: [
      {
        functionName: 'FakeFunctionName', // Not used.
        isBlockCoverage: false, // Not used.
        ranges: exportedUsage.ranges.map((range, i) => {
          return {
            startOffset: range.start,
            endOffset: range.end,
            count: i % 2 === 0 ? 0 : 1,
          };
        }),
      },
    ],
  };

  return {
    ...loadSourceMapFixture(name),
    usage,
  };
}

/**
 * @param {string} name
 * @return {{devtoolsLog: LH.DevtoolsLog, trace: LH.Trace}}
 */
function loadTraceFixture(name) {
  const dir = `${LH_ROOT}/core/test/fixtures/artifacts/${name}`;
  return {
    devtoolsLog: JSON.parse(fs.readFileSync(`${dir}/devtoolslog.json`, 'utf-8')),
    trace: JSON.parse(fs.readFileSync(`${dir}/trace.json`, 'utf-8')),
  };
}

/**
 * @template {unknown[]} TParams
 * @template TReturn
 * @param {(...args: TParams) => TReturn} fn
 */
function makeParamsOptional(fn) {
  return /** @type {(...args: LH.Util.RecursivePartial<TParams>) => TReturn} */ (fn);
}

/**
 * Transparently augments the promise with inspectable functions to query its state.
 *
 * @template T
 * @param {Promise<T>} promise
 */
function makePromiseInspectable(promise) {
  let isResolved = false;
  let isRejected = false;
  /** @type {T=} */
  let resolvedValue = undefined;
  /** @type {any=} */
  let rejectionError = undefined;
  const inspectablePromise = promise.then(value => {
    isResolved = true;
    resolvedValue = value;
    return value;
  }).catch(err => {
    isRejected = true;
    rejectionError = err;
    throw err;
  });

  return Object.assign(inspectablePromise, {
    isDone() {
      return isResolved || isRejected;
    },
    isResolved() {
      return isResolved;
    },
    isRejected() {
      return isRejected;
    },
    getDebugValues() {
      return {resolvedValue, rejectionError};
    },
  });
}
function createDecomposedPromise() {
  /** @type {Function} */
  let resolve;
  /** @type {Function} */
  let reject;
  const promise = new Promise((r1, r2) => {
    resolve = r1;
    reject = r2;
  });
  // @ts-expect-error: Ignore 'unused' error.
  return {promise, resolve, reject};
}

/**
 * In some functions we have lots of promise follow ups that get queued by protocol messages.
 * This is a convenience method to easily advance all timers and flush all the queued microtasks.
 */
async function flushAllTimersAndMicrotasks(ms = 1000) {
  for (let i = 0; i < ms; i++) {
    timers.advanceTimersByTime(1);
    await Promise.resolve();
  }
}

/**
 * Mocks gatherers for BaseArtifacts that tests for components using GatherRunner
 * shouldn't concern themselves about.
 */
async function makeMocksForGatherRunner() {
  await td.replaceEsm('../gather/driver/environment.js', {
    getBenchmarkIndex: () => Promise.resolve(150),
    getBrowserVersion: async () => ({userAgent: 'Chrome', milestone: 80}),
    getEnvironmentWarnings: () => [],
  });
  await td.replaceEsm('../lib/emulation.js', {
    emulate: jestMock.fn(),
    throttle: jestMock.fn(),
    clearThrottling: jestMock.fn(),
  });
  await td.replaceEsm('../gather/driver/prepare.js', {
    prepareTargetForNavigationMode: jestMock.fn(),
    prepareTargetForIndividualNavigation: jestMock.fn().mockResolvedValue({warnings: []}),
    enableAsyncStacks: jestMock.fn().mockReturnValue(jestMock.fn()),
  });
  await td.replaceEsm('../gather/driver/storage.js', {
    clearDataForOrigin: jestMock.fn(),
    cleanBrowserCaches: jestMock.fn(),
    getImportantStorageWarning: jestMock.fn(),
  });
  await td.replaceEsm('../gather/driver/navigation.js', {
    gotoURL: jestMock.fn().mockResolvedValue({
      mainDocumentUrl: 'http://example.com',
      warnings: [],
    }),
  });
}

/**
 * Same as jestMock.fn(), but uses `any` instead of `unknown`.
 */
const fnAny = () => {
  return /** @type {Mock<any, any>} */ (jestMock.fn());
};

/**
 * @param {Partial<LH.Artifacts.Script>} script
 * @return {LH.Artifacts.Script} script
 */
function createScript(script) {
  if (!script.scriptId) throw new Error('Must include a scriptId');

  // @ts-expect-error For testing purposes we assume the test set all valid properties.
  return {
    ...script,
    length: script.content?.length ?? script.length,
    name: script.name ?? script.url ?? '<no name>',
    scriptLanguage: 'JavaScript',
  };
}

/**
 * This has a slightly different, less strict implementation than `PageDependencyGraph`.
 * It's a convenience function so we don't have to dig through the log and determine the URL artifact manually.
 *
 * @param {LH.DevtoolsLog} devtoolsLog
 * @return {LH.Artifacts['URL']}
 */
function getURLArtifactFromDevtoolsLog(devtoolsLog) {
  /** @type {string|undefined} */
  let requestedUrl;
  /** @type {string|undefined} */
  let mainDocumentUrl;
  for (const event of devtoolsLog) {
    if (event.method === 'Page.frameNavigated' && !event.params.frame.parentId) {
      const {url} = event.params.frame;
      // Only set requestedUrl on the first main frame navigation.
      if (!requestedUrl) requestedUrl = url;
      mainDocumentUrl = url;
    }
  }
  const networkRecords = NetworkRecorder.recordsFromLogs(devtoolsLog);
  let initialRequest = networkRecords.find(r => r.url === requestedUrl);
  while (initialRequest?.redirectSource) {
    initialRequest = initialRequest.redirectSource;
    requestedUrl = initialRequest.url;
  }
  if (!requestedUrl || !mainDocumentUrl) throw new Error('No main frame navigations found');

  return {
    requestedUrl,
    mainDocumentUrl,
    finalDisplayedUrl: mainDocumentUrl,
  };
}

/**
 * Use to import a module in tests with Mock types.
 * Asserts that the module is actually a mock.
 * Resolves module path relative to importMeta.url.
 *
 * @param {string} modulePath
 * @param {ImportMeta} importMeta
 * @return {Promise<Record<string, Mock<any, any>>>}
 */
async function importMock(modulePath, importMeta) {
  const mock = await import(new URL(modulePath, importMeta.url).href);
  if (!Object.keys(mock).some(key => mock[key]?.mock)) {
    throw new Error(`${modulePath} was not mocked!`);
  }
  return mock;
}

/**
 * Same as importMock, but uses require instead to avoid
 * an unnecessary `.default` or Promise return value.
 *
 * @param {string} modulePath
 * @param {ImportMeta} importMeta
 * @return {Record<string, Mock<any, any>>}
 */
function requireMock(modulePath, importMeta) {
  const dir = path.dirname(url.fileURLToPath(importMeta.url));
  modulePath = path.resolve(dir, modulePath);
  const mock = require(modulePath);
  if (!Object.keys(mock).some(key => mock[key]?.mock)) {
    throw new Error(`${modulePath} was not mocked!`);
  }
  return mock;
}

/**
 * Return parsed json object.
 * Resolves path relative to importMeta.url (if provided) or LH_ROOT (if not provided).
 * Supports `.json.gz`
 *
 * Note: Do not use this in core/ outside tests or scripts, as it
 * will not be inlined when bundled. Instead, use `fs.readFileSync`.
 *
 * @param {string} filePath Can be an absolute or relative path.
 * @param {ImportMeta=} importMeta
 */
function readJson(filePath, importMeta) {
  const dir = importMeta ? getModuleDirectory(importMeta) : LH_ROOT;
  filePath = path.resolve(dir, filePath);
  if (filePath.endsWith('.gz')) {
    return JSON.parse(gunzipSync(fs.readFileSync(filePath)).toString('utf-8'));
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export {
  timers,
  getProtoRoundTrip,
  loadSourceMapFixture,
  loadSourceMapAndUsageFixture,
  makeParamsOptional,
  makePromiseInspectable,
  createDecomposedPromise,
  flushAllTimersAndMicrotasks,
  makeMocksForGatherRunner,
  loadTraceFixture,
  fnAny,
  mockCommands,
  createScript,
  getURLArtifactFromDevtoolsLog,
  importMock,
  requireMock,
  readJson,
};
