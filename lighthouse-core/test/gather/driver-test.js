/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Driver = require('../../gather/driver.js');
const Connection = require('../../gather/connections/connection.js');
const LHElement = require('../../lib/lh-element.js');
const {protocolGetVersionResponse} = require('./fake-driver.js');
const {createMockSendCommandFn, createMockOnceFn} = require('./mock-commands.js');

/* eslint-env jest */

jest.useFakeTimers();

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
  // @ts-ignore: Ignore 'unused' error.
  return {promise, resolve, reject};
}

function createMockWaitForFn() {
  const {promise, resolve, reject} = createDecomposedPromise();

  const mockCancelFn = jest.fn();
  const mockFn = jest.fn().mockReturnValue({promise, cancel: mockCancelFn});

  return Object.assign(mockFn, {
    mockResolve: resolve,
    /** @param {Error=} err */
    mockReject(err) {
      reject(err || new Error('Rejected'));
    },
    getMockCancelFn() {
      return mockCancelFn;
    },
  });
}

expect.extend({
  /**
   * Asserts that an inspectable promise created by makePromiseInspectable is currently resolved or rejected.
   * This is useful for situations where we want to test that we are actually waiting for a particular event.
   *
   * @param {ReturnType<typeof makePromiseInspectable>} received
   * @param {string} failureMessage
   */
  toBeDone(received, failureMessage) {
    const pass = received.isDone();

    const message = () =>
      [
        `${this.utils.matcherHint('.toBeDone')}\n`,
        `Expected promise to be resolved: ${this.utils.printExpected(failureMessage)}`,
        `  ${this.utils.printReceived(received.getDebugValues())}`,
      ].join('\n');

    return {message, pass};
  },
});

/**
 * In some functions we have lots of promise follow ups that get queued by protocol messages.
 * This is a convenience method to easily advance all timers and flush all the queued microtasks.
 */
async function flushAllTimersAndMicrotasks(ms = 1000) {
  for (let i = 0; i < ms; i++) {
    jest.advanceTimersByTime(1);
    await Promise.resolve();
  }
}

/**
 * @typedef DriverMockMethods
 * @property {ReturnType<typeof createMockOnceFn>} on
 * @property {ReturnType<typeof createMockOnceFn>} once
 * @property {ReturnType<typeof createMockWaitForFn>} _waitForFcp
 * @property {ReturnType<typeof createMockWaitForFn>} _waitForLoadEvent
 * @property {ReturnType<typeof createMockWaitForFn>} _waitForNetworkIdle
 * @property {ReturnType<typeof createMockWaitForFn>} _waitForCPUIdle
 * @property {(...args: RecursivePartial<Parameters<Driver['gotoURL']>>) => ReturnType<Driver['gotoURL']>} gotoURL
 * @property {(...args: RecursivePartial<Parameters<Driver['goOnline']>>) => ReturnType<Driver['goOnline']>} goOnline
*/

/** @typedef {Omit<Driver, keyof DriverMockMethods> & DriverMockMethods} TestDriver */

/** @type {TestDriver} */
let driver;
/** @type {Connection & {sendCommand: ReturnType<typeof createMockSendCommandFn>}} */
let connectionStub;

beforeEach(() => {
  // @ts-ignore - connectionStub has a mocked version of sendCommand implemented in each test
  connectionStub = new Connection();
  // @ts-ignore
  connectionStub.sendCommand = cmd => {
    throw new Error(`${cmd} not implemented`);
  };
  // @ts-ignore - driver has a mocked version of on/once implemented in each test
  driver = new Driver(connectionStub);
});

describe('.querySelector(All)', () => {
  it('returns null when DOM.querySelector finds no node', async () => {
    connectionStub.sendCommand = createMockSendCommandFn()
      .mockResponse('DOM.getDocument', {root: {nodeId: 249}})
      .mockResponse('DOM.querySelector', {nodeId: 0});

    const result = await driver.querySelector('invalid');
    expect(result).toEqual(null);
  });

  it('returns element instance when DOM.querySelector finds a node', async () => {
    connectionStub.sendCommand = createMockSendCommandFn()
      .mockResponse('DOM.getDocument', {root: {nodeId: 249}})
      .mockResponse('DOM.querySelector', {nodeId: 231});

    const result = await driver.querySelector('meta head');
    expect(result).toBeInstanceOf(LHElement);
  });
});

