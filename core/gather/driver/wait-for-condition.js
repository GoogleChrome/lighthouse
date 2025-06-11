/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* global window */

import log from 'lighthouse-logger';

import {LighthouseError} from '../../lib/lh-error.js';
import {ExecutionContext} from './execution-context.js';

/** @typedef {InstanceType<import('./network-monitor.js')['NetworkMonitor']>} NetworkMonitor */
/** @typedef {import('./network-monitor.js').NetworkMonitorEvent} NetworkMonitorEvent */

/**
 * @template [T=void]
 * @typedef CancellableWait
 * @prop {Promise<T>} promise
 * @prop {() => void} cancel
 */

/**
 * @typedef WaitOptions
 * @prop {number} pauseAfterFcpMs
 * @prop {number} pauseAfterLoadMs
 * @prop {number} networkQuietThresholdMs
 * @prop {number} cpuQuietThresholdMs
 * @prop {number} maxWaitForLoadedMs
 * @prop {number|undefined} maxWaitForFcpMs
 * @prop {{waitForFcp: typeof waitForFcp, waitForLoadEvent: typeof waitForLoadEvent, waitForNetworkIdle: typeof waitForNetworkIdle, waitForCPUIdle: typeof waitForCPUIdle}} [_waitForTestOverrides]
 */

/**
 * Returns a promise that resolves immediately.
 * Used for placeholder conditions that we don't want to start waiting for just yet, but still want
 * to satisfy the same interface.
 * @return {{promise: Promise<void>, cancel: function(): void}}
 */
function waitForNothing() {
  return {promise: Promise.resolve(), cancel() {}};
}

/**
 * Returns a promise that resolve when a frame has been navigated.
 * Used for detecting that our about:blank reset has been completed.
 * @param {LH.Gatherer.ProtocolSession} session
 * @return {CancellableWait<LH.Crdp.Page.FrameNavigatedEvent>}
 */
function waitForFrameNavigated(session) {
  /** @type {(() => void)} */
  let cancel = () => {
    throw new Error('waitForFrameNavigated.cancel() called before it was defined');
  };

  /** @type {Promise<LH.Crdp.Page.FrameNavigatedEvent>} */
  const promise = new Promise((resolve, reject) => {
    session.once('Page.frameNavigated', resolve);
    cancel = () => {
      session.off('Page.frameNavigated', resolve);
      reject(new Error('Wait for navigated cancelled'));
    };
  });

  return {promise, cancel};
}

/**
 * Returns a promise that resolve when a frame has a FCP.
 * @param {LH.Gatherer.ProtocolSession} session
 * @param {number} pauseAfterFcpMs
 * @param {number} maxWaitForFcpMs
 * @return {CancellableWait}
 */
function waitForFcp(session, pauseAfterFcpMs, maxWaitForFcpMs) {
  /** @type {(() => void)} */
  let cancel = () => {
    throw new Error('waitForFcp.cancel() called before it was defined');
  };

  /** @type {Promise<void>} */
  const promise = new Promise((resolve, reject) => {
    const maxWaitTimeout = setTimeout(() => {
      reject(new LighthouseError(LighthouseError.errors.NO_FCP));
    }, maxWaitForFcpMs);
    /** @type {NodeJS.Timeout|undefined} */
    let loadTimeout;

    /** @param {LH.Crdp.Page.LifecycleEventEvent} e */
    const lifecycleListener = e => {
      if (e.name === 'firstContentfulPaint') {
        loadTimeout = setTimeout(() => {
          resolve();
          cancel();
        }, pauseAfterFcpMs);
      }
    };

    session.on('Page.lifecycleEvent', lifecycleListener);

    let canceled = false;
    cancel = () => {
      if (canceled) return;
      canceled = true;
      session.off('Page.lifecycleEvent', lifecycleListener);
      maxWaitTimeout && clearTimeout(maxWaitTimeout);
      loadTimeout && clearTimeout(loadTimeout);
      reject(new Error('Wait for FCP canceled'));
    };
  });

  return {
    promise,
    cancel,
  };
}

