/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const Gatherer = require('../../gather/gatherers/gatherer.js');
const GatherRunner_ = require('../../gather/gather-runner.js');
const assert = require('assert').strict;
const Config = require('../../config/config.js');
const unresolvedPerfLog = require('./../fixtures/unresolved-perflog.json');
const NetworkRequest = require('../../lib/network-request.js');
const LHError = require('../../lib/lh-error.js');
const networkRecordsToDevtoolsLog = require('../network-records-to-devtools-log.js');
const Driver = require('../../gather/driver.js');
const Connection = require('../../gather/connections/connection.js');
const {createMockSendCommandFn} = require('./mock-commands.js');

jest.mock('../../lib/stack-collector.js', () => () => Promise.resolve([]));

/**
 * @template {unknown[]} TParams
 * @template TReturn
 * @param {(...args: TParams) => TReturn} fn
 */
function makeParamsOptional(fn) {
  return /** @type {(...args: RecursivePartial<TParams>) => TReturn} */ (fn);
}

const GatherRunner = {
  afterPass: makeParamsOptional(GatherRunner_.afterPass),
  beginRecording: makeParamsOptional(GatherRunner_.beginRecording),
  collectArtifacts: makeParamsOptional(GatherRunner_.collectArtifacts),
  endRecording: makeParamsOptional(GatherRunner_.endRecording),
  getInstallabilityErrors: makeParamsOptional(GatherRunner_.getInstallabilityErrors),
  getInterstitialError: makeParamsOptional(GatherRunner_.getInterstitialError),
  getNetworkError: makeParamsOptional(GatherRunner_.getNetworkError),
  getPageLoadError: makeParamsOptional(GatherRunner_.getPageLoadError),
  getWebAppManifest: makeParamsOptional(GatherRunner_.getWebAppManifest),
  initializeBaseArtifacts: makeParamsOptional(GatherRunner_.initializeBaseArtifacts),
  loadPage: makeParamsOptional(GatherRunner_.loadPage),
  run: makeParamsOptional(GatherRunner_.run),
  runPass: makeParamsOptional(GatherRunner_.runPass),
  setupDriver: makeParamsOptional(GatherRunner_.setupDriver),
  setupPassNetwork: makeParamsOptional(GatherRunner_.setupPassNetwork),
};

/**
 * @param {RecursivePartial<LH.Config.Json>} json
 */
function makeConfig(json) {
  // @ts-ignore: allow recursive partial.
  return new Config(json);
}

const LoadFailureMode = {
  fatal: /** @type {'fatal'} */ ('fatal'),
  ignore: /** @type {'ignore'} */ ('ignore'),
  warn: /** @type {'warn'} */ ('warn'),
};

class TestGatherer extends Gatherer {
  constructor() {
    super();
    this.called = false;
  }

  pass() {
    this.called = true;
    return 'MyArtifact';
  }
}

class TestGathererNoArtifact extends Gatherer {
  beforePass() {}
  pass() {}
  afterPass() {}
}

class EmulationDriver extends Driver {
  enableRuntimeEvents() {
    return Promise.resolve();
  }
  enableAsyncStacks() {
    return Promise.resolve();
  }
  assertNoSameOriginServiceWorkerClients() {
    return Promise.resolve();
  }
  cacheNatives() {
    return Promise.resolve();
  }
  registerPerformanceObserver() {
    return Promise.resolve();
  }
  cleanBrowserCaches() {
    return Promise.resolve();
  }
  clearDataForOrigin() {
    return Promise.resolve();
  }
}

const fakeDriver = require('./fake-driver.js');
const fakeDriverUsingRealMobileDevice = fakeDriver.fakeDriverUsingRealMobileDevice;

/** @type {EmulationDriver} */
let driver;
/** @type {Connection & {sendCommand: ReturnType<typeof createMockSendCommandFn>}} */
let connectionStub;

function resetDefaultMockResponses() {
  connectionStub.sendCommand = createMockSendCommandFn()
    .mockResponse('Emulation.setCPUThrottlingRate')
    .mockResponse('Emulation.setDeviceMetricsOverride')
    .mockResponse('Emulation.setTouchEmulationEnabled')
    .mockResponse('Network.emulateNetworkConditions')
    .mockResponse('Network.enable')
    .mockResponse('Network.setBlockedURLs')
    .mockResponse('Network.setExtraHTTPHeaders')
    .mockResponse('Network.setUserAgentOverride')
    .mockResponse('Page.enable')
    .mockResponse('ServiceWorker.enable');
}

beforeEach(() => {
  // @ts-ignore - connectionStub has a mocked version of sendCommand implemented in each test
  connectionStub = new Connection();
  // @ts-ignore
  connectionStub.sendCommand = cmd => {
    throw new Error(`${cmd} not implemented`);
  };
  driver = new EmulationDriver(connectionStub);
  resetDefaultMockResponses();
});