describe('.getObjectProperty', () => {
  it('returns value when getObjectProperty finds property name', async () => {
    const property = {
      name: 'testProp',
      value: {
        value: 123,
      },
    };

    connectionStub.sendCommand = createMockSendCommandFn()
      .mockResponse('Runtime.getProperties', {result: [property]});

    const result = await driver.getObjectProperty('objectId', 'testProp');
    expect(result).toEqual(123);
  });

  it('returns null when getObjectProperty finds no property name', async () => {
    connectionStub.sendCommand = createMockSendCommandFn()
      .mockResponse('Runtime.getProperties', {result: []});

    const result = await driver.getObjectProperty('objectId', 'testProp');
    expect(result).toEqual(null);
  });

  it('returns null when getObjectProperty finds property name with no value', async () => {
    connectionStub.sendCommand = createMockSendCommandFn()
      .mockResponse('Runtime.getProperties', {result: [{name: 'testProp'}]});

    const result = await driver.getObjectProperty('objectId', 'testProp');
    expect(result).toEqual(null);
  });
});

describe('.getRequestContent', () => {
  it('throws if getRequestContent takes too long', async () => {
    const mockTimeout = 5000;
    const driverTimeout = 1000;
    // @ts-ignore
    connectionStub.sendCommand = jest.fn()
      .mockImplementation(() => new Promise(r => setTimeout(r, mockTimeout)));

    // Fail if we don't reach our two assertions in the catch block
    expect.assertions(2);

    try {
      const responsePromise = driver.getRequestContent('', driverTimeout);
      await flushAllTimersAndMicrotasks(Math.max(driverTimeout, mockTimeout) + 1);
      await responsePromise;
    } catch (err) {
      expect(err.code).toEqual('PROTOCOL_TIMEOUT');
      expect(err.friendlyMessage).toBeDisplayString(
        /^Waiting for DevTools.*Method: Network.getResponseBody/
      );
    }
  });
});

describe('.evaluateAsync', () => {
  it('evaluates an expression', async () => {
    connectionStub.sendCommand = createMockSendCommandFn()
      .mockResponse('Runtime.evaluate', {result: {value: 2}});

    const value = await driver.evaluateAsync('1 + 1');
    expect(value).toEqual(2);
    connectionStub.sendCommand.findInvocation('Runtime.evaluate');
  });

  it('uses a high default timeout', async () => {
    connectionStub.sendCommand = createMockSendCommandFn()
      .mockResponse('Runtime.evaluate', {result: {value: 2}}, 65000);

    const evaluatePromise = makePromiseInspectable(driver.evaluateAsync('1 + 1'));
    jest.advanceTimersByTime(30000);
    await flushAllTimersAndMicrotasks();
    expect(evaluatePromise).not.toBeDone();

    jest.advanceTimersByTime(30000);
    await flushAllTimersAndMicrotasks();
    expect(evaluatePromise).toBeDone();
    await expect(evaluatePromise).rejects.toBeTruthy();
  });

  it('uses the specific timeout given', async () => {
    connectionStub.sendCommand = createMockSendCommandFn()
      .mockResponse('Runtime.evaluate', {result: {value: 2}}, 10000);

    driver.setNextProtocolTimeout(5000);
    const evaluatePromise = makePromiseInspectable(driver.evaluateAsync('1 + 1'));

    jest.advanceTimersByTime(5001);
    await flushAllTimersAndMicrotasks();
    expect(evaluatePromise).toBeDone();
    await expect(evaluatePromise).rejects.toBeTruthy();
  });

  it('evaluates an expression in isolation', async () => {
    connectionStub.sendCommand = createMockSendCommandFn()
      .mockResponse('Page.getResourceTree', {frameTree: {frame: {id: '1337'}}})
      .mockResponse('Page.createIsolatedWorld', {executionContextId: 1})
      .mockResponse('Runtime.evaluate', {result: {value: 2}});

    const value = await driver.evaluateAsync('1 + 1', {useIsolation: true});
    expect(value).toEqual(2);

    // Check that we used the correct frame when creating the isolated context
    const createWorldArgs = connectionStub.sendCommand.findInvocation('Page.createIsolatedWorld');
    expect(createWorldArgs).toMatchObject({frameId: '1337'});

    // Check that we used the isolated context when evaluating
    const evaluateArgs = connectionStub.sendCommand.findInvocation('Runtime.evaluate');
    expect(evaluateArgs).toMatchObject({contextId: 1});

    // Make sure we cached the isolated context from last time
    connectionStub.sendCommand = createMockSendCommandFn().mockResponse('Runtime.evaluate',
      {result: {value: 2}}
    );
    await driver.evaluateAsync('1 + 1', {useIsolation: true});
    expect(connectionStub.sendCommand).not.toHaveBeenCalledWith(
      'Page.createIsolatedWorld',
      expect.anything()
    );
  });

  it('recovers from isolation failures', async () => {
    connectionStub.sendCommand = createMockSendCommandFn()
      .mockResponse('Page.getResourceTree', {frameTree: {frame: {id: '1337'}}})
      .mockResponse('Page.createIsolatedWorld', {executionContextId: 9001})
      .mockResponse('Runtime.evaluate', Promise.reject(new Error('Cannot find context')))
      .mockResponse('Page.getResourceTree', {frameTree: {frame: {id: '1337'}}})
      .mockResponse('Page.createIsolatedWorld', {executionContextId: 9002})
      .mockResponse('Runtime.evaluate', {result: {value: 'mocked value'}});

    const value = await driver.evaluateAsync('"magic"', {useIsolation: true});
    expect(value).toEqual('mocked value');
  });
});

