/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {defaultSettings} from '../../../config/constants.js';
import * as environment from '../../../gather/driver/environment.js';
import {createMockSession} from '../mock-driver.js';

describe('.getBrowserVersion', () => {
  let sessionMock = createMockSession();

  beforeEach(() => {
    sessionMock = createMockSession();
  });

  it('should return the chromium milestone', async () => {
    sessionMock.sendCommand.mockResponse('Browser.getVersion', {product: 'Chrome/71.0.3577.0'});
    const version = await environment.getBrowserVersion(sessionMock.asSession());
    expect(version).toEqual({product: 'Chrome/71.0.3577.0', milestone: 71});
  });

  it('should handle malformed responses', async () => {
    sessionMock.sendCommand.mockResponse('Browser.getVersion', {product: 'Chrome .0.3577.0'});
    const version = await environment.getBrowserVersion(sessionMock.asSession());
    expect(version).toEqual({product: 'Chrome .0.3577.0', milestone: 0});
  });
});

describe('Warnings', () => {
  /** @type {Parameters<typeof environment['getEnvironmentWarnings']>[0]} */
  let context;

  beforeEach(() => {
    context = {
      settings: {
        ...defaultSettings,
        channel: 'cli',
        throttlingMethod: 'simulate',
        throttling: {
          ...defaultSettings.throttling,
          cpuSlowdownMultiplier: 4,
        },
      },
      baseArtifacts: {
        BenchmarkIndex: 1500,
      },
    };
  });


  describe('.getSlowHostCpuWarning', () => {
    beforeEach(() => {
      context.baseArtifacts.BenchmarkIndex = 500;
    });

    it('should add a warning when benchmarkindex is low', () => {
      expect(environment.getSlowHostCpuWarning(context)).toBeDisplayString(
      /appears to have a slower CPU/
      );
    });

    it('should ignore non-cli channels', () => {
      Object.assign(context.settings, {channel: 'devtools'});
      expect(environment.getSlowHostCpuWarning(context)).toBe(undefined);

      Object.assign(context.settings, {channel: 'wpt'});
      expect(environment.getSlowHostCpuWarning(context)).toBe(undefined);

      Object.assign(context.settings, {channel: 'psi'});
      expect(environment.getSlowHostCpuWarning(context)).toBe(undefined);
    });

    it('should ignore non-default throttling settings', () => {
      Object.assign(context.settings, {throttling: {cpuSlowdownMultiplier: 2}});
      expect(environment.getSlowHostCpuWarning(context)).toBe(undefined);

      Object.assign(context.settings, {throttlingMethod: 'provided'});
      Object.assign(context.settings, {throttling: {cpuSlowdownMultiplier: 4}});
      expect(environment.getSlowHostCpuWarning(context)).toBe(undefined);
    });

    it('should ignore high benchmarkindex values', () => {
      Object.assign(context.baseArtifacts, {BenchmarkIndex: 1500});
      expect(environment.getSlowHostCpuWarning(context)).toBe(undefined);
    });
  });

  describe('.getEnvironmentWarnings()', () => {
    it('should not find non-existent warnings', () => {
      expect(environment.getEnvironmentWarnings(context)).toEqual([]);
    });

    it('should find slow host warnings', () => {
      Object.assign(context.baseArtifacts, {BenchmarkIndex: 500});
      expect(environment.getEnvironmentWarnings(context)).toHaveLength(1);
    });
  });
});