describe('GatherRunner', function() {
  it('loads a page and updates passContext.URL on redirect', () => {
    const url1 = 'https://example.com';
    const url2 = 'https://example.com/interstitial';
    const driver = {
      gotoURL() {
        return Promise.resolve({finalUrl: url2, timedOut: false});
      },
    };

    const passContext = {
      url: url1,
      settings: {},
      passConfig: {
        gatherers: [],
      },
    };

    return GatherRunner.loadPage(driver, passContext).then(_ => {
      assert.equal(passContext.url, url2);
    });
  });

  it('loads a page and returns a pageLoadError', async () => {
    const url = 'https://example.com';
    const error = new LHError(LHError.errors.NO_FCP);
    const driver = {
      gotoURL() {
        return Promise.reject(error);
      },
    };

    const passContext = {
      url,
      settings: {},
      passConfig: {gatherers: []},
    };

    const {navigationError} = await GatherRunner.loadPage(driver, passContext);
    expect(navigationError).toEqual(error);
    expect(passContext.url).toEqual(url);
  });

  it('collects benchmark as an artifact', async () => {
    const requestedUrl = 'https://example.com';
    const driver = fakeDriver;
    const config = makeConfig({passes: []});
    const options = {requestedUrl, driver, settings: config.settings};

    const results = await GatherRunner.run(config.passes, options);
    expect(Number.isFinite(results.BenchmarkIndex)).toBeTruthy();
  });

  it('collects host user agent as an artifact', async () => {
    const requestedUrl = 'https://example.com';
    const driver = fakeDriver;
    const config = makeConfig({passes: []});
    const options = {requestedUrl, driver, settings: config.settings};

    const results = await GatherRunner.run(config.passes, options);
    expect(results.HostUserAgent).toEqual(fakeDriver.protocolGetVersionResponse.userAgent);
    expect(results.HostUserAgent).toMatch(/Chrome\/\d+/);
  });

  it('collects network user agent as an artifact', async () => {
    const requestedUrl = 'https://example.com';
    const driver = fakeDriver;
    const config = makeConfig({passes: [{}]});
    const options = {requestedUrl, driver, settings: config.settings};

    const results = await GatherRunner.run(config.passes, options);
    expect(results.NetworkUserAgent).toContain('Mozilla');
  });

  it('collects requested and final URLs as an artifact', () => {
    const requestedUrl = 'https://example.com';
    const finalUrl = 'https://example.com/interstitial';
    const driver = Object.assign({}, fakeDriver, {
      gotoURL() {
        return Promise.resolve({finalUrl, timedOut: false});
      },
    });
    const config = makeConfig({passes: [{}]});
    const options = {requestedUrl, driver, settings: config.settings};

    return GatherRunner.run(config.passes, options).then(artifacts => {
      assert.deepStrictEqual(artifacts.URL, {requestedUrl, finalUrl},
        'did not find expected URL artifact');
    });
  });

  describe('collects TestedAsMobileDevice as an artifact', () => {
    const requestedUrl = 'https://example.com';

    it('works when running on desktop device without emulation', async () => {
      const driver = fakeDriver;
      const config = makeConfig({
        passes: [],
        settings: {emulatedFormFactor: 'none', internalDisableDeviceScreenEmulation: false},
      });
      const options = {requestedUrl, driver, settings: config.settings};

      const results = await GatherRunner.run(config.passes, options);
      expect(results.TestedAsMobileDevice).toBe(false);
    });

    it('works when running on desktop device with mobile emulation', async () => {
      const driver = fakeDriver;
      const config = makeConfig({
        passes: [],
        settings: {emulatedFormFactor: 'mobile', internalDisableDeviceScreenEmulation: false},
      });
      const options = {requestedUrl, driver, settings: config.settings};

      const results = await GatherRunner.run(config.passes, options);
      expect(results.TestedAsMobileDevice).toBe(true);
    });

    it('works when running on mobile device without emulation', async () => {
      const driver = fakeDriverUsingRealMobileDevice;
      const config = makeConfig({
        passes: [],
        settings: {emulatedFormFactor: 'none', internalDisableDeviceScreenEmulation: false},
      });
      const options = {requestedUrl, driver, settings: config.settings};

      const results = await GatherRunner.run(config.passes, options);
      expect(results.TestedAsMobileDevice).toBe(true);
    });

    it('works when running on mobile device with desktop emulation', async () => {
      const driver = fakeDriverUsingRealMobileDevice;
      const config = makeConfig({
        passes: [],
        settings: {emulatedFormFactor: 'desktop', internalDisableDeviceScreenEmulation: false},
      });
      const options = {requestedUrl, driver, settings: config.settings};

      const results = await GatherRunner.run(config.passes, options);
      expect(results.TestedAsMobileDevice).toBe(false);
    });
  });

  describe('collects HostFormFactor as an artifact', () => {
    const requestedUrl = 'https://example.com';

    /**
     * @param {string} name
     * @param {string} userAgent
     * @param {string} expectedValue
     */
    function test(name, userAgent, expectedValue) {
      it(name, async () => {
        const driver = Object.assign({}, fakeDriver, {
          getBrowserVersion() {
            return Promise.resolve({userAgent: userAgent});
          },
        });
        const config = makeConfig({
          passes: [],
          settings: {},
        });
        const options = {requestedUrl, driver, settings: config.settings};

        const results = await GatherRunner.run(config.passes, options);
        expect(results.HostFormFactor).toBe(expectedValue);
      });
    }

    /* eslint-disable max-len */
    const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 7_1_2 like Mac OS X) AppleWebKit/537.51.2 (KHTML, like Gecko) OPiOS/10.2.0.93022 Mobile/11D257 Safari/9537.53';
    const ANDROID_UA = 'Mozilla/5.0 (Linux; U; Android 4.4.2; en-us; SCH-I535 Build/KOT49H) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30';
    const DESKTOP_UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.87 Safari/537.36';
    /* eslint-enable max-len */

    test('works when running on mobile device', IOS_UA, 'mobile');
    test('works when running on android device', ANDROID_UA, 'mobile');
    test('works when running on desktop device', DESKTOP_UA, 'desktop');
  });

  it('sets up the driver to begin emulation when all flags are undefined', async () => {
    await GatherRunner.setupDriver(driver, {
      settings: {
        emulatedFormFactor: 'mobile',
        throttlingMethod: 'provided',
        internalDisableDeviceScreenEmulation: false,
      },
    });

    connectionStub.sendCommand.findInvocation('Emulation.setDeviceMetricsOverride');
    expect(connectionStub.sendCommand.findInvocation('Network.emulateNetworkConditions')).toEqual({
      latency: 0, downloadThroughput: 0, uploadThroughput: 0, offline: false,
    });
    expect(() =>
      connectionStub.sendCommand.findInvocation('Emulation.setCPUThrottlingRate')).toThrow();
  });

  it('applies the correct emulation given a particular emulationFormFactor', async () => {
    /** @param {'mobile'|'desktop'|'none'} formFactor */
    const getSettings = formFactor => ({
      emulatedFormFactor: formFactor,
      internalDisableDeviceScreenEmulation: false,
    });

    await GatherRunner.setupDriver(driver, {settings: getSettings('mobile')});
    expect(connectionStub.sendCommand.findInvocation('Emulation.setDeviceMetricsOverride'))
      .toMatchObject({mobile: true});

    resetDefaultMockResponses();
    await GatherRunner.setupDriver(driver, {settings: getSettings('desktop')});
    expect(connectionStub.sendCommand.findInvocation('Emulation.setDeviceMetricsOverride'))
      .toMatchObject({mobile: false});

    resetDefaultMockResponses();
    await GatherRunner.setupDriver(driver, {settings: getSettings('none')});
    expect(() =>
      connectionStub.sendCommand.findInvocation('Emulation.setDeviceMetricsOverride')).toThrow();
  });

  it('sets throttling according to settings', async () => {
    await GatherRunner.setupDriver(driver, {
      settings: {
        emulatedFormFactor: 'mobile', internalDisableDeviceScreenEmulation: false,
        throttlingMethod: 'devtools',
        throttling: {
          requestLatencyMs: 100,
          downloadThroughputKbps: 8,
          uploadThroughputKbps: 8,
          cpuSlowdownMultiplier: 1,
        },
      },
    });

    connectionStub.sendCommand.findInvocation('Emulation.setDeviceMetricsOverride');
    expect(connectionStub.sendCommand.findInvocation('Network.emulateNetworkConditions')).toEqual({
      latency: 100, downloadThroughput: 1024, uploadThroughput: 1024, offline: false,
    });
    expect(connectionStub.sendCommand.findInvocation('Emulation.setCPUThrottlingRate')).toEqual({
      rate: 1,
    });
  });

  it('clears origin storage', () => {
    const asyncFunc = () => Promise.resolve();
    /** @type {Record<string, boolean>} */
    const tests = {
      calledCleanBrowserCaches: false,
      calledClearStorage: false,
    };
    /** @param {string} variable */
    const createCheck = variable => () => {
      tests[variable] = true;
      return Promise.resolve();
    };
    const driver = {
      assertNoSameOriginServiceWorkerClients: asyncFunc,
      beginEmulation: asyncFunc,
      setThrottling: asyncFunc,
      dismissJavaScriptDialogs: asyncFunc,
      enableRuntimeEvents: asyncFunc,
      enableAsyncStacks: asyncFunc,
      cacheNatives: asyncFunc,
      gotoURL: asyncFunc,
      registerPerformanceObserver: asyncFunc,
      cleanBrowserCaches: createCheck('calledCleanBrowserCaches'),
      clearDataForOrigin: createCheck('calledClearStorage'),
      blockUrlPatterns: asyncFunc,
      setExtraHTTPHeaders: asyncFunc,
    };

    return GatherRunner.setupDriver(driver, {settings: {}}).then(_ => {
      assert.equal(tests.calledCleanBrowserCaches, false);
      assert.equal(tests.calledClearStorage, true);
    });
  });

  it('clears the disk & memory cache on a perf run', async () => {
    const asyncFunc = () => Promise.resolve();
    /** @type {Record<string, boolean>} */
    const tests = {
      calledCleanBrowserCaches: false,
    };
    /** @param {string} variable */
    const createCheck = variable => () => {
      tests[variable] = true;
      return Promise.resolve();
    };
    const driver = {
      beginDevtoolsLog: asyncFunc,
      beginTrace: asyncFunc,
      gotoURL: async () => ({}),
      cleanBrowserCaches: createCheck('calledCleanBrowserCaches'),
      setThrottling: asyncFunc,
      blockUrlPatterns: asyncFunc,
      setExtraHTTPHeaders: asyncFunc,
      endTrace: asyncFunc,
      endDevtoolsLog: () => [],
      getBrowserVersion: async () => ({userAgent: ''}),
      getScrollPosition: async () => 1,
      scrollTo: async () => {},
    };
    const passConfig = {
      passName: 'default',
      loadFailureMode: LoadFailureMode.ignore,
      recordTrace: true,
      useThrottling: true,
      gatherers: [],
    };
    const settings = {
      disableStorageReset: false,
    };
    const requestedUrl = 'https://example.com';
    const passContext = {
      driver,
      passConfig,
      settings,
      baseArtifacts: await GatherRunner.initializeBaseArtifacts({driver, settings, requestedUrl}),
    };

    await GatherRunner.runPass(passContext);
    assert.equal(tests.calledCleanBrowserCaches, true);
  });

  it('returns a pageLoadError and no artifacts when there is a network error', async () => {
    const requestedUrl = 'https://example.com';
    // This page load error should be overriden by ERRORED_DOCUMENT_REQUEST (for being
    // more specific) since the main document network request failed with a 500.
    const navigationError = new LHError(LHError.errors.NO_FCP);
    const driver = Object.assign({}, fakeDriver, {
      online: true,
      /** @param {string} url */
      gotoURL: url => url.includes('blank') ? null : Promise.reject(navigationError),
      endDevtoolsLog() {
        return networkRecordsToDevtoolsLog([{url: requestedUrl, statusCode: 500}]);
      },
    });

    const config = makeConfig({
      passes: [{
        recordTrace: true,
        passName: 'firstPass',
        gatherers: [{instance: new TestGatherer()}],
      }],
    });
    const options = {
      driver,
      requestedUrl,
      settings: config.settings,
    };

    const artifacts = await GatherRunner.run(config.passes, options);
    expect(artifacts.LighthouseRunWarnings).toHaveLength(1);
    expect(artifacts.PageLoadError).toBeInstanceOf(Error);
    expect(artifacts.PageLoadError).toMatchObject({code: 'ERRORED_DOCUMENT_REQUEST'});
    // @ts-ignore: Test-only gatherer.
    expect(artifacts.TestGatherer).toBeUndefined();
  });

  it('returns a pageLoadError and no artifacts when there is a navigation error', async () => {
    const requestedUrl = 'https://example.com';
    // This time, NO_FCP should win because it's the only error left.
    const navigationError = new LHError(LHError.errors.NO_FCP);
    const driver = Object.assign({}, fakeDriver, {
      online: true,
      /** @param {string} url */
      gotoURL: url => url.includes('blank') ? null : Promise.reject(navigationError),
      endDevtoolsLog() {
        return networkRecordsToDevtoolsLog([{url: requestedUrl}]);
      },
    });

    const config = makeConfig({
      passes: [{
        recordTrace: true,
        passName: 'firstPass',
        gatherers: [{instance: new TestGatherer()}],
      }],
    });
    const options = {
      driver,
      requestedUrl,
      settings: config.settings,
    };

    const artifacts = await GatherRunner.run(config.passes, options);
    expect(artifacts.LighthouseRunWarnings).toHaveLength(1);
    expect(artifacts.PageLoadError).toBeInstanceOf(Error);
    expect(artifacts.PageLoadError).toMatchObject({code: 'NO_FCP'});
    // @ts-ignore: Test-only gatherer.
    expect(artifacts.TestGatherer).toBeUndefined();
  });

  it('succeeds when there is a navigation error but loadFailureMode was warn', async () => {
    const requestedUrl = 'https://example.com';
    // NO_FCP should be ignored because it's a warn pass.
    const navigationError = new LHError(LHError.errors.NO_FCP);

    const gotoUrlForAboutBlank = jest.fn().mockResolvedValue({});
    const gotoUrlForRealUrl = jest.fn()
      .mockResolvedValueOnce({finalUrl: requestedUrl, timedOut: false})
      .mockRejectedValueOnce(navigationError);
    const driver = Object.assign({}, fakeDriver, {
      online: true,
      /** @param {string} url */
      gotoURL: url => url.includes('blank') ? gotoUrlForAboutBlank() : gotoUrlForRealUrl(),
      endDevtoolsLog() {
        return networkRecordsToDevtoolsLog([{url: requestedUrl}]);
      },
    });

    const config = makeConfig({
      passes: [{passName: 'defaultPass', recordTrace: true}, {
        loadFailureMode: 'warn',
        recordTrace: true,
        passName: 'nextPass',
        gatherers: [{instance: new TestGatherer()}],
      }],
    });
    const options = {
      driver,
      requestedUrl,
      settings: config.settings,
    };

    const artifacts = await GatherRunner.run(config.passes, options);
    expect(artifacts.LighthouseRunWarnings).toHaveLength(1);
    expect(artifacts.PageLoadError).toEqual(null);
    // @ts-ignore: Test-only gatherer.
    expect(artifacts.TestGatherer).toBeUndefined();
    expect(artifacts.devtoolsLogs).toHaveProperty('pageLoadError-nextPass');
  });

  it('does not clear origin storage with flag --disable-storage-reset', () => {
    const asyncFunc = () => Promise.resolve();
    /** @type {Record<string, boolean>} */
    const tests = {
      calledCleanBrowserCaches: false,
      calledClearStorage: false,
    };
    /** @param {string} variable */
    const createCheck = variable => () => {
      tests[variable] = true;
      return Promise.resolve();
    };
    const driver = {
      assertNoSameOriginServiceWorkerClients: asyncFunc,
      beginEmulation: asyncFunc,
      setThrottling: asyncFunc,
      dismissJavaScriptDialogs: asyncFunc,
      enableRuntimeEvents: asyncFunc,
      enableAsyncStacks: asyncFunc,
      cacheNatives: asyncFunc,
      gotoURL: asyncFunc,
      registerPerformanceObserver: asyncFunc,
      cleanBrowserCaches: createCheck('calledCleanBrowserCaches'),
      clearDataForOrigin: createCheck('calledClearStorage'),
      blockUrlPatterns: asyncFunc,
      setExtraHTTPHeaders: asyncFunc,
    };

    return GatherRunner.setupDriver(driver, {
      settings: {disableStorageReset: true},
    }).then(_ => {
      assert.equal(tests.calledCleanBrowserCaches, false);
      assert.equal(tests.calledClearStorage, false);
    });
  });

  it('tells the driver to block given URL patterns when blockedUrlPatterns is given', async () => {
    await GatherRunner.setupPassNetwork({
      driver,
      settings: {
        blockedUrlPatterns: ['http://*.evil.com', '.jpg', '.woff2'],
      },
      passConfig: {
        blockedUrlPatterns: ['*.jpeg'],
        gatherers: [],
      },
    });

    const blockedUrlsResult = connectionStub.sendCommand.findInvocation('Network.setBlockedURLs');
    blockedUrlsResult.urls.sort();
    expect(blockedUrlsResult)
      .toEqual({urls: ['*.jpeg', '.jpg', '.woff2', 'http://*.evil.com']});
  });

  it('does not throw when blockedUrlPatterns is not given', async () => {
    await GatherRunner.setupPassNetwork({
      driver,
      settings: {},
      passConfig: {gatherers: []},
    });

    expect(connectionStub.sendCommand.findInvocation('Network.setBlockedURLs'))
      .toEqual({urls: []});
  });

  it('tells the driver to set additional http when extraHeaders flag is given', async () => {
    const extraHeaders = {
      'Cookie': 'monster',
      'x-men': 'wolverine',
    };

    await GatherRunner.setupPassNetwork({
      driver,
      settings: {
        extraHeaders,
      },
      passConfig: {gatherers: []},
    });

    expect(connectionStub.sendCommand.findInvocation('Network.setExtraHTTPHeaders'))
      .toEqual({headers: extraHeaders});
  });

  it('tells the driver to begin tracing', async () => {
    let calledTrace = false;
    const driver = {
      beginTrace() {
        calledTrace = true;
        return Promise.resolve();
      },
      beginDevtoolsLog() {
        return Promise.resolve();
      },
    };

    const passConfig = {
      recordTrace: true,
      gatherers: [
        {instance: new TestGatherer()},
      ],
    };
    const settings = {};

    await GatherRunner.beginRecording({driver, passConfig, settings});
    assert.equal(calledTrace, true);
  });

  it('tells the driver to end tracing', () => {
    const url = 'https://example.com';
    let calledTrace = false;
    const fakeTraceData = {traceEvents: ['reallyBelievableTraceEvents']};

    const driver = Object.assign({}, fakeDriver, {
      endTrace() {
        calledTrace = true;
        return Promise.resolve(fakeTraceData);
      },
    });

    const passConfig = {
      recordTrace: true,
      gatherers: [
        {instance: new TestGatherer()},
      ],
    };

    return GatherRunner.endRecording({url, driver, passConfig}).then(passData => {
      assert.equal(calledTrace, true);
      assert.equal(passData.trace, fakeTraceData);
    });
  });

  it('tells the driver to begin devtoolsLog collection', async () => {
    let calledDevtoolsLogCollect = false;
    const driver = {
      beginDevtoolsLog() {
        calledDevtoolsLogCollect = true;
        return Promise.resolve();
      },
      gotoURL() {
        return Promise.resolve({finalUrl: '', timedOut: false});
      },
    };

    const passConfig = {
      gatherers: [
        {instance: new TestGatherer()},
      ],
    };
    const settings = {};

    await GatherRunner.beginRecording({driver, passConfig, settings});
    assert.equal(calledDevtoolsLogCollect, true);
  });

  it('tells the driver to end devtoolsLog collection', () => {
    const url = 'https://example.com';
    let calledDevtoolsLogCollect = false;

    const fakeDevtoolsMessage = {method: 'Network.FakeThing', params: {}};
    const driver = Object.assign({}, fakeDriver, {
      endDevtoolsLog() {
        calledDevtoolsLogCollect = true;
        return [
          fakeDevtoolsMessage,
        ];
      },
    });

    const passConfig = {
      gatherers: [
        {instance: new TestGatherer()},
      ],
    };

    return GatherRunner.endRecording({url, driver, passConfig}).then(passData => {
      assert.equal(calledDevtoolsLogCollect, true);
      assert.strictEqual(passData.devtoolsLog[0], fakeDevtoolsMessage);
    });
  });

  it('resets scroll position between every gatherer', async () => {
    class ScrollMcScrollyGatherer extends TestGatherer {
      /** @param {{driver: Driver}} context */
      afterPass(context) {
        context.driver.scrollTo({x: 1000, y: 1000});
      }
    }

    const url = 'https://example.com';
    const driver = Object.assign({}, fakeDriver);
    const scrollToSpy = jest.spyOn(driver, 'scrollTo');

    const passConfig = {
      recordTrace: true,
      gatherers: [
        {instance: new ScrollMcScrollyGatherer()},
        {instance: new TestGatherer()},
      ],
    };

    /** @type {any} Using Test-only gatherer. */
    const gathererResults = {
      TestGatherer: [],
    };
    await GatherRunner.afterPass({url, driver, passConfig}, {}, gathererResults);
    // One time for the afterPass of ScrollMcScrolly, two times for the resets of the two gatherers.
    expect(scrollToSpy.mock.calls).toEqual([
      [{x: 1000, y: 1000}],
      [{x: 0, y: 0}],
      [{x: 0, y: 0}],
    ]);
  });

  it('does as many passes as are required', () => {
    const t1 = new TestGatherer();
    const t2 = new TestGatherer();

    const config = makeConfig({
      passes: [{
        recordTrace: true,
        passName: 'firstPass',
        gatherers: [
          {instance: t1},
        ],
      }, {
        passName: 'secondPass',
        gatherers: [
          {instance: t2},
        ],
      }],
    });

    return GatherRunner.run(config.passes, {
      driver: fakeDriver,
      requestedUrl: 'https://example.com',
      settings: config.settings,
    }).then(_ => {
      assert.ok(t1.called);
      assert.ok(t2.called);
    });
  });

  it('respects trace names', () => {
    const config = makeConfig({
      passes: [{
        recordTrace: true,
        passName: 'firstPass',
        gatherers: [{instance: new TestGatherer()}],
      }, {
        recordTrace: true,
        passName: 'secondPass',
        gatherers: [{instance: new TestGatherer()}],
      }],
    });
    const options = {
      driver: fakeDriver,
      requestedUrl: 'https://example.com',
      settings: config.settings,
    };

    return GatherRunner.run(config.passes, options)
      .then(artifacts => {
        assert.ok(artifacts.traces.firstPass);
        assert.ok(artifacts.devtoolsLogs.firstPass);
        assert.ok(artifacts.traces.secondPass);
        assert.ok(artifacts.devtoolsLogs.secondPass);
      });
  });

  it('saves trace and devtoolsLog with error prefix when there was a runtime error', async () => {
    const requestedUrl = 'https://example.com';
    const driver = Object.assign({}, fakeDriver, {
      /** @param {string} _ Resolved URL here does not match any request in the network records, causing a runtime error. */
      gotoURL: async _ => requestedUrl,
      online: true,
      endDevtoolsLog: () => [],
    });

    const config = makeConfig({
      passes: [{
        passName: 'firstPass',
        recordTrace: true,
        gatherers: [{instance: new TestGatherer()}],
      }],
    });
    const options = {driver, requestedUrl, settings: config.settings};
    const artifacts = await GatherRunner.run(config.passes, options);

    expect(artifacts.PageLoadError).toMatchObject({code: 'NO_DOCUMENT_REQUEST'});
    // @ts-ignore: Test-only gatherer.
    expect(artifacts.TestGatherer).toBeUndefined();

    // The only loadData available should be prefixed with `pageLoadError-`.
    expect(Object.keys(artifacts.traces)).toEqual(['pageLoadError-firstPass']);
    expect(Object.keys(artifacts.devtoolsLogs)).toEqual(['pageLoadError-firstPass']);
  });

  it('does not run additional passes after a runtime error', async () => {
    const t1 = new (class Test1 extends TestGatherer {})();
    const t2 = new (class Test2 extends TestGatherer {})();
    const t3 = new (class Test3 extends TestGatherer {})();
    const config = makeConfig({
      passes: [{
        passName: 'firstPass',
        recordTrace: true,
        gatherers: [{instance: t1}],
      }, {
        passName: 'secondPass',
        recordTrace: true,
        gatherers: [{instance: t2}],
      }, {
        passName: 'thirdPass',
        recordTrace: true,
        gatherers: [{instance: t3}],
      }],
    });

    const requestedUrl = 'https://www.reddit.com/r/nba';
    let firstLoad = true;
    const driver = Object.assign({}, fakeDriver, {
      /** @param {string} url Loads the page successfully in the first pass, fails with NO_FCP in the second. */
      async gotoURL(url) {
        if (url.includes('blank')) return null;
        if (firstLoad) {
          firstLoad = false;
          return {finalUrl: requestedUrl, timedOut: false};
        } else {
          throw new LHError(LHError.errors.NO_FCP);
        }
      },
      online: true,
    });
    const options = {driver, requestedUrl, settings: config.settings};
    const artifacts = await GatherRunner.run(config.passes, options);

    // t1.pass() and t2.pass() called; t3.pass(), after the error, was not.
    expect(t1.called).toBe(true);
    expect(t2.called).toBe(true);
    expect(t3.called).toBe(false);

    // But only t1 has a valid artifact; t2 and t3 aren't defined.
    // @ts-ignore: Test-only gatherer.
    expect(artifacts.Test1).toBe('MyArtifact');
    // @ts-ignore: Test-only gatherer.
    expect(artifacts.Test2).toBeUndefined();
    // @ts-ignore: Test-only gatherer.
    expect(artifacts.Test3).toBeUndefined();

    // PageLoadError artifact has the error.
    expect(artifacts.PageLoadError).toBeInstanceOf(LHError);
    expect(artifacts.PageLoadError).toMatchObject({code: 'NO_FCP'});

    // firstPass has a saved trace and devtoolsLog, secondPass has an error trace and log.
    expect(Object.keys(artifacts.traces)).toEqual(['firstPass', 'pageLoadError-secondPass']);
    expect(Object.keys(artifacts.devtoolsLogs)).toEqual(['firstPass', 'pageLoadError-secondPass']);
  });

  describe('#getNetworkError', () => {
    /**
     * @param {NetworkRequest=} mainRecord
     */
    function getAndExpectError(mainRecord) {
      const error = GatherRunner.getNetworkError(mainRecord);
      if (!error) throw new Error('expected a network error');
      return error;
    }

    it('passes when the page is loaded', () => {
      const url = 'http://the-page.com';
      const mainRecord = new NetworkRequest();
      mainRecord.url = url;
      assert.ok(!GatherRunner.getNetworkError(mainRecord));
    });

    it('fails when page fails to load', () => {
      const url = 'http://the-page.com';
      const mainRecord = new NetworkRequest();
      mainRecord.url = url;
      mainRecord.failed = true;
      mainRecord.localizedFailDescription = 'foobar';
      const error = getAndExpectError(mainRecord);
      assert.equal(error.message, 'FAILED_DOCUMENT_REQUEST');
      assert.equal(error.code, 'FAILED_DOCUMENT_REQUEST');
      expect(error.friendlyMessage)
        .toBeDisplayString(/^Lighthouse was unable to reliably load.*foobar/);
    });

    it('fails when page times out', () => {
      const error = getAndExpectError(undefined);
      assert.equal(error.message, 'NO_DOCUMENT_REQUEST');
      assert.equal(error.code, 'NO_DOCUMENT_REQUEST');
      expect(error.friendlyMessage).toBeDisplayString(/^Lighthouse was unable to reliably load/);
    });

    it('fails when page returns with a 404', () => {
      const url = 'http://the-page.com';
      const mainRecord = new NetworkRequest();
      mainRecord.url = url;
      mainRecord.statusCode = 404;
      const error = getAndExpectError(mainRecord);
      assert.equal(error.message, 'ERRORED_DOCUMENT_REQUEST');
      assert.equal(error.code, 'ERRORED_DOCUMENT_REQUEST');
      expect(error.friendlyMessage)
        .toBeDisplayString(/^Lighthouse was unable to reliably load.*404/);
    });

    it('fails when page returns with a 500', () => {
      const url = 'http://the-page.com';
      const mainRecord = new NetworkRequest();
      mainRecord.url = url;
      mainRecord.statusCode = 500;
      const error = getAndExpectError(mainRecord);
      assert.equal(error.message, 'ERRORED_DOCUMENT_REQUEST');
      assert.equal(error.code, 'ERRORED_DOCUMENT_REQUEST');
      expect(error.friendlyMessage)
        .toBeDisplayString(/^Lighthouse was unable to reliably load.*500/);
    });

    it('fails when page domain doesn\'t resolve', () => {
      const url = 'http://the-page.com';
      const mainRecord = new NetworkRequest();
      mainRecord.url = url;
      mainRecord.failed = true;
      mainRecord.localizedFailDescription = 'net::ERR_NAME_NOT_RESOLVED';
      const error = getAndExpectError(mainRecord);
      assert.equal(error.message, 'DNS_FAILURE');
      assert.equal(error.code, 'DNS_FAILURE');
      expect(error.friendlyMessage).toBeDisplayString(/^DNS servers could not resolve/);
    });
  });

  describe('#getInterstitialError', () => {
    /**
     * @param {NetworkRequest} mainRecord
     * @param {NetworkRequest[]} networkRecords
     */
    function getAndExpectError(mainRecord, networkRecords) {
      const error = GatherRunner.getInterstitialError(mainRecord, networkRecords);
      if (!error) throw new Error('expected an interstitial error');
      return error;
    }

    it('passes when the page was not requested', () => {
      expect(GatherRunner.getInterstitialError(undefined, [])).toBeUndefined();
    });

    it('passes when the page is loaded', () => {
      const url = 'http://the-page.com';
      const mainRecord = new NetworkRequest();
      mainRecord.url = url;
      expect(GatherRunner.getInterstitialError(mainRecord, [mainRecord])).toBeUndefined();
    });

    it('passes when page fails to load normally', () => {
      const url = 'http://the-page.com';
      const mainRecord = new NetworkRequest();
      mainRecord.url = url;
      mainRecord.failed = true;
      mainRecord.localizedFailDescription = 'foobar';
      expect(GatherRunner.getInterstitialError(mainRecord, [mainRecord])).toBeUndefined();
    });

    it('passes when page gets a generic interstitial but somehow also loads everything', () => {
      // This case, AFAIK, is impossible, but we'll err on the side of not tanking the run.
      const url = 'http://the-page.com';
      const mainRecord = new NetworkRequest();
      mainRecord.url = url;
      const interstitialRecord = new NetworkRequest();
      interstitialRecord.url = 'data:text/html;base64,abcdef';
      interstitialRecord.documentURL = 'chrome-error://chromewebdata/';
      const records = [mainRecord, interstitialRecord];
      expect(GatherRunner.getInterstitialError(mainRecord, records)).toBeUndefined();
    });

    it('fails when page gets a generic interstitial', () => {
      const url = 'http://the-page.com';
      const mainRecord = new NetworkRequest();
      mainRecord.url = url;
      mainRecord.failed = true;
      mainRecord.localizedFailDescription = 'ERR_CONNECTION_RESET';
      const interstitialRecord = new NetworkRequest();
      interstitialRecord.url = 'data:text/html;base64,abcdef';
      interstitialRecord.documentURL = 'chrome-error://chromewebdata/';
      const records = [mainRecord, interstitialRecord];
      const error = getAndExpectError(mainRecord, records);
      expect(error.message).toEqual('CHROME_INTERSTITIAL_ERROR');
      expect(error.code).toEqual('CHROME_INTERSTITIAL_ERROR');
      expect(error.friendlyMessage).toBeDisplayString(/^Chrome prevented/);
    });

    it('fails when page gets a security interstitial', () => {
      const url = 'http://the-page.com';
      const mainRecord = new NetworkRequest();
      mainRecord.url = url;
      mainRecord.failed = true;
      mainRecord.localizedFailDescription = 'net::ERR_CERT_COMMON_NAME_INVALID';
      const interstitialRecord = new NetworkRequest();
      interstitialRecord.url = 'data:text/html;base64,abcdef';
      interstitialRecord.documentURL = 'chrome-error://chromewebdata/';
      const records = [mainRecord, interstitialRecord];
      const error = getAndExpectError(mainRecord, records);
      expect(error.message).toEqual('INSECURE_DOCUMENT_REQUEST');
      expect(error.code).toEqual('INSECURE_DOCUMENT_REQUEST');
      expect(error.friendlyMessage).toBeDisplayString(/valid security certificate/);
      expect(error.friendlyMessage).toBeDisplayString(/net::ERR_CERT_COMMON_NAME_INVALID/);
    });

    it('passes when page iframe gets a generic interstitial', () => {
      const url = 'http://the-page.com';
      const mainRecord = new NetworkRequest();
      mainRecord.url = url;
      mainRecord.failed = false;
      const iframeRecord = new NetworkRequest();
      iframeRecord.failed = true;
      iframeRecord.url = 'https://the-ad.com';
      iframeRecord.documentURL = 'https://the-ad.com';
      const interstitialRecord = new NetworkRequest();
      interstitialRecord.url = 'data:text/html;base64,abcdef';
      interstitialRecord.documentURL = 'chrome-error://chromewebdata/';
      const records = [mainRecord, iframeRecord, interstitialRecord];
      const error = GatherRunner.getInterstitialError(mainRecord, records);
      expect(error).toBeUndefined();
    });
  });

  describe('#getPageLoadError', () => {
    /**
     * @param {RecursivePartial<LH.Gatherer.PassContext>} passContext
     * @param {RecursivePartial<LH.Gatherer.LoadData>} loadData
     * @param {LH.LighthouseError|undefined} navigationError
     */
    function getAndExpectError(passContext, loadData, navigationError) {
      const error = GatherRunner.getPageLoadError(passContext, loadData, navigationError);
      if (!error) throw new Error('expected a page load error');
      return error;
    }

    /** @type {LH.LighthouseError} */
    let navigationError;

    beforeEach(() => {
      navigationError = /** @type {LH.LighthouseError} */ (new Error('NAVIGATION_ERROR'));
    });

    it('passes when the page is loaded', () => {
      const passContext = {
        url: 'http://the-page.com',
        passConfig: {loadFailureMode: LoadFailureMode.fatal},
      };
      const mainRecord = new NetworkRequest();
      const loadData = {networkRecords: [mainRecord]};
      mainRecord.url = passContext.url;
      const error = GatherRunner.getPageLoadError(passContext, loadData, undefined);
      expect(error).toBeUndefined();
    });

    it('passes when the page is loaded, ignoring any fragment', () => {
      const passContext = {
        url: 'http://example.com/#/page/list',
        passConfig: {loadFailureMode: LoadFailureMode.fatal},
      };
      const mainRecord = new NetworkRequest();
      const loadData = {networkRecords: [mainRecord]};
      mainRecord.url = 'http://example.com';
      const error = GatherRunner.getPageLoadError(passContext, loadData, undefined);
      expect(error).toBeUndefined();
    });

    it('passes when the page is expected to fail', () => {
      const passContext = {
        url: 'http://the-page.com',
        passConfig: {loadFailureMode: LoadFailureMode.ignore},
      };
      const mainRecord = new NetworkRequest();
      const loadData = {networkRecords: [mainRecord]};
      mainRecord.url = passContext.url;
      mainRecord.failed = true;

      const error = GatherRunner.getPageLoadError(passContext, loadData, undefined);
      expect(error).toBeUndefined();
    });

    it('fails with interstitial error first', () => {
      const passContext = {
        url: 'http://the-page.com',
        passConfig: {loadFailureMode: LoadFailureMode.fatal},
      };
      const mainRecord = new NetworkRequest();
      const interstitialRecord = new NetworkRequest();
      const loadData = {networkRecords: [mainRecord, interstitialRecord]};

      mainRecord.url = passContext.url;
      mainRecord.failed = true;
      interstitialRecord.url = 'data:text/html;base64,abcdef';
      interstitialRecord.documentURL = 'chrome-error://chromewebdata/';

      const error = getAndExpectError(passContext, loadData, navigationError);
      expect(error.message).toEqual('CHROME_INTERSTITIAL_ERROR');
    });

    it('fails with network error next', () => {
      const passContext = {
        url: 'http://the-page.com',
        passConfig: {loadFailureMode: LoadFailureMode.fatal},
      };
      const mainRecord = new NetworkRequest();
      const loadData = {networkRecords: [mainRecord]};

      mainRecord.url = passContext.url;
      mainRecord.failed = true;

      const error = getAndExpectError(passContext, loadData, navigationError);
      expect(error.message).toEqual('FAILED_DOCUMENT_REQUEST');
    });

    it('fails with nav error last', () => {
      const passContext = {
        url: 'http://the-page.com',
        passConfig: {loadFailureMode: LoadFailureMode.fatal},
      };
      const mainRecord = new NetworkRequest();
      const loadData = {networkRecords: [mainRecord]};

      mainRecord.url = passContext.url;

      const error = getAndExpectError(passContext, loadData, navigationError);
      expect(error.message).toEqual('NAVIGATION_ERROR');
    });

    it('fails when loadFailureMode is warn', () => {
      const passContext = {
        url: 'http://the-page.com',
        passConfig: {loadFailureMode: LoadFailureMode.warn},
      };
      const mainRecord = new NetworkRequest();
      const loadData = {networkRecords: [mainRecord]};

      mainRecord.url = passContext.url;

      const error = getAndExpectError(passContext, loadData, navigationError);
      expect(error.message).toEqual('NAVIGATION_ERROR');
    });
  });

  describe('artifact collection', () => {
    // Make sure our gatherers never execute in parallel
    it('runs gatherer lifecycle methods strictly in sequence', async () => {
      /** @type {Record<string, number>} */
      const counter = {
        beforePass: 0,
        pass: 0,
        afterPass: 0,
      };
      const shortPause = () => new Promise(resolve => setTimeout(resolve, 50));
      /**
       * @param {string} counterName
       * @param {number} value
       */
      async function fastish(counterName, value) {
        assert.strictEqual(counter[counterName], value - 1);
        counter[counterName] = value;
        await shortPause();
        assert.strictEqual(counter[counterName], value);
      }
      /**
       * @param {string} counterName
       * @param {number} value
       */
      async function medium(counterName, value) {
        await Promise.resolve();
        await Promise.resolve();
        await fastish(counterName, value);
      }
      /**
       * @param {string} counterName
       * @param {number} value
       */
      async function slowwwww(counterName, value) {
        await shortPause();
        await shortPause();
        await medium(counterName, value);
      }

      const gatherers = [
        class First extends Gatherer {
          async beforePass() {
            await slowwwww('beforePass', 1);
          }
          async pass() {
            await slowwwww('pass', 1);
          }
          async afterPass() {
            await slowwwww('afterPass', 1);
            return this.name;
          }
        },
        class Second extends Gatherer {
          async beforePass() {
            await medium('beforePass', 2);
          }
          async pass() {
            await medium('pass', 2);
          }
          async afterPass() {
            await medium('afterPass', 2);
            return this.name;
          }
        },
        class Third extends Gatherer {
          beforePass() {
            return fastish('beforePass', 3);
          }
          pass() {
            return fastish('pass', 3);
          }
          async afterPass() {
            await fastish('afterPass', 3);
            return this.name;
          }
        },
      ];
      const config = makeConfig({
        passes: [{
          gatherers: gatherers.map(G => ({instance: new G()})),
        }],
      });

      /** @type {any} Using Test-only gatherers. */
      const artifacts = await GatherRunner.run(config.passes, {
        driver: fakeDriver,
        requestedUrl: 'https://example.com',
        settings: config.settings,
      });

      // Ensure artifacts returned and not errors.
      gatherers.forEach(gatherer => {
        assert.strictEqual(artifacts[gatherer.name], gatherer.name);
      });
    });

    it('supports sync and async return of artifacts from gatherers', () => {
      const gatherers = [
        // sync
        new class BeforeSync extends Gatherer {
          beforePass() {
            return this.name;
          }
        }(),
        new class PassSync extends Gatherer {
          pass() {
            return this.name;
          }
        }(),
        new class AfterSync extends Gatherer {
          afterPass() {
            return this.name;
          }
        }(),

        // async
        new class BeforePromise extends Gatherer {
          beforePass() {
            return Promise.resolve(this.name);
          }
        }(),
        new class PassPromise extends Gatherer {
          pass() {
            return Promise.resolve(this.name);
          }
        }(),
        new class AfterPromise extends Gatherer {
          afterPass() {
            return Promise.resolve(this.name);
          }
        }(),
      ].map(instance => ({instance}));
      const gathererNames = gatherers.map(gatherer => gatherer.instance.name);
      const config = makeConfig({
        passes: [{
          gatherers,
        }],
      });

      return GatherRunner.run(config.passes, {
        driver: fakeDriver,
        requestedUrl: 'https://example.com',
        settings: config.settings,
      }).then(artifacts => {
        gathererNames.forEach(gathererName => {
          assert.strictEqual(artifacts[gathererName], gathererName);
        });
      });
    });

    it('passes gatherer options', async () => {
      /** @type {Record<string, any[]>} */
      const calls = {beforePass: [], pass: [], afterPass: []};
      /** @param {string} name */
      const makeEavesdropGatherer = name => {
        const C = class extends Gatherer {};
        Object.defineProperty(C, 'name', {value: name});
        return Object.assign(new C, {
          /** @param {LH.Gatherer.PassContext} context */
          beforePass(context) {
            calls.beforePass.push(context.options);
          },
          /** @param {LH.Gatherer.PassContext} context */
          pass(context) {
            calls.pass.push(context.options);
          },
          /** @param {LH.Gatherer.PassContext} context */
          afterPass(context) {
            calls.afterPass.push(context.options);
            // @ts-ignore
            return context.options.x || 'none';
          },
        });
      };

      const gatherers = [
        {instance: makeEavesdropGatherer('EavesdropGatherer1'), options: {x: 1}},
        {instance: makeEavesdropGatherer('EavesdropGatherer2'), options: {x: 2}},
        {instance: makeEavesdropGatherer('EavesdropGatherer3')},
      ];

      const config = makeConfig({
        passes: [{gatherers}],
      });

      /** @type {any} Using Test-only gatherers. */
      const artifacts = await GatherRunner.run(config.passes, {
        driver: fakeDriver,
        requestedUrl: 'https://example.com',
        settings: config.settings,
      });

      assert.equal(artifacts.EavesdropGatherer1, 1);
      assert.equal(artifacts.EavesdropGatherer2, 2);
      assert.equal(artifacts.EavesdropGatherer3, 'none');

      // assert that all three phases received the gatherer options expected
      const expectedOptions = [{x: 1}, {x: 2}, {}];
      for (let i = 0; i < 3; i++) {
        assert.deepEqual(calls.beforePass[i], expectedOptions[i]);
        assert.deepEqual(calls.pass[i], expectedOptions[i]);
        assert.deepEqual(calls.afterPass[i], expectedOptions[i]);
      }
    });

    it('uses the last not-undefined phase result as artifact', async () => {
      const recoverableError = new Error('My recoverable error');
      const someOtherError = new Error('Bad, bad error.');

      // Gatherer results are all expected to be arrays of promises
      /** @type {any} Using Test-only gatherers. */
      const gathererResults = {
        // 97 wins.
        AfterGatherer: [
          Promise.resolve(65),
          Promise.resolve(72),
          Promise.resolve(97),
        ],

        // 284 wins.
        PassGatherer: [
          Promise.resolve(220),
          Promise.resolve(284),
          Promise.resolve(undefined),
        ],

        // Error wins.
        SingleErrorGatherer: [
          Promise.reject(recoverableError),
          Promise.resolve(1184),
          Promise.resolve(1210),
        ],

        // First error wins.
        TwoErrorGatherer: [
          Promise.reject(recoverableError),
          Promise.reject(someOtherError),
          Promise.resolve(1729),
        ],
      };

      /** @type {any} Using Test-only gatherers. */
      const {artifacts} = await GatherRunner.collectArtifacts(gathererResults);
      assert.strictEqual(artifacts.AfterGatherer, 97);
      assert.strictEqual(artifacts.PassGatherer, 284);
      assert.strictEqual(artifacts.SingleErrorGatherer, recoverableError);
      assert.strictEqual(artifacts.TwoErrorGatherer, recoverableError);
    });

    it('produces a deduped LighthouseRunWarnings artifact from array of warnings', async () => {
      const runWarnings = [
        'warning0',
        'warning1',
        'warning2',
      ];

      class WarningGatherer extends Gatherer {
        /** @param {LH.Gatherer.PassContext} passContext */
        afterPass(passContext) {
          passContext.LighthouseRunWarnings.push(...runWarnings, ...runWarnings);
          assert.strictEqual(passContext.LighthouseRunWarnings.length, runWarnings.length * 2);

          return '';
        }
      }

      const config = makeConfig({
        passes: [{
          gatherers: [{instance: new WarningGatherer()}],
        }],
      });
      const artifacts = await GatherRunner.run(config.passes, {
        driver: fakeDriver,
        requestedUrl: 'https://example.com',
        settings: config.settings,
      });
      assert.deepStrictEqual(artifacts.LighthouseRunWarnings, runWarnings);
    });

    it('supports sync and async throwing of errors from gatherers', () => {
      const gatherers = [
        // sync
        new class BeforeSync extends Gatherer {
          beforePass() {
            throw new Error(this.name);
          }
        }(),
        new class PassSync extends Gatherer {
          pass() {
            throw new Error(this.name);
          }
        }(),
        new class AfterSync extends Gatherer {
          afterPass() {
            throw new Error(this.name);
          }
        }(),

        // async
        new class BeforePromise extends Gatherer {
          beforePass() {
            const err = new Error(this.name);
            return Promise.reject(err);
          }
        }(),
        new class PassPromise extends Gatherer {
          pass() {
            const err = new Error(this.name);
            return Promise.reject(err);
          }
        }(),
        new class AfterPromise extends Gatherer {
          afterPass() {
            const err = new Error(this.name);
            return Promise.reject(err);
          }
        }(),
      ].map(instance => ({instance}));
      const gathererNames = gatherers.map(gatherer => gatherer.instance.name);
      const config = makeConfig({
        passes: [{
          gatherers,
        }],
      });

      return GatherRunner.run(config.passes, {
        driver: fakeDriver,
        requestedUrl: 'https://example.com',
        settings: config.settings,
      }).then(artifacts => {
        gathererNames.forEach(gathererName => {
          const errorArtifact = artifacts[gathererName];
          assert.ok(errorArtifact instanceof Error);
          expect(errorArtifact).toMatchObject({message: gathererName});
        });
      });
    });

    it('rejects if a gatherer does not provide an artifact', () => {
      const config = makeConfig({
        passes: [{
          recordTrace: true,
          passName: 'firstPass',
          gatherers: [
            {instance: new TestGathererNoArtifact()},
          ],
        }],
      });

      return GatherRunner.run(config.passes, {
        driver: fakeDriver,
        requestedUrl: 'https://example.com',
        settings: config.settings,
      }).then(_ => assert.ok(false), _ => assert.ok(true));
    });

    it('rejects when domain name can\'t be resolved', () => {
      const config = makeConfig({
        passes: [{
          recordTrace: true,
          passName: 'firstPass',
          gatherers: [],
        }],
      });

      // Arrange for driver to return unresolved request.
      const requestedUrl = 'http://www.some-non-existing-domain.com/';
      const unresolvedDriver = Object.assign({}, fakeDriver, {
        online: true,
        gotoURL() {
          return Promise.resolve({finalUrl: requestedUrl, timedOut: false});
        },
        endDevtoolsLog() {
          return unresolvedPerfLog;
        },
      });

      return GatherRunner.run(config.passes, {
        driver: unresolvedDriver,
        requestedUrl,
        settings: config.settings,
      }).then(artifacts => {
        assert.equal(artifacts.LighthouseRunWarnings.length, 1);
        expect(artifacts.LighthouseRunWarnings[0])
          .toBeDisplayString(/DNS servers could not resolve/);
      });
    });

    it('resolves but warns when page times out', () => {
      const config = makeConfig({
        passes: [{
          recordTrace: true,
          passName: 'firstPass',
          gatherers: [],
        }],
      });

      const requestedUrl = 'http://www.slow-loading-page.com/';
      const timedoutDriver = Object.assign({}, fakeDriver, {
        online: true,
        gotoURL() {
          return Promise.resolve({finalUrl: requestedUrl, timedOut: true});
        },
      });

      return GatherRunner.run(config.passes, {
        driver: timedoutDriver,
        requestedUrl,
        settings: config.settings,
      }).then(artifacts => {
        assert.equal(artifacts.LighthouseRunWarnings.length, 1);
        expect(artifacts.LighthouseRunWarnings[0])
          .toBeDisplayString(/too slow/);
      });
    });

    it('resolves when domain name can\'t be resolved but is offline', () => {
      const config = makeConfig({
        passes: [{
          recordTrace: true,
          passName: 'firstPass',
          gatherers: [],
        }],
      });

      // Arrange for driver to return unresolved request.
      const requestedUrl = 'http://www.some-non-existing-domain.com/';
      const unresolvedDriver = Object.assign({}, fakeDriver, {
        online: false,
        gotoURL() {
          return Promise.resolve({finalUrl: requestedUrl, timedOut: false});
        },
        endDevtoolsLog() {
          return unresolvedPerfLog;
        },
      });

      return GatherRunner.run(config.passes, {
        driver: unresolvedDriver,
        requestedUrl,
        settings: config.settings,
      })
        .then(_ => {
          assert.ok(true);
        });
    });
  });

  describe('.getInstallabilityErrors', () => {
    /** @type {RecursivePartial<LH.Gatherer.PassContext>} */
    let passContext;

    beforeEach(() => {
      passContext = {
        driver,
      };
    });

    it('should return the response from the protocol, if in >=M82 format', async () => {
      connectionStub.sendCommand
        .mockResponse('Page.getInstallabilityErrors', {
          installabilityErrors: [{errorId: 'no-icon-available', errorArguments: []}],
        });
      const result = await GatherRunner.getInstallabilityErrors(passContext);
      expect(result).toEqual({
        errors: [{errorId: 'no-icon-available', errorArguments: []}],
      });
    });

    it('should transform the response from the protocol, if in <M82 format', async () => {
      connectionStub.sendCommand
        .mockResponse('Page.getInstallabilityErrors', {
          // @ts-ignore
          errors: ['Downloaded icon was empty or corrupted'],
        });
      const result = await GatherRunner.getInstallabilityErrors(passContext);
      expect(result).toEqual({
        errors: [{errorId: 'no-icon-available', errorArguments: []}],
      });
    });
  });

  describe('.getWebAppManifest', () => {
    const MANIFEST_URL = 'https://example.com/manifest.json';
    /** @type {RecursivePartial<LH.Gatherer.PassContext>} */
    let passContext;

    beforeEach(() => {
      passContext = {
        url: 'https://example.com/index.html',
        baseArtifacts: {},
        driver,
      };
    });

    it('should return null when there is no manifest', async () => {
      connectionStub.sendCommand
        .mockResponse('Page.getAppManifest', {})
        .mockResponse('Page.getInstallabilityErrors', {installabilityErrors: []});
      const result = await GatherRunner.getWebAppManifest(passContext);
      expect(result).toEqual(null);
    });

    it('should parse the manifest when found', async () => {
      const manifest = {name: 'App'};
      connectionStub.sendCommand
        .mockResponse('Page.getAppManifest', {data: JSON.stringify(manifest), url: MANIFEST_URL})
        .mockResponse('Page.getInstallabilityErrors', {installabilityErrors: []});

      const result = await GatherRunner.getWebAppManifest(passContext);
      expect(result).toHaveProperty('raw', JSON.stringify(manifest));
      expect(result && result.value).toMatchObject({
        name: {value: 'App', raw: 'App'},
        start_url: {value: passContext.url, raw: undefined},
      });
    });
  });
});