describe('.sendCommand', () => {
  it('.sendCommand timesout when commands take too long', async () => {
    const mockTimeout = 5000;
    // @ts-ignore
    connectionStub.sendCommand = jest.fn()
      .mockImplementation(() => new Promise(r => setTimeout(r, mockTimeout)));

    driver.setNextProtocolTimeout(10000);
    const pageEnablePromise = driver.sendCommand('Page.enable');
    jest.advanceTimersByTime(mockTimeout + 1);
    await pageEnablePromise;

    const driverTimeout = 5;
    driver.setNextProtocolTimeout(driverTimeout);
    const pageDisablePromise = driver.sendCommand('Page.disable');

    await flushAllTimersAndMicrotasks(driverTimeout + 1);
    await expect(pageDisablePromise).rejects.toMatchObject({
      code: 'PROTOCOL_TIMEOUT',
    });
  });
});

describe('.beginTrace', () => {
  beforeEach(() => {
    connectionStub.sendCommand = createMockSendCommandFn()
      .mockResponse('Browser.getVersion', protocolGetVersionResponse)
      .mockResponse('Page.enable')
      .mockResponse('Tracing.start');
  });

  it('will request default traceCategories', async () => {
    await driver.beginTrace();

    const tracingStartArgs = connectionStub.sendCommand.findInvocation('Tracing.start');
    expect(tracingStartArgs.categories).toContain('devtools.timeline');
    expect(tracingStartArgs.categories).not.toContain('toplevel');
    expect(tracingStartArgs.categories).toContain('disabled-by-default-lighthouse');
  });

  it('will use requested additionalTraceCategories', async () => {
    await driver.beginTrace({additionalTraceCategories: 'loading,xtra_cat'});

    const tracingStartArgs = connectionStub.sendCommand.findInvocation('Tracing.start');
    expect(tracingStartArgs.categories).toContain('blink.user_timing');
    expect(tracingStartArgs.categories).toContain('xtra_cat');
    // Make sure it deduplicates categories too
    expect(tracingStartArgs.categories).not.toMatch(/loading.*loading/);
  });

  it('will adjust traceCategories based on chrome version', async () => {
    connectionStub.sendCommand = createMockSendCommandFn()
      .mockResponse('Browser.getVersion', {product: 'Chrome/70.0.3577.0'})
      .mockResponse('Page.enable')
      .mockResponse('Tracing.start');

    await driver.beginTrace();

    const tracingStartArgs = connectionStub.sendCommand.findInvocation('Tracing.start');
    // m70 doesn't have disabled-by-default-lighthouse, so 'toplevel' is used instead.
    expect(tracingStartArgs.categories).toContain('toplevel');
    expect(tracingStartArgs.categories).not.toContain('disabled-by-default-lighthouse');
  });
});

