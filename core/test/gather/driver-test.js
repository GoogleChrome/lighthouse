/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Driver} from '../../gather/driver.js';
import {fnAny} from '../test-utils.js';
import {createMockCdpSession} from './mock-driver.js';

/** @type {Array<keyof LH.Gatherer.ProtocolSession>} */
const DELEGATED_FUNCTIONS = [
  'hasNextProtocolTimeout',
  'getNextProtocolTimeout',
  'setNextProtocolTimeout',
  'on',
  'off',
  'sendCommand',
];

/** @type {LH.Puppeteer.Page} */
let page;
/** @type {Driver} */
let driver;

beforeEach(() => {
  const puppeteerSession = createMockCdpSession();
  puppeteerSession.send
      .mockResponse('Page.enable')
      .mockResponse('Page.getFrameTree', {frameTree: {frame: {id: 'mainFrameId'}}})
      .mockResponse('Runtime.enable')
      .mockResponse('Page.disable')
      .mockResponse('Runtime.disable')
      .mockResponse('Target.getTargetInfo', {targetInfo: {type: 'page', targetId: 'page'}})
      .mockResponse('Network.enable')
      .mockResponse('Target.setAutoAttach')
      .mockResponse('Runtime.runIfWaitingForDebugger');

  const pageTarget = {createCDPSession: () => puppeteerSession};

  // @ts-expect-error - Individual mock functions are applied as necessary.
  page = {target: () => pageTarget, url: fnAny()};
  driver = new Driver(page);
});

for (const fnName of DELEGATED_FUNCTIONS) {
  describe(fnName, () => {
    it('should fail if called before connect', () => {
      expect(driver.defaultSession[fnName]).toThrow(/not connected/);
    });

    it('should use connected session for default', async () => {
      await driver.connect();
      if (!driver.defaultSession) throw new Error('Driver did not connect');

      /** @type {any} */
      const args = [1, {arg: 2}];
      const returnValue = {foo: 'bar'};
      driver.defaultSession[fnName] = fnAny().mockReturnValue(returnValue);
      // @ts-expect-error - typescript can't handle this union type.
      const actualResult = driver.defaultSession[fnName](...args);
      expect(driver.defaultSession[fnName]).toHaveBeenCalledWith(...args);
      expect(actualResult).toEqual(returnValue);
    });
  });
}

describe('.url', () => {
  it('should return the page url', async () => {
    page.url = fnAny().mockReturnValue('https://example.com');
    expect(await driver.url()).toEqual('https://example.com');
  });
});

describe('.executionContext', () => {
  it('should fail if called before connect', () => {
    expect(() => driver.executionContext).toThrow();
  });

  it('should create an execution context on connect', async () => {
    await driver.connect();
    expect(driver.executionContext).toBeTruthy();
  });
});

describe('.fetcher', () => {
  it('should fail if called before connect', () => {
    expect(() => driver.fetcher).toThrow();
  });

  it('should create a fetcher on connect', async () => {
    await driver.connect();
    expect(driver.fetcher).toBeTruthy();
  });
});

describe('.disconnect', () => {
  it('should do nothing if called before connect', async () => {
    await driver.disconnect();
  });

  it('should invoke session dispose', async () => {
    await driver.connect();
    const dispose = driver.defaultSession.dispose = fnAny();
    await driver.disconnect();
    expect(dispose).toHaveBeenCalled();
  });
});
