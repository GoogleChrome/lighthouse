/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as td from 'testdouble';

import {createMockSession, createMockDriver} from '../mock-driver.js';
import {flushAllTimersAndMicrotasks, fnAny, timers} from '../../test-utils.js';

const storageMock = {
  clearDataForOrigin: fnAny(),
  clearBrowserCaches: fnAny(),
  getImportantStorageWarning: fnAny(),
};
await td.replaceEsm('../../../gather/driver/storage.js', storageMock);

// Some imports needs to be done dynamically, so that their dependencies will be mocked.
// https://github.com/GoogleChrome/lighthouse/blob/main/docs/hacking-tips.md#mocking-modules-with-testdouble
const prepare = await import('../../../gather/driver/prepare.js');
const constants = await import('../../../config/constants.js');

const url = 'https://example.com';
let sessionMock = createMockSession();

beforeEach(() => {
  sessionMock = createMockSession();
  sessionMock.sendCommand
    .mockResponse('Network.emulateNetworkConditions')
    .mockResponse('Emulation.setCPUThrottlingRate')
    .mockResponse('Network.setBlockedURLs')
    .mockResponse('Network.setExtraHTTPHeaders');
  storageMock.clearDataForOrigin.mockReset();
  storageMock.clearDataForOrigin.mockReturnValue([]);
  storageMock.clearBrowserCaches.mockReset();
  storageMock.clearBrowserCaches.mockReturnValue([]);
  storageMock.getImportantStorageWarning.mockReset();
});

describe('.prepareThrottlingAndNetwork()', () => {
  it('sets throttling appropriately', async () => {
    await prepare.prepareThrottlingAndNetwork(
      sessionMock.asSession(),
      {
        ...constants.defaultSettings,
        throttlingMethod: 'devtools',
        throttling: {
          ...constants.defaultSettings.throttling,
          requestLatencyMs: 100,
          downloadThroughputKbps: 8,
          uploadThroughputKbps: 8,
          cpuSlowdownMultiplier: 2,
        },
      }
    );

    expect(sessionMock.sendCommand.findInvocation('Network.emulateNetworkConditions')).toEqual({
      latency: 100,
      downloadThroughput: 1024,
      uploadThroughput: 1024,
      offline: false,
    });
    expect(sessionMock.sendCommand.findInvocation('Emulation.setCPUThrottlingRate')).toEqual({
      rate: 2,
    });
  });

  it('disables throttling', async () => {
    await prepare.prepareThrottlingAndNetwork(
      sessionMock.asSession(),
      {
        ...constants.defaultSettings,
        throttlingMethod: 'provided',
        throttling: {
          ...constants.defaultSettings.throttling,
          requestLatencyMs: 100,
          downloadThroughputKbps: 8,
          uploadThroughputKbps: 8,
          cpuSlowdownMultiplier: 2,
        },
      }
    );

    expect(sessionMock.sendCommand.findInvocation('Network.emulateNetworkConditions')).toEqual({
      latency: 0,
      downloadThroughput: 0,
      uploadThroughput: 0,
      offline: false,
    });

    // CPU throttling is intentionally not cleared.
    expect(sessionMock.sendCommand.findAllInvocations('Emulation.setCPUThrottlingRate'))
      .toHaveLength(0);
  });

  it('unsets url patterns when empty', async () => {
    await prepare.prepareThrottlingAndNetwork(
      sessionMock.asSession(),
      {
        ...constants.defaultSettings,
        blockedUrlPatterns: null,
      }
    );

    expect(sessionMock.sendCommand.findInvocation('Network.setBlockedURLs')).toEqual({
      urls: [],
    });
  });

  it('blocks url patterns', async () => {
    await prepare.prepareThrottlingAndNetwork(
      sessionMock.asSession(),
      {
        ...constants.defaultSettings,
        blockedUrlPatterns: ['https://a.example.com'],
      }
    );

    expect(sessionMock.sendCommand.findInvocation('Network.setBlockedURLs')).toEqual({
      urls: ['https://a.example.com'],
    });
  });

  it('sets extraHeaders', async () => {
    await prepare.prepareThrottlingAndNetwork(
      sessionMock.asSession(),
      {...constants.defaultSettings, extraHeaders: {'Cookie': 'monster', 'x-men': 'wolverine'}}
    );

    expect(sessionMock.sendCommand.findInvocation('Network.setExtraHTTPHeaders')).toEqual({
      headers: {
        'Cookie': 'monster',
        'x-men': 'wolverine',
      },
    });
  });
});