describe('.setExtraHTTPHeaders', () => {
  it('should Network.setExtraHTTPHeaders when there are extra-headers', async () => {
    connectionStub.sendCommand = createMockSendCommandFn()
      .mockResponse('Network.setExtraHTTPHeaders');

    await driver.setExtraHTTPHeaders({
      'Cookie': 'monster',
      'x-men': 'wolverine',
    });

    expect(connectionStub.sendCommand).toHaveBeenCalledWith(
      'Network.setExtraHTTPHeaders',
      undefined,
      expect.anything()
    );
  });

  it('should not call Network.setExtraHTTPHeaders when there are not extra-headers', async () => {
    connectionStub.sendCommand = createMockSendCommandFn();
    await driver.setExtraHTTPHeaders(null);
    expect(connectionStub.sendCommand).not.toHaveBeenCalled();
  });
});

describe('.getAppManifest', () => {
  it('should return null when no manifest', async () => {
    connectionStub.sendCommand = createMockSendCommandFn().mockResponse(
      'Page.getAppManifest',
      {data: undefined, url: '/manifest'}
    );
    const result = await driver.getAppManifest();
    expect(result).toEqual(null);
  });

  it('should return the manifest', async () => {
    const manifest = {name: 'The App'};
    connectionStub.sendCommand = createMockSendCommandFn().mockResponse(
      'Page.getAppManifest',
      {data: JSON.stringify(manifest), url: '/manifest'}
    );
    const result = await driver.getAppManifest();
    expect(result).toEqual({data: JSON.stringify(manifest), url: '/manifest'});
  });

  it('should handle BOM-encoded manifest', async () => {
    const fs = require('fs');
    const manifestWithoutBOM = fs.readFileSync(__dirname + '/../fixtures/manifest.json').toString();
    const manifestWithBOM = fs
      .readFileSync(__dirname + '/../fixtures/manifest-bom.json')
      .toString();

    connectionStub.sendCommand = createMockSendCommandFn().mockResponse(
      'Page.getAppManifest',
      {data: manifestWithBOM, url: '/manifest'}
    );
    const result = await driver.getAppManifest();
    expect(result).toEqual({data: manifestWithoutBOM, url: '/manifest'});
  });
});

describe('.goOffline', () => {
  it('should send offline emulation', async () => {
    connectionStub.sendCommand = createMockSendCommandFn()
      .mockResponse('Network.enable')
      .mockResponse('Network.emulateNetworkConditions');

    await driver.goOffline();
    const emulateArgs = connectionStub.sendCommand
      .findInvocation('Network.emulateNetworkConditions');
    expect(emulateArgs).toEqual({
      offline: true,
      latency: 0,
      downloadThroughput: 0,
      uploadThroughput: 0,
    });
  });
});

