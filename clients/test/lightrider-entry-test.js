/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const assert = require('assert').strict;
const lhBackground = require('../lightrider/lightrider-entry.js');
const Runner = require('../../lighthouse-core/runner.js');
const LHError = require('../../lighthouse-core/lib/lh-error.js');

/* eslint-env jest */

describe('lightrider-entry', () => {
  describe('#runLighthouseInLR', () => {
    it('returns a runtimeError LHR when lighthouse throws a runtimeError', async () => {
      const connectionError = new LHError(
        LHError.errors.FAILED_DOCUMENT_REQUEST,
        {errorDetails: 'Bad connection req'}
      );
      assert.strictEqual(connectionError.lhrRuntimeError, true);
      const mockConnection = {
        async connect() {
          throw connectionError;
        },
        async disconnect() {},
        async sendCommand() {},
        on() {},
      };
      const url = 'https://example.com';
      const output = 'json';

      const result = await lhBackground.runLighthouseInLR(mockConnection, url, {output}, {});
      const parsedResult = JSON.parse(result);
      assert.strictEqual(parsedResult.runtimeError.code, connectionError.code);
      assert.ok(parsedResult.runtimeError.message.includes(connectionError.friendlyMessage));
    });

    it('returns an unknown-runtimeError LHR when lighthouse throws an unknown error', async () => {
      const errorMsg = 'Errors are the best!';
      const connectionError = new Error(errorMsg);
      assert.strictEqual(connectionError.lhrRuntimeError, undefined);
      const mockConnection = {
        async connect() {
          throw connectionError;
        },
        async disconnect() {},
        async sendCommand() {},
        on() {},
      };
      const url = 'https://example.com';
      const output = 'json';

      const result = await lhBackground.runLighthouseInLR(mockConnection, url, {output}, {});
      const parsedResult = JSON.parse(result);
      assert.strictEqual(parsedResult.runtimeError.code, LHError.UNKNOWN_ERROR);
      assert.ok(parsedResult.runtimeError.message.includes(errorMsg));
    });

    it('specifies the channel as lr', async () => {
      const runStub = jest.spyOn(Runner, 'run');

      const mockConnection = {};
      const url = 'https://example.com';

      await lhBackground.runLighthouseInLR(mockConnection, url, {}, {});
      const config = runStub.mock.calls[0][1].config;
      assert.equal(config.settings.channel, 'lr');

      runStub.mockRestore();
    });

    it('uses the desktop config preset when device is desktop', async () => {
      const runStub = jest.spyOn(Runner, 'run');

      const mockConnection = {};
      const url = 'https://example.com';

      const lrDevice = 'desktop';
      await lhBackground.runLighthouseInLR(mockConnection, url, {}, {lrDevice});
      const config = runStub.mock.calls[0][1].config;
      assert.equal(config.settings.emulatedFormFactor, 'desktop');

      runStub.mockRestore();
    });

    it('uses the mobile config preset when device is mobile', async () => {
      const runStub = jest.spyOn(Runner, 'run');

      const mockConnection = {};
      const url = 'https://example.com';

      const lrDevice = 'mobile';
      await lhBackground.runLighthouseInLR(mockConnection, url, {}, {lrDevice});
      const config = runStub.mock.calls[0][1].config;
      assert.equal(config.settings.emulatedFormFactor, 'mobile');

      runStub.mockRestore();
    });

    it('overrides the default config when one is provided', async () => {
      const runStub = jest.spyOn(Runner, 'run');

      const mockConnection = {};
      const url = 'https://example.com';

      const configOverride = {
        default: 'lighthouse:default',
        settings: {
          onlyAudits: ['network-requests'],
        },
      };
      await lhBackground.runLighthouseInLR(mockConnection, url, {}, {configOverride});
      const config = runStub.mock.calls[0][1].config;
      assert.equal(config.settings.onlyAudits.length, 1);
      assert.equal(config.settings.onlyAudits[0], 'network-requests');

      runStub.mockRestore();
    });

    it('exposes artifacts when logAssets is true', async () => {
      const originalRun = Runner.run;
      Runner.run = jest.fn().mockReturnValue(Promise.resolve({
        lhr: {},
        artifacts: {
          Artifact: new Error('some error'),
        },
      }));
      afterEach(() => {
        Runner.run = originalRun;
      });

      const mockConnection = {};
      const url = 'https://example.com';
      const lrFlags = {
        logAssets: true,
      };
      const resultJson = await lhBackground.runLighthouseInLR(mockConnection, url, {}, lrFlags);
      const result = JSON.parse(resultJson);
      expect(result.artifacts).toMatchObject({
        Artifact: {
          sentinel: '__ErrorSentinel',
          message: 'some error',
        },
      });
    });
  });
});