describe('.prepareTargetForNavigationMode()', () => {
  let driverMock = createMockDriver();
  let requestor = fnAny();

  beforeEach(() => {
    driverMock = createMockDriver();
    sessionMock = driverMock._session;

    sessionMock.sendCommand
      .mockResponse('Network.enable')
      .mockResponse('Network.setUserAgentOverride')
      .mockResponse('Network.emulateNetworkConditions')
      .mockResponse('Network.setBlockedURLs')
      .mockResponse('Emulation.setCPUThrottlingRate')
      .mockResponse('Emulation.setDeviceMetricsOverride')
      .mockResponse('Emulation.setTouchEmulationEnabled')
      .mockResponse('Debugger.enable')
      .mockResponse('Debugger.setSkipAllPauses')
      .mockResponse('Debugger.setAsyncCallStackDepth')
      .mockResponse('Page.enable');

    requestor = fnAny();
  });

  it('emulates the target device', async () => {
    await prepare.prepareTargetForNavigationMode(driverMock.asDriver(), {
      ...constants.defaultSettings,
      screenEmulation: {
        disabled: false,
        mobile: true,
        deviceScaleFactor: 2,
        width: 200,
        height: 300,
      },
    }, requestor);

    expect(sessionMock.sendCommand.findInvocation('Emulation.setDeviceMetricsOverride')).toEqual({
      mobile: true,
      deviceScaleFactor: 2,
      width: 200,
      height: 300,
    });
  });

  it('cache natives on new document', async () => {
    await prepare.prepareTargetForNavigationMode(driverMock.asDriver(), {
      ...constants.defaultSettings,
    }, requestor);

    expect(driverMock._executionContext.cacheNativesOnNewDocument).toHaveBeenCalled();
  });

  it('install rIC shim on simulated throttling', async () => {
    await prepare.prepareTargetForNavigationMode(driverMock.asDriver(), {
      ...constants.defaultSettings,
      throttlingMethod: 'simulate',
    }, requestor);

    const invocations = driverMock._executionContext.evaluateOnNewDocument.mock.calls;
    if (!invocations.length) expect(invocations).toHaveLength(1);
    const matchingInvocations = invocations.filter(argList =>
      argList[0].toString().includes('requestIdleCallback')
    );
    if (!matchingInvocations.length) expect(invocations).toContain('An item shimming rIC');
  });

  it('not install rIC shim on devtools throttling', async () => {
    await prepare.prepareTargetForNavigationMode(driverMock.asDriver(), {
      ...constants.defaultSettings,
      throttlingMethod: 'devtools',
    }, requestor);

    const invocations = driverMock._executionContext.evaluateOnNewDocument.mock.calls;
    const matchingInvocations = invocations.filter(argList =>
      argList[0].toString().includes('requestIdleCallback')
    );
    expect(matchingInvocations).toHaveLength(0);
  });

  it('handle javascript dialogs automatically', async () => {
    timers.useFakeTimers();
    after(() => timers.dispose());

    sessionMock.sendCommand.mockResponse('Page.handleJavaScriptDialog');
    sessionMock.on.mockEvent('Page.javascriptDialogOpening', {type: 'confirm'});

    await prepare.prepareTargetForNavigationMode(driverMock.asDriver(), {
      ...constants.defaultSettings,
    }, requestor);

    await flushAllTimersAndMicrotasks();

    expect(sessionMock.sendCommand).toHaveBeenCalledWith('Page.handleJavaScriptDialog', {
      accept: true,
      promptText: 'Lighthouse prompt response',
    });
  });

  it('clears storage when not disabled', async () => {
    await prepare.prepareTargetForNavigationMode(driverMock.asDriver(), {
      ...constants.defaultSettings,
      disableStorageReset: false,
    }, url);

    expect(storageMock.clearDataForOrigin).toHaveBeenCalled();
    expect(storageMock.clearBrowserCaches).toHaveBeenCalled();
  });

  it('clears storage types specified by user', async () => {
    await prepare.prepareTargetForNavigationMode(driverMock.asDriver(), {
      ...constants.defaultSettings,
      disableStorageReset: false,
      clearStorageTypes: ['cookies', 'shared_storage']},
      url);

    expect(storageMock.clearDataForOrigin).toHaveBeenCalledWith(expect.anything(),
      url,
      ['cookies', 'shared_storage']);
    expect(storageMock.clearBrowserCaches).toHaveBeenCalled();
  });

  it('does not clear storage when globally disabled', async () => {
    await prepare.prepareTargetForNavigationMode(driverMock.asDriver(), {
      ...constants.defaultSettings,
      disableStorageReset: true,
    }, url);

    expect(storageMock.clearDataForOrigin).not.toHaveBeenCalled();
    expect(storageMock.clearBrowserCaches).not.toHaveBeenCalled();
  });

  it('does not clear storage when given a callback requestor', async () => {
    await prepare.prepareTargetForNavigationMode(driverMock.asDriver(), {
      ...constants.defaultSettings,
      disableStorageReset: false,
    }, requestor);

    expect(storageMock.clearDataForOrigin).not.toHaveBeenCalled();
    expect(storageMock.clearBrowserCaches).not.toHaveBeenCalled();
  });

  it('collects storage warnings', async () => {
    storageMock.getImportantStorageWarning.mockResolvedValue('This is a storage warning');
    storageMock.clearDataForOrigin.mockResolvedValue(['This is a clear data warning']);
    storageMock.clearBrowserCaches.mockResolvedValue(['This is a clear cache warning']);
    const {warnings} = await prepare.prepareTargetForNavigationMode(driverMock.asDriver(), {
      ...constants.defaultSettings,
      disableStorageReset: false,
    }, url);

    expect(warnings).toEqual([
      'This is a clear data warning',
      'This is a clear cache warning',
      'This is a storage warning',
    ]);
  });
});