describe('.gotoURL', () => {
  beforeEach(() => {
    connectionStub.sendCommand = createMockSendCommandFn()
      .mockResponse('Network.enable')
      .mockResponse('Page.enable')
      .mockResponse('Page.setLifecycleEventsEnabled')
      .mockResponse('Emulation.setScriptExecutionDisabled')
      .mockResponse('Page.navigate')
      .mockResponse('Target.setAutoAttach')
      .mockResponse('Runtime.evaluate')
      .mockResponse('Page.getResourceTree', {frameTree: {frame: {id: 'ABC'}}});
  });

  it('will track redirects through gotoURL load', async () => {
    driver.on = driver.once = createMockOnceFn();

    const url = 'https://www.example.com';
    const loadOptions = {
      waitForNavigated: true,
    };

    const loadPromise = makePromiseInspectable(driver.gotoURL(url, loadOptions));
    await flushAllTimersAndMicrotasks();
    expect(loadPromise).not.toBeDone('Did not wait for frameNavigated');

    // Use `findListener` instead of `mockEvent` so we can control exactly when the promise resolves
    const loadListener = driver.on.findListener('Page.frameNavigated');

    /** @param {LH.Crdp.Page.Frame} frame */
    const navigate = frame => driver._eventEmitter.emit('Page.frameNavigated', {frame});
    const baseFrame = {id: 'ABC', loaderId: '', securityOrigin: '', mimeType: 'text/html'};
    navigate({...baseFrame, url: 'http://example.com'});
    navigate({...baseFrame, url: 'https://example.com'});
    navigate({...baseFrame, url: 'https://www.example.com'});
    navigate({...baseFrame, url: 'https://m.example.com'});
    navigate({...baseFrame, id: 'ad1', url: 'https://frame-a.example.com'});
    navigate({...baseFrame, url: 'https://m.example.com/client'});
    navigate({...baseFrame, id: 'ad2', url: 'https://frame-b.example.com'});
    navigate({...baseFrame, id: 'ad3', url: 'https://frame-c.example.com'});

    loadListener();
    await flushAllTimersAndMicrotasks();
    expect(loadPromise).toBeDone('Did not resolve after frameNavigated');

    const results = await loadPromise;
    expect(results.finalUrl).toEqual('https://m.example.com/client');
  });

  describe('when waitForNavigated', () => {
    it('waits for Page.frameNavigated', async () => {
      driver.on = driver.once = createMockOnceFn();

      const url = 'https://www.example.com';
      const loadOptions = {
        waitForNavigated: true,
      };

      const loadPromise = makePromiseInspectable(driver.gotoURL(url, loadOptions));
      await flushAllTimersAndMicrotasks();
      expect(loadPromise).not.toBeDone('Did not wait for frameNavigated');

      // Use `findListener` instead of `mockEvent` so we can control exactly when the promise resolves
      const listener = driver.on.findListener('Page.frameNavigated');
      listener();
      await flushAllTimersAndMicrotasks();
      expect(loadPromise).toBeDone('Did not resolve after frameNavigated');

      await loadPromise;
    });
  });

  describe('when waitForLoad', () => {
    const url = 'https://example.com';

    ['Fcp', 'LoadEvent', 'NetworkIdle', 'CPUIdle'].forEach(name => {
      it(`should wait for ${name}`, async () => {
        driver._waitForFcp = createMockWaitForFn();
        driver._waitForLoadEvent = createMockWaitForFn();
        driver._waitForNetworkIdle = createMockWaitForFn();
        driver._waitForCPUIdle = createMockWaitForFn();

        // @ts-ignore - dynamic property access, tests will definitely fail if the property were to change
        const waitForResult = driver[`_waitFor${name}`];
        const otherWaitForResults = [
          driver._waitForFcp,
          driver._waitForLoadEvent,
          driver._waitForNetworkIdle,
          driver._waitForCPUIdle,
        ].filter(l => l !== waitForResult);

        const loadPromise = makePromiseInspectable(driver.gotoURL(url, {
          waitForFcp: true,
          waitForLoad: true,
        }));

        // shouldn't finish all on its own
        await flushAllTimersAndMicrotasks();
        expect(loadPromise).not.toBeDone(`Did not wait for anything (${name})`);

        // shouldn't resolve after all the other listeners
        otherWaitForResults.forEach(result => result.mockResolve());
        await flushAllTimersAndMicrotasks();
        expect(loadPromise).not.toBeDone(`Did not wait for ${name}`);

        waitForResult.mockResolve();
        await flushAllTimersAndMicrotasks();
        expect(loadPromise).toBeDone(`Did not resolve on ${name}`);
        expect(await loadPromise).toMatchObject({timedOut: false});
      });
    });

    it('should wait for CPU Idle *after* network idle', async () => {
      driver._waitForLoadEvent = createMockWaitForFn();
      driver._waitForNetworkIdle = createMockWaitForFn();
      driver._waitForCPUIdle = createMockWaitForFn();

      const loadPromise = makePromiseInspectable(driver.gotoURL(url, {
        waitForLoad: true,
      }));

      // shouldn't finish all on its own
      await flushAllTimersAndMicrotasks();
      expect(loadPromise).not.toBeDone(`Did not wait for anything`);
      expect(driver._waitForLoadEvent).toHaveBeenCalled();
      expect(driver._waitForNetworkIdle).toHaveBeenCalled();
      expect(driver._waitForCPUIdle).not.toHaveBeenCalled();

      // should have been called now
      driver._waitForLoadEvent.mockResolve();
      driver._waitForNetworkIdle.mockResolve();
      await flushAllTimersAndMicrotasks();
      expect(driver._waitForCPUIdle).toHaveBeenCalled();
      expect(loadPromise).not.toBeDone(`Did not wait for CPU idle`);

      driver._waitForCPUIdle.mockResolve();
      await flushAllTimersAndMicrotasks();
      expect(loadPromise).toBeDone(`Did not resolve on CPU idle`);
      expect(await loadPromise).toMatchObject({timedOut: false});
    });

    it('should timeout when not resolved fast enough', async () => {
      driver._waitForLoadEvent = createMockWaitForFn();
      driver._waitForNetworkIdle = createMockWaitForFn();
      driver._waitForCPUIdle = createMockWaitForFn();

      const loadPromise = makePromiseInspectable(driver.gotoURL(url, {
        waitForLoad: true,
        passContext: {
          passConfig: {},
          settings: {
            maxWaitForLoad: 60000,
          },
        },
      }));

      // Resolve load and network to make sure we install CPU
      driver._waitForLoadEvent.mockResolve();
      driver._waitForNetworkIdle.mockResolve();
      await flushAllTimersAndMicrotasks();
      expect(loadPromise).not.toBeDone(`Did not wait for CPU idle`);

      jest.advanceTimersByTime(60001);
      await flushAllTimersAndMicrotasks();
      expect(loadPromise).toBeDone(`Did not wait for timeout`);
      // Check that we cancelled all our listeners
      expect(driver._waitForLoadEvent.getMockCancelFn()).toHaveBeenCalled();
      expect(driver._waitForNetworkIdle.getMockCancelFn()).toHaveBeenCalled();
      expect(driver._waitForCPUIdle.getMockCancelFn()).toHaveBeenCalled();
      expect(await loadPromise).toMatchObject({timedOut: true});
    });

    it('should cleanup listeners even when waits reject', async () => {
      driver._waitForLoadEvent = createMockWaitForFn();

      const loadPromise = makePromiseInspectable(driver.gotoURL(url, {waitForLoad: true}));

      driver._waitForLoadEvent.mockReject();
      await flushAllTimersAndMicrotasks();
      expect(loadPromise).toBeDone('Did not reject load promise when load rejected');
      await expect(loadPromise).rejects.toBeTruthy();
      // Make sure we still cleaned up our listeners
      expect(driver._waitForLoadEvent.getMockCancelFn()).toHaveBeenCalled();
    });
  });
});