/**
 * Returns a promise that resolves when the network has been idle (after DCL) for
 * `networkQuietThresholdMs` ms and a method to cancel internal network listeners/timeout.
 * @param {LH.Gatherer.ProtocolSession} session
 * @param {NetworkMonitor} networkMonitor
 * @param {{networkQuietThresholdMs: number, busyEvent: NetworkMonitorEvent, idleEvent: NetworkMonitorEvent, isIdle(recorder: NetworkMonitor): boolean, pretendDCLAlreadyFired?: boolean}} networkQuietOptions
 * @return {CancellableWait}
 */
function waitForNetworkIdle(session, networkMonitor, networkQuietOptions) {
  let hasDCLFired = false;
  /** @type {NodeJS.Timeout|undefined} */
  let idleTimeout;
  /** @type {(() => void)} */
  let cancel = () => {
    throw new Error('waitForNetworkIdle.cancel() called before it was defined');
  };

  const {networkQuietThresholdMs, busyEvent, idleEvent, isIdle} = networkQuietOptions;

  /** @type {Promise<void>} */
  const promise = new Promise((resolve, reject) => {
    const onIdle = () => {
      // eslint-disable-next-line no-use-before-define
      networkMonitor.once(busyEvent, onBusy);
      idleTimeout = setTimeout(() => {
        cancel();
        resolve();
      }, networkQuietThresholdMs);
    };

    const onBusy = () => {
      networkMonitor.once(idleEvent, onIdle);
      idleTimeout && clearTimeout(idleTimeout);
    };

    const domContentLoadedListener = () => {
      hasDCLFired = true;
      if (isIdle(networkMonitor)) {
        onIdle();
      } else {
        onBusy();
      }
    };

    // We frequently need to debug why LH is still waiting for the page.
    // This listener is added to all network events to verbosely log what URLs we're waiting on.
    const logStatus = () => {
      if (!hasDCLFired) {
        log.verbose('waitFor', 'Waiting on DomContentLoaded');
        return;
      }

      const inflightRecords = networkMonitor.getInflightRequests();
      // If there are more than 20 inflight requests, load is still in full swing.
      // Wait until it calms down a bit to be a little less spammy.
      if (log.isVerbose() && inflightRecords.length < 20 && inflightRecords.length > 0) {
        log.verbose('waitFor', `=== Waiting on ${inflightRecords.length} requests to finish`);
        for (const record of inflightRecords) {
          log.verbose('waitFor', `Waiting on ${record.url.slice(0, 120)} to finish`);
        }
      }
    };

    networkMonitor.on('requeststarted', logStatus);
    networkMonitor.on('requestfinished', logStatus);
    networkMonitor.on(busyEvent, logStatus);

    if (!networkQuietOptions.pretendDCLAlreadyFired) {
      session.once('Page.domContentEventFired', domContentLoadedListener);
    } else {
      domContentLoadedListener();
    }

    let canceled = false;
    cancel = () => {
      if (canceled) return;
      canceled = true;
      if (idleTimeout) clearTimeout(idleTimeout);
      if (!networkQuietOptions.pretendDCLAlreadyFired) {
        session.off('Page.domContentEventFired', domContentLoadedListener);
      }
      networkMonitor.removeListener(busyEvent, onBusy);
      networkMonitor.removeListener(idleEvent, onIdle);
      networkMonitor.removeListener('requeststarted', logStatus);
      networkMonitor.removeListener('requestfinished', logStatus);
      networkMonitor.removeListener(busyEvent, logStatus);
    };
  });

  return {
    promise,
    cancel,
  };
}

/**
 * Resolves when there have been no long tasks for at least waitForCPUQuiet ms.
 * @param {LH.Gatherer.ProtocolSession} session
 * @param {number} waitForCPUQuiet
 * @return {CancellableWait}
 */
