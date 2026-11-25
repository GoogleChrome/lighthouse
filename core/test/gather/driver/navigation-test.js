/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {createMockDriver} from '../mock-driver.js';
import {
  makePromiseInspectable,
  flushAllTimersAndMicrotasks,
  timers,
} from '../../test-utils.js';

// Some imports needs to be done dynamically, so that their dependencies will be mocked.
// https://github.com/GoogleChrome/lighthouse/blob/main/docs/hacking-tips.md#mocking-modules-with-testdouble
const {gotoURL, getNavigationWarnings} = await import('../../../gather/driver/navigation.js');

describe('.gotoURL', () => {
  before(() => timers.useFakeTimers());
  after(() => timers.dispose());

  /** @type {LH.Gatherer.Driver} */
  let driver;
  /** @type {ReturnType<typeof createMockDriver>} */
  let mockDriver;

  beforeEach(() => {
    mockDriver = createMockDriver();
    driver = mockDriver.asDriver();

    mockDriver.defaultSession.sendCommand
      .mockResponse('Page.enable') // network monitor's Page.enable
      .mockResponse('Network.enable')
      .mockResponse('Page.enable') // gotoURL's Page.enable
      .mockResponse('Page.setLifecycleEventsEnabled')
      .mockResponse('Page.navigate')
      .mockResponse('Runtime.evaluate');
  });

  it('will track redirects through gotoURL load with warning', async () => {
    mockDriver.defaultSession.on = mockDriver.defaultSession.once;
    await driver.networkMonitor.enable();

    const url = 'http://example.com';

    const loadPromise = makePromiseInspectable(gotoURL(driver, url, {waitUntil: ['navigated']}));
    await flushAllTimersAndMicrotasks();
    expect(loadPromise).not.toBeDone('Did not wait for frameNavigated');

    // Use `getListeners` instead of `mockEvent` so we can control exactly when the promise resolves
    // The first listener is from the network monitor and the second is from the load watcher.
    const mockOn = mockDriver.defaultSession.on;
    const [networkMonitorListener, loadListener] = mockOn.getListeners('Page.frameNavigated');

    /** @param {LH.Crdp.Page.Frame} frame */
    const navigate = frame => networkMonitorListener({frame});
    const baseFrame = {
      id: 'ABC',
      loaderId: '',
      securityOrigin: '',
      mimeType: 'text/html',
      domainAndRegistry: '',
      secureContextType: /** @type {const} */ ('Secure'),
      crossOriginIsolatedContextType: /** @type {const} */ ('Isolated'),
      gatedAPIFeatures: [],
    };
    navigate({...baseFrame, url: 'http://example.com'});
    navigate({...baseFrame, url: 'https://example.com'});
    navigate({...baseFrame, url: 'https://www.example.com'});
    navigate({...baseFrame, url: 'https://m.example.com'});
    navigate({...baseFrame, id: 'ad1', url: 'https://frame-a.example.com', parentId: 'ABC'});
    navigate({...baseFrame, url: 'https://m.example.com/client'});
    navigate({...baseFrame, id: 'ad2', url: 'https://frame-b.example.com', parentId: 'ABC'});
    navigate({...baseFrame, id: 'ad3', url: 'https://frame-c.example.com', parentId: 'ABC'});

    loadListener(baseFrame);
    await flushAllTimersAndMicrotasks();
    expect(loadPromise).toBeDone('Did not resolve after frameNavigated');

    const results = await loadPromise;
    expect(results.requestedUrl).toEqual('http://example.com');
    expect(results.mainDocumentUrl).toEqual('https://m.example.com/client');
    expect(results.warnings).toMatchObject([
      {
        values: {
          requested: 'http://example.com',
          final: 'https://m.example.com/client',
        },
      },
    ]);
  });

  it('backfills requestedUrl when using a callback requestor', async () => {
    mockDriver.defaultSession.on = mockDriver.defaultSession.once;
    await driver.networkMonitor.enable();

    const requestor = () => Promise.resolve();

    const loadPromise = makePromiseInspectable(
      gotoURL(driver, requestor, {waitUntil: ['navigated']})
    );
    await flushAllTimersAndMicrotasks();
    const listeners = mockDriver.defaultSession.on.getListeners('Page.frameNavigated');
    for (const listener of listeners) {
      listener({frame: {id: 'ABC', url: 'https://www.example.com'}});
    }

    const results = await loadPromise;
    expect(results.requestedUrl).toEqual('https://www.example.com');
    expect(results.mainDocumentUrl).toEqual('https://www.example.com');
  });

  it('throws if no navigations found using a callback requestor', async () => {
    mockDriver.defaultSession.on = mockDriver.defaultSession.once;
    await driver.networkMonitor.enable();

    const requestor = () => Promise.resolve();

    const loadPromise = makePromiseInspectable(
      gotoURL(driver, requestor, {waitUntil: ['navigated']})
    );
    await flushAllTimersAndMicrotasks();

    // Trigger the load listener, but not the network monitor or soft navigation watcher ones.
    const listeners = mockDriver.defaultSession.on.getListeners('Page.frameNavigated');
    const listener = listeners[listeners.length - 1];
    listener({frame: {id: 'ABC', url: 'https://www.example.com'}});

    await expect(loadPromise).rejects.toThrow(
      'No navigations detected when running user defined requestor.'
    );
  });

  describe('soft navigations with a callback requestor', () => {
    /** @param {LH.Crdp.Page.NavigatedWithinDocumentEvent} event */
    const navigateWithinDocument = event => {
      const listeners = mockDriver.defaultSession.on.getListeners('Page.navigatedWithinDocument');
      expect(listeners.length).toBeGreaterThan(0);
      for (const listener of listeners) listener(event);
    };

    /** @param {{frame: {id: string, url: string, parentId?: string}}} event */
    const frameNavigated = event => {
      const listeners = mockDriver.defaultSession.on.getListeners('Page.frameNavigated');
      for (const listener of listeners) listener(event);
    };

    it('fails fast when the callback only performs a same-document navigation', async () => {
      mockDriver.defaultSession.on = mockDriver.defaultSession.once;
      await driver.networkMonitor.enable();

      const requestor = () => Promise.resolve();

      const loadPromise = makePromiseInspectable(
        gotoURL(driver, requestor, {waitUntil: ['navigated']})
      );
      await flushAllTimersAndMicrotasks();
      navigateWithinDocument({frameId: 'ABC', url: 'https://www.example.com/#/route', navigationType: 'historyApi'});

      await flushAllTimersAndMicrotasks(2000);
      expect(loadPromise).not.toBeDone('Did not wait for the grace period');

      await flushAllTimersAndMicrotasks(2000);
      expect(loadPromise).toBeDone('Did not fail after the grace period');
      await expect(loadPromise).rejects.toMatchObject({code: 'SOFT_NAVIGATION_NOT_SUPPORTED'});
      expect(mockDriver.defaultSession.off).toHaveBeenCalledWith(
        'Page.navigatedWithinDocument', expect.anything()
      );
    });

    it('does not start the grace period until the callback settles', async () => {
      mockDriver.defaultSession.on = mockDriver.defaultSession.once;
      await driver.networkMonitor.enable();

      /** @type {() => void} */
      let settleRequestor = () => {};
      /** @return {Promise<void>} */
      const requestor = () => new Promise(resolve => {
        settleRequestor = () => resolve();
      });

      const loadPromise = makePromiseInspectable(
        gotoURL(driver, requestor, {waitUntil: ['navigated']})
      );
      await flushAllTimersAndMicrotasks();
      navigateWithinDocument({frameId: 'ABC', url: 'https://www.example.com/#/route', navigationType: 'historyApi'});

      await flushAllTimersAndMicrotasks(5000);
      expect(loadPromise).not.toBeDone('Failed before the callback settled');

      settleRequestor();
      await flushAllTimersAndMicrotasks(5000);
      await expect(loadPromise).rejects.toMatchObject({code: 'SOFT_NAVIGATION_NOT_SUPPORTED'});
    });

    it('succeeds when a same-document navigation is followed by a full navigation', async () => {
      mockDriver.defaultSession.on = mockDriver.defaultSession.once;
      await driver.networkMonitor.enable();

      const requestor = () => Promise.resolve();

      const loadPromise = makePromiseInspectable(
        gotoURL(driver, requestor, {waitUntil: ['navigated']})
      );
      await flushAllTimersAndMicrotasks();
      navigateWithinDocument({frameId: 'ABC', url: 'https://www.example.com/#/route', navigationType: 'historyApi'});
      await flushAllTimersAndMicrotasks(1000);
      frameNavigated({frame: {id: 'ABC', url: 'https://www.example.com/next'}});

      const results = await loadPromise;
      expect(results.requestedUrl).toEqual('https://www.example.com/next');
      expect(results.mainDocumentUrl).toEqual('https://www.example.com/next');
    });

    it('ignores same-document navigations once the main frame has navigated', async () => {
      mockDriver.defaultSession.on = mockDriver.defaultSession.once;
      await driver.networkMonitor.enable();

      const requestor = () => Promise.resolve();

      const loadPromise = makePromiseInspectable(
        gotoURL(driver, requestor, {waitUntil: ['navigated']})
      );
      await flushAllTimersAndMicrotasks();
      frameNavigated({frame: {id: 'ABC', url: 'https://www.example.com/next'}});
      // Pages commonly call `history.replaceState` during load.
      navigateWithinDocument({frameId: 'ABC', url: 'https://www.example.com/next?canonical', navigationType: 'historyApi'});
      await flushAllTimersAndMicrotasks(5000);

      const results = await loadPromise;
      expect(results.requestedUrl).toEqual('https://www.example.com/next');
    });

    it('reports a soft navigation instead of NO_FCP when the FCP wait times out', async () => {
      mockDriver.defaultSession.on = mockDriver.defaultSession.once;
      await driver.networkMonitor.enable();

      // A callback that never settles (e.g. `startNavigation` without `endNavigation`).
      const requestor = () => new Promise(() => {});

      const loadPromise = makePromiseInspectable(
        gotoURL(driver, requestor, {
          waitUntil: ['fcp', 'load'],
          maxWaitForFcp: 5000,
          maxWaitForLoad: 10000,
        })
      );
      await flushAllTimersAndMicrotasks();
      navigateWithinDocument({frameId: 'ABC', url: 'https://www.example.com/#/route', navigationType: 'historyApi'});

      await flushAllTimersAndMicrotasks(6000);
      await expect(loadPromise).rejects.toMatchObject({code: 'SOFT_NAVIGATION_NOT_SUPPORTED'});
    });

    it('reports a soft navigation instead of no navigations detected', async () => {
      mockDriver.defaultSession.on = mockDriver.defaultSession.once;
      await driver.networkMonitor.enable();

      // A callback that never settles (e.g. `startNavigation` without `endNavigation`).
      const requestor = () => new Promise(() => {});

      const loadPromise = makePromiseInspectable(
        gotoURL(driver, requestor, {waitUntil: ['navigated']})
      );
      await flushAllTimersAndMicrotasks();
      navigateWithinDocument({frameId: 'ABC', url: 'https://www.example.com/#/route', navigationType: 'historyApi'});

      // Trigger the load listener, but not the network monitor or soft navigation watcher ones.
      const listeners = mockDriver.defaultSession.on.getListeners('Page.frameNavigated');
      listeners[listeners.length - 1]({frame: {id: 'ABC', url: 'https://www.example.com'}});

      await expect(loadPromise).rejects.toMatchObject({code: 'SOFT_NAVIGATION_NOT_SUPPORTED'});
    });
  });

  it('does not add warnings when URLs are equal', async () => {
    mockDriver.defaultSession.on = mockDriver.defaultSession.once;
    await driver.networkMonitor.enable();

    const url = 'https://www.example.com';

    const loadPromise = makePromiseInspectable(gotoURL(driver, url, {waitUntil: ['navigated']}));
    await flushAllTimersAndMicrotasks();
    const [_, listener] = mockDriver.defaultSession.on.getListeners('Page.frameNavigated');
    listener({frame: {url: 'https://www.example.com'}});
    await flushAllTimersAndMicrotasks();
    expect(loadPromise).toBeDone('Did not resolve after frameNavigated');

    const {warnings} = await loadPromise;
    expect(warnings).toEqual([]);
  });

  it('waits for Page.frameNavigated', async () => {
    mockDriver.defaultSession.on = mockDriver.defaultSession.once;
    await driver.networkMonitor.enable();

    const url = 'https://www.example.com';

    const loadPromise = makePromiseInspectable(gotoURL(driver, url, {waitUntil: ['navigated']}));
    await flushAllTimersAndMicrotasks();
    expect(loadPromise).not.toBeDone('Did not wait for frameNavigated');

    // Use `getListeners` instead of `mockEvent` so we can control exactly when the promise resolves
    const [_, listener] = mockDriver.defaultSession.on.getListeners('Page.frameNavigated');
    listener({frame: {url: 'https://www.example.com'}});
    await flushAllTimersAndMicrotasks();
    expect(loadPromise).toBeDone('Did not resolve after frameNavigated');

    await loadPromise;
  });

  it('waits for page load', async () => {
    mockDriver.defaultSession.on = mockDriver.defaultSession.once;
    await driver.networkMonitor.enable();

    const url = 'https://www.example.com';

    const loadPromise = makePromiseInspectable(gotoURL(driver, url, {
      waitUntil: ['load', 'navigated'],
      cpuQuietThresholdMs: 0,
      networkQuietThresholdMs: 0,
    }));
    await flushAllTimersAndMicrotasks();
    expect(loadPromise).not.toBeDone('Did not wait for frameNavigated/load');

    // Use `getListeners` instead of `mockEvent` so we can control exactly when the promise resolves
    const [_, navigatedListener] = mockDriver.defaultSession.on.getListeners('Page.frameNavigated');
    navigatedListener({frame: {url: 'https://www.example.com'}});
    await flushAllTimersAndMicrotasks();
    expect(loadPromise).not.toBeDone('Did not wait for load');

    const dclListeners = mockDriver.defaultSession.on.getListeners('Page.domContentEventFired');
    const [loadListener] = mockDriver.defaultSession.on.getListeners('Page.loadEventFired');
    for (const listener of dclListeners) listener();
    loadListener();
    await flushAllTimersAndMicrotasks();
    expect(loadPromise).toBeDone('Did not resolve after load');

    await loadPromise;
  });

  it('waits for page FCP', async () => {
    mockDriver.defaultSession.on = mockDriver.defaultSession.once;
    await driver.networkMonitor.enable();

    const url = 'https://www.example.com';

    const loadPromise = makePromiseInspectable(gotoURL(driver, url, {
      waitUntil: ['load', 'navigated', 'fcp'],
      cpuQuietThresholdMs: 0,
      networkQuietThresholdMs: 0,
    }));
    await flushAllTimersAndMicrotasks();
    expect(loadPromise).not.toBeDone('Did not wait for frameNavigated/load/fcp');

    // Use `getListeners` instead of `mockEvent` so we can control exactly when the promise resolves
    const [_, navigatedListener] = mockDriver.defaultSession.on.getListeners('Page.frameNavigated');
    navigatedListener({frame: {url: 'https://www.example.com'}});
    await flushAllTimersAndMicrotasks();
    expect(loadPromise).not.toBeDone('Did not wait for load/fcp');

    const dclListeners = mockDriver.defaultSession.on.getListeners('Page.domContentEventFired');
    const [loadListener] = mockDriver.defaultSession.on.getListeners('Page.loadEventFired');
    for (const listener of dclListeners) listener();
    loadListener();
    await flushAllTimersAndMicrotasks();
    expect(loadPromise).not.toBeDone('Did not wait for fcp');

    const [fcpListener] = mockDriver.defaultSession.on.getListeners('Page.lifecycleEvent');
    fcpListener({name: 'firstContentfulPaint'});
    await flushAllTimersAndMicrotasks();
    expect(loadPromise).toBeDone('Did not resolve after fcp');

    await loadPromise;
  });

  it('throws when asked to wait for FCP without waiting for load', async () => {
    mockDriver.defaultSession.on = mockDriver.defaultSession.once;
    await driver.networkMonitor.enable();

    const url = 'https://www.example.com';

    const loadPromise = makePromiseInspectable(gotoURL(driver, url, {waitUntil: ['fcp']}));
    await flushAllTimersAndMicrotasks();
    await expect(loadPromise).rejects.toMatchObject({
      message: 'Cannot wait for FCP without waiting for page load',
    });
  });

  it('aborts when signal is already aborted before gotoURL is called', async () => {
    mockDriver.defaultSession.on = mockDriver.defaultSession.once;
    await driver.networkMonitor.enable();

    const url = 'https://www.example.com';
    const controller = new AbortController();
    controller.abort();

    const loadPromise = makePromiseInspectable(
      gotoURL(driver, url, {waitUntil: ['navigated'], signal: controller.signal})
    );

    await expect(loadPromise).rejects.toThrow('This operation was aborted');
  });

  it('aborts when signal is aborted before wait conditions resolve', async () => {
    mockDriver.defaultSession.on = mockDriver.defaultSession.once;
    await driver.networkMonitor.enable();

    const url = 'https://www.example.com';
    const controller = new AbortController();

    const loadPromise = makePromiseInspectable(
      gotoURL(driver, url, {waitUntil: ['navigated'], signal: controller.signal})
    );
    await flushAllTimersAndMicrotasks();
    expect(loadPromise).not.toBeDone('Did not wait for frameNavigated');

    controller.abort();
    await flushAllTimersAndMicrotasks();

    await expect(loadPromise).rejects.toThrow('Navigation aborted by signal');
  });

  it('aborts when signal is aborted while waiting for navigated', async () => {
    mockDriver.defaultSession.on = mockDriver.defaultSession.once;
    await driver.networkMonitor.enable();

    const url = 'https://www.example.com';
    const controller = new AbortController();

    const loadPromise = makePromiseInspectable(
      gotoURL(driver, url, {waitUntil: ['navigated', 'load'], signal: controller.signal})
    );
    await flushAllTimersAndMicrotasks();
    expect(loadPromise).not.toBeDone('Did not wait for frameNavigated/load');

    // Simulate navigation resolving
    const [_, navigatedListener] = mockDriver.defaultSession.on.getListeners('Page.frameNavigated');
    navigatedListener({frame: {url: 'https://www.example.com'}});
    await flushAllTimersAndMicrotasks();
    expect(loadPromise).not.toBeDone('Did not wait for load');

    // Abort before load happens
    controller.abort();
    await flushAllTimersAndMicrotasks();

    await expect(loadPromise).rejects.toThrow('Navigation aborted by signal');
  });
});