describe('._waitForFcp', () => {
  it('should not resolve until FCP fires', async () => {
    driver.on = driver.once = createMockOnceFn();

    const waitPromise = makePromiseInspectable(driver._waitForFcp(0, 60 * 1000).promise);
    const listener = driver.on.findListener('Page.lifecycleEvent');

    await flushAllTimersAndMicrotasks();
    expect(waitPromise).not.toBeDone('Resolved without FCP');

    listener({name: 'domContentLoaded'});
    await flushAllTimersAndMicrotasks();
    expect(waitPromise).not.toBeDone('Resolved on wrong event');

    listener({name: 'firstContentfulPaint'});
    await flushAllTimersAndMicrotasks();
    expect(waitPromise).toBeDone('Did not resolve with FCP');
    await waitPromise;
  });

  it('should wait for pauseAfterFcpMs after FCP', async () => {
    driver.on = driver.once = createMockOnceFn();

    const waitPromise = makePromiseInspectable(driver._waitForFcp(5000, 60 * 1000).promise);
    const listener = driver.on.findListener('Page.lifecycleEvent');

    await flushAllTimersAndMicrotasks();
    expect(waitPromise).not.toBeDone('Resolved without FCP');

    listener({name: 'firstContentfulPaint'});
    await flushAllTimersAndMicrotasks();
    expect(waitPromise).not.toBeDone('Did not wait for pauseAfterFcpMs');

    jest.advanceTimersByTime(5001);
    await flushAllTimersAndMicrotasks();
    expect(waitPromise).toBeDone('Did not resolve after pauseAfterFcpMs');

    await waitPromise;
  });

  it('should timeout', async () => {
    driver.on = driver.once = createMockOnceFn();

    const waitPromise = makePromiseInspectable(driver._waitForFcp(0, 5000).promise);

    await flushAllTimersAndMicrotasks();
    expect(waitPromise).not.toBeDone('Resolved before timeout');

    jest.advanceTimersByTime(5001);
    await flushAllTimersAndMicrotasks();
    expect(waitPromise).toBeDone('Did not resolve after timeout');
    await expect(waitPromise).rejects.toMatchObject({code: 'NO_FCP'});
  });

  it('should be cancellable', async () => {
    driver.on = driver.once = createMockOnceFn();
    driver.off = jest.fn();

    const {promise: rawPromise, cancel} = driver._waitForFcp(0, 5000);
    const waitPromise = makePromiseInspectable(rawPromise);

    await flushAllTimersAndMicrotasks();
    expect(waitPromise).not.toBeDone('Resolved before timeout');

    cancel();
    await flushAllTimersAndMicrotasks();
    expect(waitPromise).toBeDone('Did not cancel promise');
    expect(driver.off).toHaveBeenCalled();
    await expect(waitPromise).rejects.toMatchObject({message: 'Wait for FCP canceled'});
  });
});

