/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as emulation from '../../lib/emulation.js';
import * as constants from '../../config/constants.js';
import {createMockSession} from '../gather/mock-driver.js';

describe('emulation', () => {
  describe('emulate', () => {
    let session;

    beforeEach(() => {
      session = createMockSession();
      session.sendCommand
        .mockResponse('Network.setUserAgentOverride')
        .mockResponse('Emulation.setDeviceMetricsOverride')
        .mockResponse('Emulation.setTouchEmulationEnabled');
    });

    /**
     * @param {LH.SharedFlagsSettings['formFactor']} formFactor
     * @param {LH.SharedFlagsSettings['screenEmulation']} screenEmulation
     * @param {LH.SharedFlagsSettings['emulatedUserAgent']} emulatedUserAgent
     */
    const getSettings = (formFactor, screenEmulation, emulatedUserAgent) => ({
      formFactor: formFactor,
      screenEmulation,
      emulatedUserAgent: emulatedUserAgent === undefined ? constants.userAgents[formFactor] : false,
    });

    const metrics = constants.screenEmulationMetrics;

    it('default: mobile w/ screenEmulation', async () => {
      await emulation.emulate(session, getSettings('mobile', metrics.mobile));

      const uaArgs = session.sendCommand.findInvocation('Network.setUserAgentOverride');
      expect(uaArgs).toMatchObject({
        userAgent: constants.userAgents.mobile,
        userAgentMetadata: {
          mobile: true,
          platform: 'Android',
        },
      });

      const emulateArgs = session.sendCommand.findInvocation(
        'Emulation.setDeviceMetricsOverride'
      );
      expect(emulateArgs).toMatchObject({mobile: true});
    });

    it('default desktop: w/ desktop screen emu', async () => {
      await emulation.emulate(session, getSettings('desktop', metrics.desktop));

      const uaArgs = session.sendCommand.findInvocation('Network.setUserAgentOverride');
      expect(uaArgs).toMatchObject({
        userAgent: constants.userAgents.desktop,
        userAgentMetadata: {
          mobile: false,
          platform: 'macOS',
        },
      });

      const emulateArgs = session.sendCommand.findInvocation(
        'Emulation.setDeviceMetricsOverride'
      );
      expect(emulateArgs).toMatchObject({
        mobile: metrics.desktop.mobile,
        width: metrics.desktop.width,
        height: metrics.desktop.height,
        deviceScaleFactor: metrics.desktop.deviceScaleFactor,
      });
      expect(emulateArgs).toMatchObject({mobile: false});
    });

    it('mobile but screenEmu disabled (scenarios: on-device or external emu applied)', async () => {
      await emulation.emulate(session, getSettings('mobile', {disabled: true}));
      const uaArgs = session.sendCommand.findInvocation('Network.setUserAgentOverride');
      expect(uaArgs).toMatchObject({userAgent: constants.userAgents.mobile});

      expect(session.sendCommand).not.toHaveBeenCalledWith(
        'Emulation.setDeviceMetricsOverride',
        expect.anything()
      );
    });

    it('desktop but screenEmu disabled (scenario: DevTools  or external emu applied)', async () => {
      await emulation.emulate(session, getSettings('desktop', {disabled: true}));
      const uaArgs = session.sendCommand.findInvocation('Network.setUserAgentOverride');
      expect(uaArgs).toMatchObject({userAgent: constants.userAgents.desktop});

      expect(session.sendCommand).not.toHaveBeenCalledWith(
        'Emulation.setDeviceMetricsOverride',
        expect.anything()
      );
    });

    it('mobile but UA emu disabled', async () => {
      await emulation.emulate(session, getSettings('mobile', metrics.mobile, false));

      expect(session.sendCommand).not.toHaveBeenCalledWith(
        'Network.setUserAgentOverride',
        expect.anything()
      );

      const emulateArgs = session.sendCommand.findInvocation(
        'Emulation.setDeviceMetricsOverride'
      );
      expect(emulateArgs).toMatchObject({
        mobile: metrics.mobile.mobile,
        width: metrics.mobile.width,
        height: metrics.mobile.height,
        deviceScaleFactor: metrics.mobile.deviceScaleFactor,
      });
      expect(emulateArgs).toMatchObject({mobile: true});
    });

    it('desktop but UA emu disabled', async () => {
      await emulation.emulate(session, getSettings('desktop', metrics.desktop, false));

      expect(session.sendCommand).not.toHaveBeenCalledWith(
        'Network.setUserAgentOverride',
        expect.anything()
      );

      const emulateArgs = session.sendCommand.findInvocation(
        'Emulation.setDeviceMetricsOverride'
      );
      expect(emulateArgs).toMatchObject({
        mobile: metrics.desktop.mobile,
        width: metrics.desktop.width,
        height: metrics.desktop.height,
        deviceScaleFactor: metrics.desktop.deviceScaleFactor,
      });
      expect(emulateArgs).toMatchObject({mobile: false});
    });

    it('custom chrome UA', async () => {
      const settings = getSettings('desktop', metrics.desktop, false);
      const chromeTablet = 'Mozilla/5.0 (Linux; Android 4.3; Nexus 7 Build/JSS15Q) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/%s Safari/537.36'; // eslint-disable-line max-len
      settings.emulatedUserAgent = chromeTablet;
      await emulation.emulate(session, settings);

      const uaArgs = session.sendCommand.findInvocation('Network.setUserAgentOverride');
      expect(uaArgs).toMatchObject({
        userAgent: chromeTablet,
        userAgentMetadata: {
          mobile: false,
          // Incorrect. See TODO in emulation.js
          platform: 'macOS',
          architecture: 'x86',
        },
      });
    });


    it('custom non-chrome UA', async () => {
      const settings = getSettings('desktop', metrics.desktop, false);
      const FFdesktopUA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.14; rv:70.0) Gecko/20100101 Firefox/70.0'; // eslint-disable-line max-len
      settings.emulatedUserAgent = FFdesktopUA;
      await emulation.emulate(session, settings);

      const uaArgs = session.sendCommand.findInvocation('Network.setUserAgentOverride');
      expect(uaArgs).toMatchObject({
        userAgent: FFdesktopUA,
        userAgentMetadata: {
          mobile: false,
          platform: 'macOS',
          architecture: 'x86',
        },
      });
    });
  });
});
