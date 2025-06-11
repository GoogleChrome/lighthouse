/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import jestMock from 'jest-mock';

import {runLighthouseInLR} from '../../lightrider/lightrider-entry.js';
import {Runner} from '../../../core/runner.js';
import {LighthouseError} from '../../../core/lib/lh-error.js';
import {createMockPage} from '../../../core/test/gather/mock-driver.js';

describe('lightrider-entry', () => {
  let mockConnection;

  beforeEach(() => {
    mockConnection = {
      connect: jestMock.fn(),
      disconnect: jestMock.fn(),
      sendCommand: jestMock.fn(),
      on: jestMock.fn(),
    };

    runLighthouseInLR.getPageFromConnection = async (connection) => {
      await connection.connect();
      return createMockPage();
    };
  });

  describe('#runLighthouseInLR', () => {
    it('returns a runtimeError LHR when lighthouse throws a runtimeError', async () => {
      const connectionError = new LighthouseError(
        LighthouseError.errors.FAILED_DOCUMENT_REQUEST,
        {errorDetails: 'Bad connection req'}
      );
      assert.strictEqual(connectionError.lhrRuntimeError, true);
      mockConnection.connect.mockRejectedValue(connectionError);
      const url = 'https://example.com';
      const output = 'json';

      const result = await runLighthouseInLR(mockConnection, url, {output}, {});
      const parsedResult = JSON.parse(result);
      expect(parsedResult.runtimeError).toMatchObject({
        code: connectionError.code,
        message: expect.stringContaining(connectionError.message),
      });
    });

    it('returns an unknown-runtimeError LHR when lighthouse throws an unknown error', async () => {
      const errorMsg = 'Errors are the best!';
      const connectionError = new Error(errorMsg);
      assert.strictEqual(connectionError.lhrRuntimeError, undefined);
      mockConnection.connect.mockRejectedValue(connectionError);
      const url = 'https://example.com';
      const output = 'json';

      const result = await runLighthouseInLR(mockConnection, url, {output}, {});
      const parsedResult = JSON.parse(result);
      assert.strictEqual(parsedResult.runtimeError.code, LighthouseError.UNKNOWN_ERROR);
      assert.ok(parsedResult.runtimeError.message.includes(errorMsg));
    });

    it('specifies the channel as lr', async () => {
      const runStub = jestMock.spyOn(Runner, 'gather');

      const url = 'https://example.com';

      await runLighthouseInLR(mockConnection, url, {}, {});
      const resolvedConfig = runStub.mock.calls[0][1].resolvedConfig;
      assert.equal(resolvedConfig.settings.channel, 'lr');

      runStub.mockRestore();
    });

    it('uses the desktop config preset when device is desktop', async () => {
      const runStub = jestMock.spyOn(Runner, 'gather');

      const url = 'https://example.com';

      const lrDevice = 'desktop';
      await runLighthouseInLR(mockConnection, url, {}, {lrDevice});
      const resolvedConfig = runStub.mock.calls[0][1].resolvedConfig;
      assert.equal(resolvedConfig.settings.formFactor, 'desktop');

      runStub.mockRestore();
    });

    it('uses the mobile config preset when device is mobile', async () => {
      const runStub = jestMock.spyOn(Runner, 'gather');

      const url = 'https://example.com';

      const lrDevice = 'mobile';
      await runLighthouseInLR(mockConnection, url, {}, {lrDevice});
      const resolvedConfig = runStub.mock.calls[0][1].resolvedConfig;
      assert.equal(resolvedConfig.settings.formFactor, 'mobile');

      runStub.mockRestore();
    });

    it('disables 404 with flag', async () => {
      const runStub = jestMock.spyOn(Runner, 'gather');

      const url = 'https://example.com';

      const ignoreStatusCode = true;
      await runLighthouseInLR(mockConnection, url, {}, {ignoreStatusCode});
      const resolvedConfig = runStub.mock.calls[0][1].resolvedConfig;
      assert.equal(resolvedConfig.settings.ignoreStatusCode, true);

      runStub.mockRestore();
    });

    it('overrides the default config when one is provided', async () => {
      const runStub = jestMock.spyOn(Runner, 'gather');

      const url = 'https://example.com';

      const configOverride = {
        default: 'lighthouse:default',
        settings: {
          onlyAudits: ['network-requests'],
        },
      };
      await runLighthouseInLR(mockConnection, url, {}, {configOverride});
      const resolvedConfig = runStub.mock.calls[0][1].resolvedConfig;
      assert.equal(resolvedConfig.settings.onlyAudits.length, 1);
      assert.equal(resolvedConfig.settings.onlyAudits[0], 'network-requests');

      runStub.mockRestore();
    });

    let originalRun;
    beforeEach(() => {
      originalRun = Runner.run;
    });
    afterEach(() => {
      Runner.run = originalRun;
    });

    it('exposes artifacts when logAssets is true', async () => {
      Runner.gather = jestMock.fn();
      Runner.audit = jestMock.fn(Runner.audit).mockReturnValue(Promise.resolve({
        lhr: {},
        artifacts: {
          Artifact: new Error('some error'),
        },
      }));

      const url = 'https://example.com';
      const lrFlags = {
        logAssets: true,
      };
      const resultJson = await runLighthouseInLR(mockConnection, url, {}, lrFlags);
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