describe('.assertNoSameOriginServiceWorkerClients', () => {
  beforeEach(() => {
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

    const assertPromise = driver.assertNoSameOriginServiceWorkerClients(pageUrl);
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

    const assertPromise = driver.assertNoSameOriginServiceWorkerClients(pageUrl);
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
      const assertPromise = driver.assertNoSameOriginServiceWorkerClients(pageUrl);
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

    const assertPromise = driver.assertNoSameOriginServiceWorkerClients(pageUrl);
    await flushAllTimersAndMicrotasks();
    await assertPromise;
  });

  it('will wait for serviceworker to be activated', async () => {
    const pageUrl = 'https://example.com/';
    const swUrl = `${pageUrl}sw.js`;
    const registrations = [createSWRegistration(1, pageUrl)];
    const versions = [createActiveWorker(1, swUrl, [], 'installing')];
    const activatedVersions = [createActiveWorker(1, swUrl, [], 'activated')];

    driver.on = driver.once = createMockOnceFn()
      .mockEvent('ServiceWorker.workerRegistrationUpdated', {registrations})
      .mockEvent('ServiceWorker.workerVersionUpdated', {versions});

    const assertPromise = driver.assertNoSameOriginServiceWorkerClients(pageUrl);
    const inspectable = makePromiseInspectable(assertPromise);

    // After receiving the empty versions the promise still shouldn't be resolved
    await flushAllTimersAndMicrotasks();
    expect(inspectable).not.toBeDone();

    // Use `findListener` instead of `mockEvent` so we can control exactly when the promise resolves
    // After we invoke the listener with the activated versions we expect the promise to have resolved
    const listener = driver.on.findListener('ServiceWorker.workerVersionUpdated');
    listener({versions: activatedVersions});
    await flushAllTimersAndMicrotasks();
    expect(inspectable).toBeDone();
    await assertPromise;
  });
});

describe('.goOnline', () => {
  beforeEach(() => {
    connectionStub.sendCommand = createMockSendCommandFn()
      .mockResponse('Network.enable')
      .mockResponse('Emulation.setCPUThrottlingRate')
      .mockResponse('Network.emulateNetworkConditions');
  });

  it('re-establishes previous throttling settings', async () => {
    await driver.goOnline({
      passConfig: {useThrottling: true},
      settings: {
        throttlingMethod: 'devtools',
        throttling: {
          requestLatencyMs: 500,
          downloadThroughputKbps: 1000,
          uploadThroughputKbps: 1000,
        },
      },
    });

    const emulateArgs = connectionStub.sendCommand
      .findInvocation('Network.emulateNetworkConditions');
    expect(emulateArgs).toEqual({
      offline: false,
      latency: 500,
      downloadThroughput: (1000 * 1024) / 8,
      uploadThroughput: (1000 * 1024) / 8,
    });
  });

  it('clears network emulation when throttling is not devtools', async () => {
    await driver.goOnline({
      passConfig: {useThrottling: true},
      settings: {
        throttlingMethod: 'provided',
      },
    });

    const emulateArgs = connectionStub.sendCommand
      .findInvocation('Network.emulateNetworkConditions');
    expect(emulateArgs).toEqual({
      offline: false,
      latency: 0,
      downloadThroughput: 0,
      uploadThroughput: 0,
    });
  });

  it('clears network emulation when useThrottling is false', async () => {
    await driver.goOnline({
      passConfig: {useThrottling: false},
      settings: {
        throttlingMethod: 'devtools',
        throttling: {
          requestLatencyMs: 500,
          downloadThroughputKbps: 1000,
          uploadThroughputKbps: 1000,
        },
      },
    });

    const emulateArgs = connectionStub.sendCommand
      .findInvocation('Network.emulateNetworkConditions');
    expect(emulateArgs).toEqual({
      offline: false,
      latency: 0,
      downloadThroughput: 0,
      uploadThroughput: 0,
    });
  });
});

