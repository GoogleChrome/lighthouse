/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import log from 'lighthouse-logger';

import * as wait from '../../../gather/driver/wait-for-condition.js';
import {LighthouseError} from '../../../lib/lh-error.js';
import {
  makePromiseInspectable,
  flushAllTimersAndMicrotasks,
  createDecomposedPromise,
  fnAny,
  timers,
} from '../../test-utils.js';
import {createMockSession} from '../mock-driver.js';

function createMockWaitForFn() {
  const {promise, resolve, reject} = createDecomposedPromise();

  const mockCancelFn = fnAny();
  const mockFn = fnAny().mockReturnValue({promise, cancel: mockCancelFn});

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

function createMockMultipleInvocationWaitForFn() {
  /** @type {Array<{arguments: Array<*>, mockResolve(): void, mockReject(): void}>} */
  const calls = [];
  const mockCancelFn = fnAny();
  const mockFn = fnAny().mockImplementation((...args) => {
    const {promise, resolve, reject} = createDecomposedPromise();
    calls.push({
      arguments: args,
      mockResolve: () => resolve(),
      mockReject: () => reject(new Error('Rejected')),
    });
    return {promise, cancel: mockCancelFn};
  });

  return Object.assign(mockFn, {waitForCalls: calls});
}

describe('waitForFullyLoaded()', () => {
  before(() => timers.useFakeTimers());
  after(() => timers.dispose());

  let session;
  let networkMonitor;
  /** @type {import('../../../gather/driver/wait-for-condition.js').WaitOptions} */
  let options;

  beforeEach(() => {
    session = {
      sendCommand: fnAny().mockResolvedValue(),
      sendCommandAndIgnore: fnAny().mockResolvedValue(),
      setNextProtocolTimeout: fnAny(),
      onCrashPromise: fnAny().mockReturnValue(new Promise(() => {})),
    };
    networkMonitor = {getInflightRequests: fnAny().mockReturnValue([])};

    const overrides = {
      waitForFcp: createMockWaitForFn(),
      waitForLoadEvent: createMockWaitForFn(),
      waitForNetworkIdle: createMockWaitForFn(),
      waitForCPUIdle: createMockWaitForFn(),
    };

    options = {
      pauseAfterFcpMs: 0,
      pauseAfterLoadMs: 0,
      networkQuietThresholdMs: 5000,
      cpuQuietThresholdMs: 5000,
      maxWaitForLoadedMs: 60000,
      _waitForTestOverrides: overrides,
    };
  });

  ['Fcp', 'LoadEvent', 'NetworkIdle', 'CPUIdle'].forEach(name => {
    it(`should wait for ${name}`, async () => {
      // @ts-expect-error - dynamic property access, tests will definitely fail if the property were to change
      const waitForResult = options._waitForTestOverrides[`waitFor${name}`];
      const otherWaitForResults = [
        options._waitForTestOverrides.waitForFcp,
        options._waitForTestOverrides.waitForLoadEvent,
        options._waitForTestOverrides.waitForNetworkIdle,
        options._waitForTestOverrides.waitForCPUIdle,
      ].filter(l => l !== waitForResult);

      const loadPromise = makePromiseInspectable(wait.waitForFullyLoaded(
        session,
        networkMonitor,
        {...options, maxWaitForFcpMs: 60000}
      ));

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
    options._waitForTestOverrides.waitForLoadEvent = createMockWaitForFn();
    options._waitForTestOverrides.waitForNetworkIdle = createMockWaitForFn();
    options._waitForTestOverrides.waitForCPUIdle = createMockWaitForFn();

    const loadPromise = makePromiseInspectable(wait.waitForFullyLoaded(
      session,
      networkMonitor,
      options
    ));

    // shouldn't finish all on its own
    await flushAllTimersAndMicrotasks();
    expect(loadPromise).not.toBeDone(`Did not wait for anything`);
    expect(options._waitForTestOverrides.waitForLoadEvent).toHaveBeenCalled();
    expect(options._waitForTestOverrides.waitForNetworkIdle).toHaveBeenCalled();
    expect(options._waitForTestOverrides.waitForCPUIdle).not.toHaveBeenCalled();

    // should have been called now
    options._waitForTestOverrides.waitForLoadEvent.mockResolve();
    options._waitForTestOverrides.waitForNetworkIdle.mockResolve();
    await flushAllTimersAndMicrotasks();
    expect(options._waitForTestOverrides.waitForCPUIdle).toHaveBeenCalled();
    expect(loadPromise).not.toBeDone(`Did not wait for CPU idle`);

    options._waitForTestOverrides.waitForCPUIdle.mockResolve();
    await flushAllTimersAndMicrotasks();
    expect(loadPromise).toBeDone(`Did not resolve on CPU idle`);
    expect(await loadPromise).toMatchObject({timedOut: false});
  });

  it('should wait for multiple types of network idle', async () => {
    const mockWaitForNetworkIdle = createMockMultipleInvocationWaitForFn();
    options._waitForTestOverrides.waitForNetworkIdle = mockWaitForNetworkIdle;
    options._waitForTestOverrides.waitForLoadEvent = createMockWaitForFn();
    options._waitForTestOverrides.waitForCPUIdle = createMockWaitForFn();

    const loadPromise = makePromiseInspectable(wait.waitForFullyLoaded(
      session,
      networkMonitor,
      options
    ));

    // shouldn't finish all on its own
    await flushAllTimersAndMicrotasks();
    expect(loadPromise).not.toBeDone(`Did not wait for anything`);
    expect(options._waitForTestOverrides.waitForLoadEvent).toHaveBeenCalled();
    expect(options._waitForTestOverrides.waitForNetworkIdle).toHaveBeenCalledTimes(2);
    expect(options._waitForTestOverrides.waitForCPUIdle).not.toHaveBeenCalled();

    // should have been called now
    options._waitForTestOverrides.waitForLoadEvent.mockResolve();
    options._waitForTestOverrides.waitForCPUIdle.mockResolve();
    expect(mockWaitForNetworkIdle.waitForCalls).toHaveLength(2);
    mockWaitForNetworkIdle.waitForCalls[0].mockResolve();
    await flushAllTimersAndMicrotasks();
    expect(loadPromise).not.toBeDone(`Did not wait for second network idle`);

    mockWaitForNetworkIdle.waitForCalls[1].mockResolve();
    await flushAllTimersAndMicrotasks();
    expect(loadPromise).toBeDone(`Did not resolve on both network idles`);
    expect(await loadPromise).toMatchObject({timedOut: false});
  });

  it('should timeout and warn when not resolved fast enough', async () => {
    options._waitForTestOverrides.waitForLoadEvent = createMockWaitForFn();
    options._waitForTestOverrides.waitForNetworkIdle = createMockWaitForFn();
    options._waitForTestOverrides.waitForCPUIdle = createMockWaitForFn();
    networkMonitor.getInflightRequests.mockReturnValue([{url: 'https://example.com'}]);

    /** @type {Array<unknown>} */
    const warnings = [];
    /** @param {unknown} evt */
    const saveWarning = evt => warnings.push(evt);
    log.events.on('warning', saveWarning);

    const loadPromise = makePromiseInspectable(wait.waitForFullyLoaded(
      session,
      networkMonitor,
      {...options, maxWaitForLoadedMs: 60000}
    ));

    // Resolve load and network to make sure we install CPU
    options._waitForTestOverrides.waitForLoadEvent.mockResolve();
    options._waitForTestOverrides.waitForNetworkIdle.mockResolve();
    await flushAllTimersAndMicrotasks();
    expect(loadPromise).not.toBeDone(`Did not wait for CPU idle`);

    timers.advanceTimersByTime(60001);
    await flushAllTimersAndMicrotasks();
    expect(loadPromise).toBeDone(`Did not wait for timeout`);
    // Check that we cancelled all our listeners
    expect(options._waitForTestOverrides.waitForLoadEvent.getMockCancelFn()).toHaveBeenCalled();
    expect(options._waitForTestOverrides.waitForNetworkIdle.getMockCancelFn()).toHaveBeenCalled();
    expect(options._waitForTestOverrides.waitForCPUIdle.getMockCancelFn()).toHaveBeenCalled();
    // Check for warn logs
    log.events.off('warning', saveWarning);
    expect(warnings).toEqual([
      [
        'waitFor',
        'Timed out waiting for page load. Checking if page is hung...',
      ],
      [
        'waitFor',
        'Remaining inflight requests URLs',
        [
          'https://example.com',
        ],
      ],
    ]);

    expect(await loadPromise).toMatchObject({timedOut: true});
  });

  it('should throw PAGE_HUNG and kill JS when timed out and page is hung', async () => {
    options._waitForTestOverrides.waitForLoadEvent = createMockWaitForFn();
    options._waitForTestOverrides.waitForNetworkIdle = createMockWaitForFn();
    options._waitForTestOverrides.waitForCPUIdle = createMockWaitForFn();
    session.sendCommand.mockRejectedValue(
      new LighthouseError(LighthouseError.errors.PROTOCOL_TIMEOUT, {
        protocolMethod: 'Runtime.evaluate',
      })
    );

    const loadPromise = makePromiseInspectable(wait.waitForFullyLoaded(
      session,
      networkMonitor,
      {...options, maxWaitForLoadedMs: 60000}
    ));

    options._waitForTestOverrides.waitForLoadEvent.mockResolve();
    options._waitForTestOverrides.waitForNetworkIdle.mockResolve();
    await flushAllTimersAndMicrotasks();

    timers.advanceTimersByTime(60001);
    await flushAllTimersAndMicrotasks();
    expect(loadPromise).toBeDone();
    await expect(loadPromise).rejects.toMatchObject({code: 'PAGE_HUNG'});
    expect(session.sendCommandAndIgnore).toHaveBeenCalledWith(
      'Emulation.setScriptExecutionDisabled',
      {value: true}
    );
    expect(session.sendCommandAndIgnore).toHaveBeenCalledWith('Runtime.terminateExecution');
  });

  it('should cleanup listeners even when waits reject', async () => {
    options._waitForTestOverrides.waitForLoadEvent = createMockWaitForFn();

    const loadPromise = makePromiseInspectable(wait.waitForFullyLoaded(
      session,
      networkMonitor,
      options
    ));

    options._waitForTestOverrides.waitForLoadEvent.mockReject();
    await flushAllTimersAndMicrotasks();
    expect(loadPromise).toBeDone('Did not reject load promise when load rejected');
    await expect(loadPromise).rejects.toBeTruthy();
    // Make sure we still cleaned up our listeners
    expect(options._waitForTestOverrides.waitForLoadEvent.getMockCancelFn()).toHaveBeenCalled();
  });

  it('should stop waiting and cancel listeners when aborted', async () => {
    const controller = new AbortController();

    const loadPromise = makePromiseInspectable(wait.waitForFullyLoaded(
      session,
      networkMonitor,
      {...options, maxWaitForFcpMs: 60000},
      controller.signal
    ));

    await flushAllTimersAndMicrotasks();
    expect(loadPromise).not.toBeDone();

    controller.abort();
    await flushAllTimersAndMicrotasks();

    expect(loadPromise).toBeDone();
    expect(await loadPromise).toEqual({timedOut: false});
    expect(options._waitForTestOverrides.waitForFcp.getMockCancelFn()).toHaveBeenCalled();
    expect(options._waitForTestOverrides.waitForLoadEvent.getMockCancelFn()).toHaveBeenCalled();
  });

  it('should remove the abort listener when loading completes', async () => {
    const signal = /** @type {AbortSignal} */ ({
      addEventListener: fnAny(),
      removeEventListener: fnAny(),
      throwIfAborted: fnAny(),
    });

    const loadPromise = wait.waitForFullyLoaded(
      session,
      networkMonitor,
      options,
      signal
    );

    options._waitForTestOverrides.waitForLoadEvent.mockResolve();
    options._waitForTestOverrides.waitForNetworkIdle.mockResolve();
    await flushAllTimersAndMicrotasks();

    options._waitForTestOverrides.waitForCPUIdle.mockResolve();
    await loadPromise;

    const onAbort = signal.addEventListener.mock.calls[0][1];
    expect(signal.removeEventListener).toHaveBeenCalledWith('abort', onAbort);
  });
});

describe('waitForFcp()', () => {
  before(() => timers.useFakeTimers());
  after(() => timers.dispose());

  let session;

  beforeEach(() => {
    session = createMockSession();
  });


  it('should not resolve until FCP fires', async () => {
    const waitPromise = makePromiseInspectable(wait.waitForFcp(session, 0, 60 * 1000).promise);
    const listener = session.on.findListener('Page.lifecycleEvent');

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
    const waitPromise = makePromiseInspectable(wait.waitForFcp(session, 5000, 60 * 1000).promise);
    const listener = session.on.findListener('Page.lifecycleEvent');

    await flushAllTimersAndMicrotasks();
    expect(waitPromise).not.toBeDone('Resolved without FCP');

    listener({name: 'firstContentfulPaint'});
    await flushAllTimersAndMicrotasks();
    expect(waitPromise).not.toBeDone('Did not wait for pauseAfterFcpMs');

    timers.advanceTimersByTime(5001);
    await flushAllTimersAndMicrotasks();
    expect(waitPromise).toBeDone('Did not resolve after pauseAfterFcpMs');

    await waitPromise;
  });

  it('should timeout', async () => {
    const waitPromise = makePromiseInspectable(wait.waitForFcp(session, 0, 5000).promise);

    await flushAllTimersAndMicrotasks();
    expect(waitPromise).not.toBeDone('Resolved before timeout');

    timers.advanceTimersByTime(5001);
    await flushAllTimersAndMicrotasks();
    expect(waitPromise).toBeDone('Did not resolve after timeout');
    await expect(waitPromise).rejects.toMatchObject({code: 'NO_FCP'});
  });

  it('should be cancellable', async () => {
    const {promise: rawPromise, cancel} = wait.waitForFcp(session, 0, 5000);
    const waitPromise = makePromiseInspectable(rawPromise);

    await flushAllTimersAndMicrotasks();
    expect(waitPromise).not.toBeDone('Resolved before timeout');

    cancel();
    await flushAllTimersAndMicrotasks();
    expect(waitPromise).toBeDone('Did not cancel promise');
    expect(session.off).toHaveBeenCalled();
    await expect(waitPromise).rejects.toMatchObject({message: 'Wait for FCP canceled'});
  });
});

describe('isPageHung()', () => {
  let session;

  beforeEach(() => {
    session = createMockSession();
  });

  it('returns false when Runtime.evaluate ping succeeds', async () => {
    session.sendCommand.mockResponse('Runtime.evaluate', {
      result: {type: 'string', value: 'ping'},
    });

    expect(await wait.isPageHung(session.asSession())).toBe(false);
    expect(session.setNextProtocolTimeout).toHaveBeenCalledWith(1000);
    expect(session.sendCommand.findInvocation('Runtime.evaluate')).toEqual({
      expression: '"ping"',
      returnByValue: true,
    });
  });

  it('returns true when Runtime.evaluate ping times out', async () => {
    session.sendCommand.mockResponse('Runtime.evaluate', () =>
      Promise.reject(new LighthouseError(LighthouseError.errors.PROTOCOL_TIMEOUT, {
        protocolMethod: 'Runtime.evaluate',
      }))
    );

    expect(await wait.isPageHung(session.asSession())).toBe(true);
  });

  it('rethrows TARGET_CRASHED when Runtime.evaluate rejects with TARGET_CRASHED', async () => {
    const crashError = new LighthouseError(LighthouseError.errors.TARGET_CRASHED);
    session.sendCommand.mockResponse('Runtime.evaluate', () => Promise.reject(crashError));

    await expect(wait.isPageHung(session.asSession())).rejects.toBe(crashError);
  });

  it('rethrows TARGET_CRASHED when onCrashPromise rejected after PROTOCOL_TIMEOUT', async () => {
    const crashError = new LighthouseError(LighthouseError.errors.TARGET_CRASHED);
    session.onCrashPromise.mockReturnValue(Promise.reject(crashError));
    session.sendCommand.mockResponse('Runtime.evaluate', () =>
      Promise.reject(new LighthouseError(LighthouseError.errors.PROTOCOL_TIMEOUT, {
        protocolMethod: 'Runtime.evaluate',
      }))
    );

    await expect(wait.isPageHung(session.asSession())).rejects.toBe(crashError);
  });
});

describe('killHungPage()', () => {
  it('disables script execution and terminates active JS execution', () => {
    const session = createMockSession();
    session.sendCommand.mockResponse('Emulation.setScriptExecutionDisabled');
    session.sendCommand.mockResponse('Runtime.terminateExecution');

    wait.killHungPage(session.asSession());

    expect(session.sendCommand.findInvocation('Emulation.setScriptExecutionDisabled')).toEqual({
      value: true,
    });
    expect(session.sendCommand).toHaveBeenCalledWith('Runtime.terminateExecution');
  });
});
