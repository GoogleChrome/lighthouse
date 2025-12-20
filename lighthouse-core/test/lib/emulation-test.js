/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const emulation = require('../../lib/emulation.js');
const Driver = require('../../gather/driver.js');
const Connection = require('../../gather/connections/connection.js');
const {createMockSendCommandFn} = require('../gather/mock-commands.js');

/* eslint-env jest */

describe('emulation', () => {
  describe('emulate', () => {
    let driver;
    let connectionStub;

    beforeEach(() => {
      connectionStub = new Connection();
      connectionStub.sendCommand = cmd => {
        throw new Error(`${cmd} not implemented`);
      };
      driver = new Driver(connectionStub);

      connectionStub.sendCommand = createMockSendCommandFn()
        .mockResponse('Network.enable')
        .mockResponse('Network.setUserAgentOverride')
        .mockResponse('Emulation.setDeviceMetricsOverride')
        .mockResponse('Emulation.setTouchEmulationEnabled');
    });

    const getSettings = (formFactor, disableDeviceScreenEmulation) => ({
      emulatedFormFactor: formFactor,
      internalDisableDeviceScreenEmulation: disableDeviceScreenEmulation,
    });

    it('handles: emulatedFormFactor: mobile / disableDeviceScreenEmulation: false', async () => {
      await emulation.emulate(driver, getSettings('mobile', false));

      const uaArgs = connectionStub.sendCommand.findInvocation('Network.setUserAgentOverride');
      expect(uaArgs).toMatchObject({userAgent: emulation.MOBILE_USERAGENT});

      const emulateArgs = connectionStub.sendCommand.findInvocation(
        'Emulation.setDeviceMetricsOverride'
      );
      expect(emulateArgs).toMatchObject({mobile: true});
    });

    it('handles: emulatedFormFactor: desktop / disableDeviceScreenEmulation: false', async () => {
      await emulation.emulate(driver, getSettings('desktop', false));

      const uaArgs = connectionStub.sendCommand.findInvocation('Network.setUserAgentOverride');
      expect(uaArgs).toMatchObject({userAgent: emulation.DESKTOP_USERAGENT});

      const emulateArgs = connectionStub.sendCommand.findInvocation(
        'Emulation.setDeviceMetricsOverride'
      );
      expect(emulateArgs).toMatchObject({mobile: false});
    });

    it('handles: emulatedFormFactor: none / disableDeviceScreenEmulation: false', async () => {
      await emulation.emulate(driver, getSettings('none', false));
      expect(connectionStub.sendCommand).not.toHaveBeenCalledWith(
        'Network.setUserAgentOverride',
        expect.anything()
      );
      expect(connectionStub.sendCommand).not.toHaveBeenCalledWith(
        'Emulation.setDeviceMetricsOverride',
        expect.anything()
      );
    });

    it('handles: emulatedFormFactor: mobile / disableDeviceScreenEmulation: true', async () => {
      await emulation.emulate(driver, getSettings('mobile', true));
      const uaArgs = connectionStub.sendCommand.findInvocation('Network.setUserAgentOverride');
      expect(uaArgs).toMatchObject({userAgent: emulation.MOBILE_USERAGENT});

      expect(connectionStub.sendCommand).not.toHaveBeenCalledWith(
        'Emulation.setDeviceMetricsOverride',
        expect.anything()
      );
    });

    it('handles: emulatedFormFactor: desktop / disableDeviceScreenEmulation: true', async () => {
      await emulation.emulate(driver, getSettings('desktop', true));
      const uaArgs = connectionStub.sendCommand.findInvocation('Network.setUserAgentOverride');
      expect(uaArgs).toMatchObject({userAgent: emulation.DESKTOP_USERAGENT});

      expect(connectionStub.sendCommand).not.toHaveBeenCalledWith(
        'Emulation.setDeviceMetricsOverride',
        expect.anything()
      );
    });

    it('handles: emulatedFormFactor: none / disableDeviceScreenEmulation: true', async () => {
      await emulation.emulate(driver, getSettings('none', true));
      expect(connectionStub.sendCommand).not.toHaveBeenCalledWith(
        'Network.setUserAgentOverride',
        expect.anything()
      );
      expect(connectionStub.sendCommand).not.toHaveBeenCalledWith(
        'Emulation.setDeviceMetricsOverride',
        expect.anything()
      );
    });
  });
});