function waitForCPUIdle(session, waitForCPUQuiet) {
  if (!waitForCPUQuiet) {
    return {
      promise: Promise.resolve(),
      cancel: () => undefined,
    };
  }

  /** @type {NodeJS.Timeout|undefined} */
  let lastTimeout;
  let canceled = false;

  /**
   * @param {ExecutionContext} executionContext
   * @param {() => void} resolve
   * @return {Promise<void>}
   */
  async function checkForQuiet(executionContext, resolve) {
    if (canceled) return;
    const timeSinceLongTask =
      await executionContext.evaluate(
        checkTimeSinceLastLongTaskInPage, {args: [], useIsolation: true});
    if (canceled) return;

    if (typeof timeSinceLongTask === 'number') {
      if (timeSinceLongTask >= waitForCPUQuiet) {
        log.verbose('waitFor', `CPU has been idle for ${timeSinceLongTask} ms`);
        resolve();
      } else {
        log.verbose('waitFor', `CPU has been idle for ${timeSinceLongTask} ms`);
        const timeToWait = waitForCPUQuiet - timeSinceLongTask;
        lastTimeout = setTimeout(() => checkForQuiet(executionContext, resolve), timeToWait);
      }
    }
  }

  /** @type {(() => void)} */
  let cancel = () => {
    throw new Error('waitForCPUIdle.cancel() called before it was defined');
  };

  const executionContext = new ExecutionContext(session);
  /** @type {Promise<void>} */
  const promise = new Promise((resolve, reject) => {
    executionContext.evaluate(registerPerformanceObserverInPage, {args: [], useIsolation: true})
      .then(() => checkForQuiet(executionContext, resolve))
      .catch(reject);
    cancel = () => {
      if (canceled) return;
      canceled = true;
      if (lastTimeout) clearTimeout(lastTimeout);
      reject(new Error('Wait for CPU idle canceled'));
    };
  });

  return {
    promise,
    cancel,
  };
}

/* c8 ignore start */

/**
 * This function is executed in the page itself when the document is first loaded.
 *
 * Used by _waitForCPUIdle and executed in the context of the page, updates the ____lastLongTask
 * property on window to the end time of the last long task.
 */
function registerPerformanceObserverInPage() {
  // Do not re-register if we've already run this script.
  if (window.____lastLongTask !== undefined) return;

  window.____lastLongTask = performance.now();
  const observer = new window.PerformanceObserver(entryList => {
    const entries = entryList.getEntries();
    for (const entry of entries) {
      if (entry.entryType === 'longtask') {
        const taskEnd = entry.startTime + entry.duration;
        window.____lastLongTask = Math.max(window.____lastLongTask || 0, taskEnd);
      }
    }
  });

  observer.observe({type: 'longtask', buffered: true});
}

/**
 * This function is executed in the page itself.
 *
 * Used by _waitForCPUIdle and executed in the context of the page, returns time since last long task.
 * @return {Promise<number>}
 */
function checkTimeSinceLastLongTaskInPage() {
  // This function attempts to return the time since the last long task occurred.
  // `PerformanceObserver`s don't always immediately fire though, so we check twice with some time in
  // between to make sure nothing has happened very recently.

  // Chrome 88 introduced heavy throttling of timers which means our `setTimeout` will be executed
  // at some point farish (several hundred ms) into the future and the time at which it executes isn't
  // a reliable indicator of long task existence, instead we check if any information has changed.
  // See https://developer.chrome.com/blog/timer-throttling-in-chrome-88/
  return new Promise(resolve => {
    const firstAttemptTs = performance.now();
    const firstAttemptLastLongTaskTs = window.____lastLongTask || 0;

    setTimeout(() => {
      // We can't be sure a long task hasn't occurred since our first attempt, but if the `____lastLongTask`
      // value is the same (i.e. the perf observer didn't have any new information), we can be pretty
      // confident that the long task info was accurate *at the time of our first attempt*.
      const secondAttemptLastLongTaskTs = window.____lastLongTask || 0;
      const timeSinceLongTask =
        firstAttemptLastLongTaskTs === secondAttemptLastLongTaskTs
          ? // The time of the last long task hasn't changed, the information from our first attempt is accurate.
            firstAttemptTs - firstAttemptLastLongTaskTs
          : // The time of the last long task *did* change, we can't really trust the information we have.
            0;
      resolve(timeSinceLongTask);
    }, 150);
  });
}

/* c8 ignore stop */

/**
 * Return a promise that resolves `pauseAfterLoadMs` after the load event
 * fires and a method to cancel internal listeners and timeout.
 * @param {LH.Gatherer.ProtocolSession} session
 * @param {number} pauseAfterLoadMs
 * @return {CancellableWait}
 */