describe('.prepareTargetForTimespanMode()', () => {
  let driverMock = createMockDriver();

  beforeEach(() => {
    driverMock = createMockDriver();
    sessionMock = driverMock._session;

    sessionMock.sendCommand
      .mockResponse('Network.enable')
      .mockResponse('Network.setUserAgentOverride')
      .mockResponse('Emulation.setDeviceMetricsOverride')
      .mockResponse('Emulation.setTouchEmulationEnabled')
      .mockResponse('Debugger.enable')
      .mockResponse('Debugger.setSkipAllPauses')
      .mockResponse('Debugger.setAsyncCallStackDepth')
      .mockResponse('Network.emulateNetworkConditions')
      .mockResponse('Emulation.setCPUThrottlingRate')
      .mockResponse('Network.setBlockedURLs')
      .mockResponse('Network.setExtraHTTPHeaders');
  });

  it('emulates the target device', async () => {
    await prepare.prepareTargetForTimespanMode(driverMock.asDriver(), {
      ...constants.defaultSettings,
      screenEmulation: {
        disabled: false,
        mobile: true,
        deviceScaleFactor: 2,
        width: 200,
        height: 300,
      },
    });

    expect(sessionMock.sendCommand.findInvocation('Emulation.setDeviceMetricsOverride')).toEqual({
      mobile: true,
      deviceScaleFactor: 2,
      width: 200,
      height: 300,
    });
  });

  it('sets throttling', async () => {
    await prepare.prepareTargetForTimespanMode(driverMock.asDriver(), {
      ...constants.defaultSettings,
      throttlingMethod: 'devtools',
    });

    sessionMock.sendCommand.findInvocation('Network.emulateNetworkConditions');
    sessionMock.sendCommand.findInvocation('Emulation.setCPUThrottlingRate');
  });

  it('sets network environment', async () => {
    await prepare.prepareTargetForTimespanMode(driverMock.asDriver(), {
      ...constants.defaultSettings,
      blockedUrlPatterns: ['.jpg'],
      extraHeaders: {Cookie: 'name=wolverine'},
    });

    const blockedInvocation = sessionMock.sendCommand.findInvocation('Network.setBlockedURLs');
    expect(blockedInvocation).toEqual({urls: ['.jpg']});

    const headersInvocation = sessionMock.sendCommand.findInvocation('Network.setExtraHTTPHeaders');
    expect(headersInvocation).toEqual({headers: {Cookie: 'name=wolverine'}});
  });
});

describe('.enableAsyncStacks()', () => {
  let sessionMock = createMockSession();

  beforeEach(() => {
    sessionMock = createMockSession();

    sessionMock.sendCommand
      .mockResponse('Debugger.enable')
      .mockResponse('Debugger.setSkipAllPauses')
      .mockResponse('Debugger.setAsyncCallStackDepth');
  });

  it('enables async stacks', async () => {
    await prepare.enableAsyncStacks(sessionMock.asSession());

    const invocations = sessionMock.sendCommand.mock.calls;
    const debuggerInvocations = invocations.filter(call => call[0].startsWith('Debugger.'));
    expect(debuggerInvocations.map(argList => argList[0])).toEqual([
      'Debugger.enable',
      'Debugger.setSkipAllPauses',
      'Debugger.setAsyncCallStackDepth',
    ]);
  });

  it('enables async stacks on every main frame navigation', async () => {
    timers.useFakeTimers();
    after(() => timers.dispose());

    sessionMock.sendCommand
      .mockResponse('Debugger.enable')
      .mockResponse('Debugger.setSkipAllPauses')
      .mockResponse('Debugger.setAsyncCallStackDepth')
      .mockResponse('Debugger.disable');

    sessionMock.on.mockEvent('Page.frameNavigated', {frame: {}});
    sessionMock.on.mockEvent('Page.frameNavigated', {frame: {parentId: '1'}});
    sessionMock.on.mockEvent('Page.frameNavigated', {frame: {parentId: '2'}});
    sessionMock.on.mockEvent('Page.frameNavigated', {frame: {parentId: '3'}});

    const disableAsyncStacks = await prepare.enableAsyncStacks(sessionMock.asSession());

    await flushAllTimersAndMicrotasks();

    await disableAsyncStacks();

    const invocations = sessionMock.sendCommand.mock.calls;
    const debuggerInvocations = invocations.filter(call => call[0].startsWith('Debugger.'));
    expect(debuggerInvocations.map(argList => argList[0])).toEqual([
      'Debugger.enable',
      'Debugger.setSkipAllPauses',
      'Debugger.setAsyncCallStackDepth',
      'Debugger.enable',
      'Debugger.setSkipAllPauses',
      'Debugger.setAsyncCallStackDepth',
      'Debugger.disable',
    ]);
  });
});
