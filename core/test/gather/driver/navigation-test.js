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

    // Trigger the load listener, but not the network monitor one.
    const [_, listener] = mockDriver.defaultSession.on.getListeners('Page.frameNavigated');
    listener({frame: {id: 'ABC', url: 'https://www.example.com'}});

    await expect(loadPromise).rejects.toThrow(
      'No navigations detected when running user defined requestor.'
    );
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