function waitForLoadEvent(session, pauseAfterLoadMs) {
  /** @type {(() => void)} */
  let cancel = () => {
    throw new Error('waitForLoadEvent.cancel() called before it was defined');
  };

  const promise = new Promise((resolve, reject) => {
    /** @type {NodeJS.Timeout|undefined} */
    let loadTimeout;
    const loadListener = function() {
      loadTimeout = setTimeout(resolve, pauseAfterLoadMs);
    };
    session.once('Page.loadEventFired', loadListener);

    let canceled = false;
    cancel = () => {
      if (canceled) return;
      canceled = true;
      session.off('Page.loadEventFired', loadListener);
      loadTimeout && clearTimeout(loadTimeout);
    };
  });

  return {
    promise,
    cancel,
  };
}

/**
 * Returns whether the page appears to be hung.
 * @param {LH.Gatherer.ProtocolSession} session
 * @return {Promise<boolean>}
 */
async function isPageHung(session) {
  try {
    session.setNextProtocolTimeout(1000);
    await session.sendCommand('Runtime.evaluate', {
      expression: '"ping"',
      returnByValue: true,
      timeout: 1000,
    });

    return false;
  } catch (err) {
    return true;
  }
}

/** @type {Required<WaitOptions>['_waitForTestOverrides']} */
const DEFAULT_WAIT_FUNCTIONS = {waitForFcp, waitForLoadEvent, waitForCPUIdle, waitForNetworkIdle};

/**
 * Returns a promise that resolves when:
 * - All of the following conditions have been met:
 *    - page has no security issues
 *    - pauseAfterLoadMs milliseconds have passed since the load event.
 *    - networkQuietThresholdMs milliseconds have passed since the last network request that exceeded
 *      2 inflight requests (network-2-quiet has been reached).
 *    - cpuQuietThresholdMs have passed since the last long task after network-2-quiet.
 * - maxWaitForLoadedMs milliseconds have passed.
 * See https://github.com/GoogleChrome/lighthouse/issues/627 for more.
 * @param {LH.Gatherer.ProtocolSession} session
 * @param {NetworkMonitor} networkMonitor
 * @param {WaitOptions} options
 * @return {Promise<{timedOut: boolean}>}
 */