describe('.getNavigationWarnings()', () => {
  const normalNavigation = {
    timedOut: false,
    requestedUrl: 'http://example.com/',
    mainDocumentUrl: 'http://example.com/',
  };

  it('finds no warnings by default', () => {
    const warnings = getNavigationWarnings(normalNavigation);
    expect(warnings).toHaveLength(0);
  });

  it('adds a timeout warning', () => {
    const warnings = getNavigationWarnings({...normalNavigation, timedOut: true});
    expect(warnings).toHaveLength(1);
  });

  it('adds a url mismatch warning', () => {
    const mainDocumentUrl = 'https://m.example.com/client';
    const warnings = getNavigationWarnings({...normalNavigation, mainDocumentUrl});
    expect(warnings).toMatchObject([
      {
        values: {
          requested: 'http://example.com/',
          final: mainDocumentUrl,
        },
      },
    ]);
  });

  it('does not add a url mismatch warning for fragment differences', () => {
    const mainDocumentUrl = 'http://example.com/#fragment';
    const warnings = getNavigationWarnings({...normalNavigation, mainDocumentUrl});
    expect(warnings).toHaveLength(0);
  });

  it('adds a url mismatch warning for failed navigations', () => {
    const mainDocumentUrl = 'chrome-error://chromewebdata/';
    const warnings = getNavigationWarnings({...normalNavigation, mainDocumentUrl});
    expect(warnings).toHaveLength(1);
  });
});