describe('Domain.enable/disable State', () => {
  it('dedupes (simple)', async () => {
    connectionStub.sendCommand = createMockSendCommandFn()
      .mockResponse('Network.enable')
      .mockResponse('Network.disable')
      .mockResponse('Fetch.enable')
      .mockResponse('Fetch.disable');

    await driver.sendCommand('Network.enable');
    await driver.sendCommand('Network.enable');
    expect(connectionStub.sendCommand).toHaveBeenCalledTimes(1);

    await driver.sendCommand('Network.disable');
    expect(connectionStub.sendCommand).toHaveBeenCalledTimes(1);
    // Network still has one enable.

    await driver.sendCommand('Fetch.enable');
    expect(connectionStub.sendCommand).toHaveBeenCalledTimes(2);

    await driver.sendCommand('Network.disable');
    expect(connectionStub.sendCommand).toHaveBeenCalledTimes(3);
    // Network is now disabled.

    await driver.sendCommand('Fetch.disable');
    expect(connectionStub.sendCommand).toHaveBeenCalledTimes(4);
  });

  it('dedupes (sessions)', async () => {
    connectionStub.sendCommand = createMockSendCommandFn()
      .mockResponse('Network.enable')
      .mockResponseToSession('Network.enable', '123')
      .mockResponse('Network.disable')
      .mockResponseToSession('Network.disable', '123');

    await driver.sendCommand('Network.enable');
    await driver.sendCommandToSession('Network.enable', '123');
    expect(connectionStub.sendCommand).toHaveBeenCalledTimes(2);

    await driver.sendCommand('Network.enable');
    await driver.sendCommandToSession('Network.enable', '123');
    expect(connectionStub.sendCommand).toHaveBeenCalledTimes(2);

    await driver.sendCommandToSession('Network.disable', '123');
    expect(connectionStub.sendCommand).toHaveBeenCalledTimes(2);

    await driver.sendCommand('Network.disable');
    expect(connectionStub.sendCommand).toHaveBeenCalledTimes(2);

    await driver.sendCommandToSession('Network.disable', '123');
    expect(connectionStub.sendCommand).toHaveBeenCalledTimes(3);

    await driver.sendCommand('Network.disable');
    expect(connectionStub.sendCommand).toHaveBeenCalledTimes(4);
  });
});

describe('Multi-target management', () => {
  it('enables the Network domain for iframes', async () => {
    connectionStub.sendCommand = createMockSendCommandFn()
      .mockResponseToSession('Network.enable', '123')
      .mockResponseToSession('Target.setAutoAttach', '123')
      .mockResponseToSession('Runtime.runIfWaitingForDebugger', '123');

    driver._eventEmitter.emit('Target.attachedToTarget', {
      sessionId: '123',
      // @ts-ignore: Ignore partial targetInfo.
      targetInfo: {type: 'iframe'},
    });
    await flushAllTimersAndMicrotasks();

    expect(connectionStub.sendCommand).toHaveBeenNthCalledWith(1, 'Network.enable', '123');
    expect(connectionStub.sendCommand)
      .toHaveBeenNthCalledWith(2, 'Target.setAutoAttach', '123', expect.anything());
    expect(connectionStub.sendCommand)
      .toHaveBeenNthCalledWith(3, 'Runtime.runIfWaitingForDebugger', '123');
  });

  it('ignores other target types, but still resumes them', async () => {
    connectionStub.sendCommand = createMockSendCommandFn()
      .mockResponse('Target.sendMessageToTarget');

    driver._eventEmitter.emit('Target.attachedToTarget', {
      sessionId: 'SW1',
      // @ts-ignore: Ignore partial targetInfo.
      targetInfo: {type: 'service_worker'},
    });
    await flushAllTimersAndMicrotasks();

    expect(connectionStub.sendCommand)
      .toHaveBeenNthCalledWith(1, 'Runtime.runIfWaitingForDebugger', 'SW1');
  });
});
