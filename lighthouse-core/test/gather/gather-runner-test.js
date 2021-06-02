/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

require('../test-utils.js').makeMocksForGatherRunner();

const Gatherer = require('../../gather/gatherers/gatherer.js');
const GatherRunner_ = require('../../gather/gather-runner.js');
const assert = require('assert').strict;
const Config = require('../../config/config.js');
const unresolvedPerfLog = require('./../fixtures/unresolved-perflog.json');
const LHError = require('../../lib/lh-error.js');
const networkRecordsToDevtoolsLog = require('../network-records-to-devtools-log.js');
const Driver = require('../../gather/driver.js');
const Connection = require('../../gather/connections/connection.js');
const {createMockSendCommandFn, createMockOnceFn} = require('./mock-commands.js');
const {
  makeParamsOptional,
  makePromiseInspectable,
  flushAllTimersAndMicrotasks,
} = require('../test-utils.js');

const GatherRunner = {
  afterPass: makeParamsOptional(GatherRunner_.afterPass),
  beginRecording: makeParamsOptional(GatherRunner_.beginRecording),
  collectArtifacts: makeParamsOptional(GatherRunner_.collectArtifacts),
  endRecording: makeParamsOptional(GatherRunner_.endRecording),
  initializeBaseArtifacts: makeParamsOptional(GatherRunner_.initializeBaseArtifacts),
  loadPage: makeParamsOptional(GatherRunner_.loadPage),
  run: makeParamsOptional(GatherRunner_.run),
  runPass: makeParamsOptional(GatherRunner_.runPass),
  setupDriver: makeParamsOptional(GatherRunner_.setupDriver),
  // Spies that should have mock implemenations most of the time.
  assertNoSameOriginServiceWorkerClients: jest.spyOn(GatherRunner_,
    'assertNoSameOriginServiceWorkerClients'),
};

/**
 * @param {LH.Config.Json} json
 */
function makeConfig(json) {
  const config = new Config(json);

  // Since the config is for `gather-runner`, ensure it has `passes`.
  if (!config.passes) {
    throw new Error('gather-runner test configs must have `passes`');
  }
  return /** @type {Config & {passes: Array<LH.Config.Pass>}} */ (config);
}

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
  registerRequestIdleCallbackWrap() {
    return Promise.resolve();
  }
  getImportantStorageWarning() {
    return Promise.resolve(undefined);
  }
}

const fakeDriver = require('./fake-driver.js');

/** @type {EmulationDriver} */
let driver;
/** @type {Connection & {sendCommand: ReturnType<typeof createMockSendCommandFn>}} */
let connectionStub;

function resetDefaultMockResponses() {
  GatherRunner.assertNoSameOriginServiceWorkerClients = jest.spyOn(GatherRunner_,
    'assertNoSameOriginServiceWorkerClients');
  GatherRunner.assertNoSameOriginServiceWorkerClients.mockReset();
  GatherRunner.assertNoSameOriginServiceWorkerClients.mockResolvedValue();

  connectionStub.sendCommand = createMockSendCommandFn()
    .mockResponse('Debugger.enable')
    .mockResponse('Debugger.setSkipAllPauses')
    .mockResponse('Debugger.setAsyncCallStackDepth')
    .mockResponse('Emulation.setCPUThrottlingRate')
    .mockResponse('Emulation.setDeviceMetricsOverride')
    .mockResponse('Emulation.setTouchEmulationEnabled')
    .mockResponse('Network.emulateNetworkConditions')
    .mockResponse('Network.enable')
    .mockResponse('Network.setBlockedURLs')
    .mockResponse('Network.setExtraHTTPHeaders')
    .mockResponse('Network.setUserAgentOverride')
    .mockResponse('Page.addScriptToEvaluateOnNewDocument')
    .mockResponse('Page.enable')
    .mockResponse('ServiceWorker.enable');
}