async function waitForFullyLoaded(session, networkMonitor, options) {
  const {pauseAfterFcpMs, pauseAfterLoadMs, networkQuietThresholdMs,
    cpuQuietThresholdMs, maxWaitForLoadedMs, maxWaitForFcpMs} = options;
  const {waitForFcp, waitForLoadEvent, waitForNetworkIdle, waitForCPUIdle} =
    options._waitForTestOverrides || DEFAULT_WAIT_FUNCTIONS;
  /** @type {NodeJS.Timeout|undefined} */
  let maxTimeoutHandle;

  // Listener for FCP. Resolves pauseAfterFcpMs ms after first FCP event.
  const resolveOnFcp = maxWaitForFcpMs ?
    waitForFcp(session, pauseAfterFcpMs, maxWaitForFcpMs) :
    waitForNothing();
  // Listener for onload. Resolves pauseAfterLoadMs ms after load.
  const resolveOnLoadEvent = waitForLoadEvent(session, pauseAfterLoadMs);
  // General network listener. Resolves when the network has been 2-idle for networkQuietThresholdMs.
  const resolveOnNetworkIdle = waitForNetworkIdle(session, networkMonitor, {
    networkQuietThresholdMs,
    busyEvent: 'network-2-busy',
    idleEvent: 'network-2-idle',
    isIdle: recorder => recorder.is2Idle(),
  });
  // Critical network listener. Resolves when the network has had 0 critical requests for networkQuietThresholdMs.
  const resolveOnCriticalNetworkIdle = waitForNetworkIdle(session, networkMonitor, {
    networkQuietThresholdMs,
    busyEvent: 'network-critical-busy',
    idleEvent: 'network-critical-idle',
    isIdle: recorder => recorder.isCriticalIdle(),
  });
  // CPU listener. Resolves when the CPU has been idle for cpuQuietThresholdMs after network idle.
  let resolveOnCPUIdle = waitForNothing();

  if (log.isVerbose()) {
    resolveOnFcp.promise.then(() => {
      log.verbose('waitFor', 'resolveOnFcp fired');
    });
    resolveOnLoadEvent.promise.then(() => {
      log.verbose('waitFor', 'resolveOnLoadEvent fired');
    });
    resolveOnNetworkIdle.promise.then(() => {
      log.verbose('waitFor', 'resolveOnNetworkIdle fired');
    });
    resolveOnCriticalNetworkIdle.promise.then(() => {
      log.verbose('waitFor', 'resolveOnCriticalNetworkIdle fired');
    });
  }

  // Wait for all initial load promises. Resolves on cleanup function the clears load
  // timeout timer.
  /** @type {Promise<() => Promise<{timedOut: boolean}>>} */
  const loadPromise = Promise.all([
    resolveOnFcp.promise,
    resolveOnLoadEvent.promise,
    resolveOnNetworkIdle.promise,
    resolveOnCriticalNetworkIdle.promise,
  ]).then(() => {
    resolveOnCPUIdle = waitForCPUIdle(session, cpuQuietThresholdMs);
    return resolveOnCPUIdle.promise;
  }).then(() => {
    /** @return {Promise<{timedOut: boolean}>} */
    const cleanupFn = async function() {
      log.verbose('waitFor', 'loadEventFired and network considered idle');
      return {timedOut: false};
    };

    return cleanupFn;
  }).catch(err => {
    // Throw the error in the cleanupFn so we still cleanup all our handlers.
    return function() {
      throw err;
    };
  });

  // Last resort timeout. Resolves maxWaitForLoadedMs ms from now on
  // cleanup function that removes loadEvent and network idle listeners.
  /** @type {Promise<() => Promise<{timedOut: boolean}>>} */
  const maxTimeoutPromise = new Promise((resolve, reject) => {
    maxTimeoutHandle = setTimeout(resolve, maxWaitForLoadedMs);
  }).then(_ => {
    return async () => {
      log.warn('waitFor', 'Timed out waiting for page load. Checking if page is hung...');
      if (await isPageHung(session)) {
        log.warn('waitFor', 'Page appears to be hung, killing JavaScript...');
        // We don't await these, as we want to exit with PAGE_HUNG
        void session.sendCommandAndIgnore('Emulation.setScriptExecutionDisabled', {value: true});
        void session.sendCommandAndIgnore('Runtime.terminateExecution');
        throw new LighthouseError(LighthouseError.errors.PAGE_HUNG);
      }

      // Log remaining inflight requests if any.
      const inflightRequestUrls = networkMonitor
        .getInflightRequests()
        .map((request) => request.url);
      if (inflightRequestUrls.length > 0) {
        log.warn(
          'waitFor',
          'Remaining inflight requests URLs',
          inflightRequestUrls
        );
      }

      return {timedOut: true};
    };
  });

  // Wait for load or timeout and run the cleanup function the winner returns.
  const cleanupFn = await Promise.race([
    loadPromise,
    maxTimeoutPromise,
  ]);

  maxTimeoutHandle && clearTimeout(maxTimeoutHandle);
  resolveOnFcp.cancel();
  resolveOnLoadEvent.cancel();
  resolveOnNetworkIdle.cancel();
  resolveOnCPUIdle.cancel();

  return cleanupFn();
}

/**
 * @param {LH.Gatherer.Driver} driver
 */
function waitForUserToContinue(driver) {
  /* c8 ignore start */
  function createInPagePromise() {
    let resolve = () => {};
    /** @type {Promise<void>} */
    const promise = new Promise(r => resolve = r);

    // eslint-disable-next-line no-console
    console.log([
      `You have enabled Lighthouse navigation debug mode.`,
      `When you have finished inspecting the page, evaluate "continueLighthouseRun()"`,
      `in the console to continue with the Lighthouse run.`,
    ].join(' '));

    window.continueLighthouseRun = resolve;
    return promise;
  }
  /* c8 ignore stop */

  driver.defaultSession.setNextProtocolTimeout(Infinity);
  return driver.executionContext.evaluate(createInPagePromise, {args: []});
}

export {
  waitForNothing,
  waitForFrameNavigated,
  waitForFcp,
  waitForLoadEvent,
  waitForNetworkIdle,
  waitForCPUIdle,
  waitForFullyLoaded,
  waitForUserToContinue,
};