beforeEach(() => {
  jest.useFakeTimers();
  // @ts-expect-error - connectionStub has a mocked version of sendCommand implemented in each test
  connectionStub = new Connection();
  // @ts-expect-error
  connectionStub.sendCommand = cmd => {
    throw new Error(`${cmd} not implemented`);
  };
  driver = new EmulationDriver(connectionStub);
  resetDefaultMockResponses();

  const emulation = require('../../lib/emulation.js');
  emulation.emulate = jest.fn();
  emulation.throttle = jest.fn();
  emulation.clearThrottling = jest.fn();

  const prepare = require('../../gather/driver/prepare.js');
  prepare.prepareTargetForNavigationMode = jest.fn();
  prepare.prepareTargetForIndividualNavigation = jest.fn().mockResolvedValue({warnings: []});

  const navigation = jest.requireMock('../../gather/driver/navigation.js');
  navigation.gotoURL = jest.fn().mockResolvedValue({
    finalUrl: 'https://example.com',
    timedOut: false,
    warnings: [],
  });
});

afterEach(() => {
  GatherRunner.assertNoSameOriginServiceWorkerClients.mockRestore();
  jest.useRealTimers();
});

describe('GatherRunner', function() {
  it('loads a page and updates passContext.URL on redirect', () => {
    const url1 = 'https://example.com';
    const url2 = 'https://example.com/interstitial';
    const driver = {};
    const gotoURL = jest.requireMock('../../gather/driver/navigation.js').gotoURL;
    gotoURL.mockResolvedValue({finalUrl: url2, warnings: []});

    const passContext = {
      url: url1,
      settings: {},
      LighthouseRunWarnings: [],
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
    const driver = {};
    const gotoURL = jest.requireMock('../../gather/driver/navigation.js').gotoURL;
    gotoURL.mockRejectedValue(error);

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
    const options = {requestedUrl, driver, settings: config.settings, computedCache: new Map()};

    const results = await GatherRunner.run(config.passes, options);
    expect(Number.isFinite(results.BenchmarkIndex)).toBeTruthy();
  });

  it('collects host user agent as an artifact', async () => {
    const requestedUrl = 'https://example.com';
    const driver = fakeDriver;
    const config = makeConfig({passes: []});
    const options = {requestedUrl, driver, settings: config.settings, computedCache: new Map()};

    const results = await GatherRunner.run(config.passes, options);
    expect(results.HostUserAgent).toEqual(fakeDriver.protocolGetVersionResponse.userAgent);
    expect(results.HostUserAgent).toMatch(/Chrome\/\d+/);
  });

  it('collects network user agent as an artifact', async () => {
    const requestedUrl = 'https://example.com';
    const driver = fakeDriver;
    const config = makeConfig({passes: [{passName: 'defaultPass'}]});
    const options = {requestedUrl, driver, settings: config.settings, computedCache: new Map()};

    const results = await GatherRunner.run(config.passes, options);
    expect(results.NetworkUserAgent).toContain('Mozilla');
  });

  it('collects requested and final URLs as an artifact', () => {
    const requestedUrl = 'https://example.com';
    const finalUrl = 'https://example.com/interstitial';
    const gotoURL = jest.requireMock('../../gather/driver/navigation.js').gotoURL;
    gotoURL.mockResolvedValue({finalUrl, timedOut: false, warnings: []});
    const config = makeConfig({passes: [{passName: 'defaultPass'}]});
    const options = {
      requestedUrl,
      driver: fakeDriver,
      settings: config.settings,
      computedCache: new Map(),
    };

    return GatherRunner.run(config.passes, options).then(artifacts => {
      assert.deepStrictEqual(artifacts.URL, {requestedUrl, finalUrl},
        'did not find expected URL artifact');
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
        const options = {requestedUrl, driver, settings: config.settings, computedCache: new Map()};

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

  describe('.assertNoSameOriginServiceWorkerClients', () => {
    /** @type {LH.Gatherer.FRProtocolSession} */
    let session;
    /** @type {typeof GatherRunner_['assertNoSameOriginServiceWorkerClients']} */
    let assertNoSameOriginServiceWorkerClients;

    beforeEach(() => {
      GatherRunner.assertNoSameOriginServiceWorkerClients.mockRestore();
      assertNoSameOriginServiceWorkerClients = GatherRunner_.assertNoSameOriginServiceWorkerClients;
      session = driver.defaultSession;
      connectionStub.sendCommand = createMockSendCommandFn()
        .mockResponse('ServiceWorker.enable')
        .mockResponse('ServiceWorker.disable')
        .mockResponse('ServiceWorker.enable')
        .mockResponse('ServiceWorker.disable');
    });

    /**
   * @param {number} id
   * @param {string} url
   * @param {boolean=} isDeleted
   */
    function createSWRegistration(id, url, isDeleted) {
      return {
        isDeleted: !!isDeleted,
        registrationId: String(id),
        scopeURL: url,
      };
    }

    /**
   * @param {number} id
   * @param {string} url
   * @param {string[]} controlledClients
   * @param {LH.Crdp.ServiceWorker.ServiceWorkerVersionStatus=} status
   */
    function createActiveWorker(id, url, controlledClients, status = 'activated') {
      return {
        registrationId: String(id),
        scriptURL: url,
        controlledClients,
        status,
      };
    }

    it('will pass if there are no current service workers', async () => {
      const pageUrl = 'https://example.com/';

      driver.on = driver.once = createMockOnceFn()
      .mockEvent('ServiceWorker.workerRegistrationUpdated', {registrations: []})
      .mockEvent('ServiceWorker.workerVersionUpdated', {versions: []});

      const assertPromise = assertNoSameOriginServiceWorkerClients(session, pageUrl);
      await flushAllTimersAndMicrotasks();
      await assertPromise;
    });

    it('will pass if there is an active service worker for a different origin', async () => {
      const pageUrl = 'https://example.com/';
      const secondUrl = 'https://example.edu';
      const swUrl = `${secondUrl}sw.js`;

      const registrations = [createSWRegistration(1, secondUrl)];
      const versions = [createActiveWorker(1, swUrl, ['uniqueId'])];

      driver.on = driver.once = createMockOnceFn()
      .mockEvent('ServiceWorker.workerRegistrationUpdated', {registrations})
      .mockEvent('ServiceWorker.workerVersionUpdated', {versions});

      const assertPromise = assertNoSameOriginServiceWorkerClients(session, pageUrl);
      await flushAllTimersAndMicrotasks();
      await assertPromise;
    });

    it('will fail if a service worker with a matching origin has a controlled client', async () => {
      const pageUrl = 'https://example.com/';
      const swUrl = `${pageUrl}sw.js`;
      const registrations = [createSWRegistration(1, pageUrl)];
      const versions = [createActiveWorker(1, swUrl, ['uniqueId'])];

      driver.on = driver.once = createMockOnceFn()
      .mockEvent('ServiceWorker.workerRegistrationUpdated', {registrations})
      .mockEvent('ServiceWorker.workerVersionUpdated', {versions});

      expect.assertions(1);

      try {
        const assertPromise = assertNoSameOriginServiceWorkerClients(session, pageUrl);
        await flushAllTimersAndMicrotasks();
        await assertPromise;
      } catch (err) {
        expect(err.message.toLowerCase()).toContain('multiple tabs');
      }
    });

    it('will succeed if a service worker with has no controlled clients', async () => {
      const pageUrl = 'https://example.com/';
      const swUrl = `${pageUrl}sw.js`;
      const registrations = [createSWRegistration(1, pageUrl)];
      const versions = [createActiveWorker(1, swUrl, [])];

      driver.on = driver.once = createMockOnceFn()
      .mockEvent('ServiceWorker.workerRegistrationUpdated', {registrations})
      .mockEvent('ServiceWorker.workerVersionUpdated', {versions});

      const assertPromise = assertNoSameOriginServiceWorkerClients(session, pageUrl);
      await flushAllTimersAndMicrotasks();
      await assertPromise;
    });

    it('will wait for serviceworker to be activated', async () => {
      const pageUrl = 'https://example.com/';
      const swUrl = `${pageUrl}sw.js`;
      const registrations = [createSWRegistration(1, pageUrl)];
      const versions = [createActiveWorker(1, swUrl, [], 'installing')];
      const activatedVersions = [createActiveWorker(1, swUrl, [], 'activated')];

      const mockOn = driver.on = driver.once = createMockOnceFn()
      .mockEvent('ServiceWorker.workerRegistrationUpdated', {registrations})
      .mockEvent('ServiceWorker.workerVersionUpdated', {versions});

      const assertPromise = assertNoSameOriginServiceWorkerClients(session, pageUrl);
      const inspectable = makePromiseInspectable(assertPromise);

      // After receiving the empty versions the promise still shouldn't be resolved
      await flushAllTimersAndMicrotasks();
      expect(inspectable).not.toBeDone();

      // Use `findListener` instead of `mockEvent` so we can control exactly when the promise resolves
      // After we invoke the listener with the activated versions we expect the promise to have resolved
      const listener = mockOn.findListener('ServiceWorker.workerVersionUpdated');
      listener({versions: activatedVersions});
      await flushAllTimersAndMicrotasks();
      expect(inspectable).toBeDone();
      await assertPromise;
    });
  });

  it('prepares target for navigation', async () => {
    const passConfig = {
      passName: 'default',
      loadFailureMode: /** @type {'ignore'} */ ('ignore'),
      recordTrace: true,
      useThrottling: true,
      gatherers: [],
    };
    const settings = {
      disableStorageReset: false,
    };
    const requestedUrl = 'https://example.com';
    const passContext = {
      driver: fakeDriver,
      passConfig,
      settings,
      baseArtifacts: await GatherRunner.initializeBaseArtifacts({driver, settings, requestedUrl}),
      computedCache: new Map(),
      LighthouseRunWarnings: [],
    };

    const prepare = jest.requireMock('../../gather/driver/prepare.js');
    await GatherRunner.runPass(passContext);
    expect(prepare.prepareTargetForIndividualNavigation).toHaveBeenCalled();
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
      computedCache: new Map(),
    };

    const artifacts = await GatherRunner.run(config.passes, options);
    expect(artifacts.LighthouseRunWarnings).toHaveLength(1);
    expect(artifacts.PageLoadError).toBeInstanceOf(Error);
    expect(artifacts.PageLoadError).toMatchObject({code: 'ERRORED_DOCUMENT_REQUEST'});
    // @ts-expect-error: Test-only gatherer.
    expect(artifacts.TestGatherer).toBeUndefined();
  });

  it('returns a pageLoadError and no artifacts when there is a navigation error', async () => {
    const requestedUrl = 'https://example.com';
    // This time, NO_FCP should win because it's the only error left.
    const navigationError = new LHError(LHError.errors.NO_FCP);
    const driver = Object.assign({}, fakeDriver, {
      online: true,
      endDevtoolsLog() {
        return networkRecordsToDevtoolsLog([{url: requestedUrl}]);
      },
    });

    const gotoURL = jest.requireMock('../../gather/driver/navigation.js').gotoURL;
    gotoURL.mockImplementation(
      /** @param {any} _ @param {string} url */
      (_, url) => url.includes('blank') ? null : Promise.reject(navigationError)
    );

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
      computedCache: new Map(),
    };

    const artifacts = await GatherRunner.run(config.passes, options);
    expect(artifacts.LighthouseRunWarnings).toHaveLength(1);
    expect(artifacts.PageLoadError).toBeInstanceOf(Error);
    expect(artifacts.PageLoadError).toMatchObject({code: 'NO_FCP'});
    // @ts-expect-error: Test-only gatherer.
    expect(artifacts.TestGatherer).toBeUndefined();
  });

  it('succeeds when there is a navigation error but loadFailureMode was warn', async () => {
    const requestedUrl = 'https://example.com';
    // NO_FCP should be ignored because it's a warn pass.
    const navigationError = new LHError(LHError.errors.NO_FCP);

    const gotoUrlForAboutBlank = jest.fn().mockResolvedValue({});
    const gotoUrlForRealUrl = jest.fn()
      .mockResolvedValueOnce({finalUrl: requestedUrl, timedOut: false, warnings: []})
      .mockRejectedValueOnce(navigationError);
    const driver = Object.assign({}, fakeDriver, {
      online: true,
      endDevtoolsLog() {
        return networkRecordsToDevtoolsLog([{url: requestedUrl}]);
      },
    });

    const gotoURL = jest.requireMock('../../gather/driver/navigation.js').gotoURL;
    gotoURL.mockImplementation(
      /** @param {any} _ @param {string} url */
      (_, url) => url.includes('blank') ? gotoUrlForAboutBlank() : gotoUrlForRealUrl()
    );

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
      computedCache: new Map(),
    };

    const artifacts = await GatherRunner.run(config.passes, options);
    expect(artifacts.LighthouseRunWarnings).toHaveLength(1);
    expect(artifacts.PageLoadError).toEqual(null);
    // @ts-expect-error: Test-only gatherer.
    expect(artifacts.TestGatherer).toBeUndefined();
    expect(artifacts.devtoolsLogs).toHaveProperty('pageLoadError-nextPass');
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

    const passContext = {url, driver, passConfig, computedCache: new Map()};
    return GatherRunner.endRecording(passContext).then(passData => {
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

    await GatherRunner.beginRecording({driver, passConfig, settings, computedCache: new Map()});
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

    const passContext = {url, driver, passConfig, computedCache: new Map()};
    return GatherRunner.endRecording(passContext).then(passData => {
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
    const passContext = {url, driver, passConfig, computedCache: new Map()};
    await GatherRunner.afterPass(passContext, {}, gathererResults);
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
      computedCache: new Map(),
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
      computedCache: new Map(),
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
    const options = {driver, requestedUrl, settings: config.settings, computedCache: new Map()};
    const artifacts = await GatherRunner.run(config.passes, options);

    expect(artifacts.PageLoadError).toMatchObject({code: 'NO_DOCUMENT_REQUEST'});
    // @ts-expect-error: Test-only gatherer.
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
    const driver = Object.assign({}, fakeDriver, {online: true});

    const gotoURL = jest.requireMock('../../gather/driver/navigation.js').gotoURL;

    gotoURL.mockImplementation(
      /**
       * Loads the page successfully in the first pass, fails with NO_FCP in the second.
       * @param {any} _
       * @param {string} url
       */
      (_, url) => {
        if (url.includes('blank')) return null;
        if (firstLoad) {
          firstLoad = false;
          return {finalUrl: requestedUrl, timedOut: false, warnings: []};
        } else {
          throw new LHError(LHError.errors.NO_FCP);
        }
      });
    const options = {driver, requestedUrl, settings: config.settings, computedCache: new Map()};
    const artifacts = await GatherRunner.run(config.passes, options);

    // t1.pass() and t2.pass() called; t3.pass(), after the error, was not.
    expect(t1.called).toBe(true);
    expect(t2.called).toBe(true);
    expect(t3.called).toBe(false);

    // But only t1 has a valid artifact; t2 and t3 aren't defined.
    // @ts-expect-error: Test-only gatherer.
    expect(artifacts.Test1).toBe('MyArtifact');
    // @ts-expect-error: Test-only gatherer.
    expect(artifacts.Test2).toBeUndefined();
    // @ts-expect-error: Test-only gatherer.
    expect(artifacts.Test3).toBeUndefined();

    // PageLoadError artifact has the error.
    expect(artifacts.PageLoadError).toBeInstanceOf(LHError);
    expect(artifacts.PageLoadError).toMatchObject({code: 'NO_FCP'});

    // firstPass has a saved trace and devtoolsLog, secondPass has an error trace and log.
    expect(Object.keys(artifacts.traces)).toEqual(['firstPass', 'pageLoadError-secondPass']);
    expect(Object.keys(artifacts.devtoolsLogs)).toEqual(['firstPass', 'pageLoadError-secondPass']);
  });

  describe('artifact collection', () => {
    // Make sure our gatherers never execute in parallel
    it('runs gatherer lifecycle methods strictly in sequence', async () => {
      jest.useRealTimers();
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
          passName: 'defaultPass',
          gatherers: gatherers.map(G => ({instance: new G()})),
        }],
      });

      /** @type {any} Using Test-only gatherers. */
      const artifacts = await GatherRunner.run(config.passes, {
        driver: fakeDriver,
        requestedUrl: 'https://example.com',
        settings: config.settings,
        computedCache: new Map(),
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
          passName: 'defaultPass',
          gatherers,
        }],
      });

      return GatherRunner.run(config.passes, {
        driver: fakeDriver,
        requestedUrl: 'https://example.com',
        settings: config.settings,
        computedCache: new Map(),
      }).then(artifacts => {
        gathererNames.forEach(gathererName => {
          assert.strictEqual(artifacts[gathererName], gathererName);
        });
      });
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
        {
          i18nId: 'LH.IcuMessage0',
          formattedDefault: 'warning3',
        },
        {
          i18nId: 'LH.IcuMessage1',
          formattedDefault: 'warning4',
        },
      ];

      class WarningGatherer extends Gatherer {
        /** @param {LH.Gatherer.PassContext} passContext */
        afterPass(passContext) {
          passContext.LighthouseRunWarnings.push(
            ...runWarnings,
            ...runWarnings,
            // adding one of the warnings with keys in different order
            {formattedDefault: 'warning3', i18nId: 'LH.IcuMessage0'}
          );
          assert.strictEqual(passContext.LighthouseRunWarnings.length, runWarnings.length * 2 + 1);

          return '';
        }
      }

      const config = makeConfig({
        passes: [{
          passName: 'defaultPass',
          gatherers: [{instance: new WarningGatherer()}],
        }],
      });
      const artifacts = await GatherRunner.run(config.passes, {
        driver: fakeDriver,
        requestedUrl: 'https://example.com',
        settings: config.settings,
        computedCache: new Map(),
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
          passName: 'defaultPass',
          gatherers,
        }],
      });

      return GatherRunner.run(config.passes, {
        driver: fakeDriver,
        requestedUrl: 'https://example.com',
        settings: config.settings,
        computedCache: new Map(),
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
        computedCache: new Map(),
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
        computedCache: new Map(),
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
      });

      const gotoURL = jest.requireMock('../../gather/driver/navigation.js').gotoURL;
      gotoURL.mockResolvedValue({finalUrl: requestedUrl, warnings: ['It is too slow']});

      return GatherRunner.run(config.passes, {
        driver: timedoutDriver,
        requestedUrl,
        settings: config.settings,
        computedCache: new Map(),
      }).then(artifacts => {
        expect(artifacts.LighthouseRunWarnings).toEqual(['It is too slow']);
      });
    });

    it('resolves and does not warn when page times out on non-fatal pass', () => {
      const config = makeConfig({
        passes: [{
          recordTrace: true,
          passName: 'firstPass',
          gatherers: [],
        }, {
          recordTrace: true,
          passName: 'secondPass',
          loadFailureMode: 'warn',
          gatherers: [],
        }],
      });

      const requestedUrl = 'http://www.slow-loading-page.com/';
      const timedoutDriver = Object.assign({}, fakeDriver, {
        online: true,
      });

      const gotoURL = jest.requireMock('../../gather/driver/navigation.js').gotoURL;
      gotoURL
        .mockResolvedValueOnce({finalUrl: requestedUrl, warnings: []})
        .mockResolvedValueOnce({finalUrl: requestedUrl, warnings: ['It is too slow']});

      return GatherRunner.run(config.passes, {
        driver: timedoutDriver,
        requestedUrl,
        settings: config.settings,
        computedCache: new Map(),
      }).then(artifacts => {
        expect(artifacts.LighthouseRunWarnings).toEqual([]);
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
        computedCache: new Map(),
      })
        .then(_ => {
          assert.ok(true);
        });
    });
  });
});
