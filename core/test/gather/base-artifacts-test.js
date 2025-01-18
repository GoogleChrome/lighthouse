/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {getBaseArtifacts, finalizeArtifacts} from '../../gather/base-artifacts.js';
import {initializeConfig} from '../../config/config.js';
import {createMockDriver} from './mock-driver.js';
import {LighthouseError} from '../../lib/lh-error.js';

function getMockDriverForArtifacts() {
  const driverMock = createMockDriver();
  driverMock._executionContext.evaluate.mockResolvedValue(500);
  driverMock._session.sendCommand.mockResponse('Browser.getVersion', {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Safari/537.36', // eslint-disable-line max-len
    product: 'Chrome/92.0.4515.159',
  });
  return driverMock;
}

/** @type {LH.Gatherer.GatherMode} */
const gatherMode = 'navigation';

describe('getBaseArtifacts', () => {
  let driverMock = getMockDriverForArtifacts();

  beforeEach(() => {
    driverMock = getMockDriverForArtifacts();
  });

  it('should fetch benchmark index', async () => {
    const {resolvedConfig} = await initializeConfig('navigation');
    const artifacts = await getBaseArtifacts(resolvedConfig, driverMock.asDriver(), {gatherMode});
    expect(artifacts.BenchmarkIndex).toEqual(500);
  });

  it('should fetch host user agent', async () => {
    const {resolvedConfig} = await initializeConfig('navigation');
    const artifacts = await getBaseArtifacts(resolvedConfig, driverMock.asDriver(), {gatherMode});
    expect(artifacts.HostUserAgent).toContain('Macintosh');
    expect(artifacts.HostFormFactor).toEqual('desktop');
  });

  it('should return settings', async () => {
    const {resolvedConfig} = await initializeConfig('navigation');
    const artifacts = await getBaseArtifacts(resolvedConfig, driverMock.asDriver(), {gatherMode});
    expect(artifacts.settings).toEqual(resolvedConfig.settings);
  });
});

describe('finalizeArtifacts', () => {
  /** @type {LH.BaseArtifacts} */
  let baseArtifacts;
  /** @type {Partial<LH.Artifacts>} */
  let gathererArtifacts = {};

  beforeEach(async () => {
    const {resolvedConfig} = await initializeConfig(gatherMode);
    const driver = getMockDriverForArtifacts().asDriver();
    baseArtifacts = await getBaseArtifacts(resolvedConfig, driver, {gatherMode});
    baseArtifacts.URL = {finalDisplayedUrl: 'https://example.com'};
    gathererArtifacts = {};
  });

  it('should merge the two objects', () => {
    baseArtifacts.LighthouseRunWarnings = [{i18nId: '1', formattedDefault: 'Yes'}];
    gathererArtifacts.HostUserAgent = 'Desktop Chrome';

    const winningError = new LighthouseError(LighthouseError.errors.NO_LCP);
    baseArtifacts.PageLoadError = new LighthouseError(LighthouseError.errors.NO_FCP);
    gathererArtifacts.PageLoadError = winningError;

    gathererArtifacts.MainDocumentContent = '<html>';
    gathererArtifacts.RobotsTxt = {status: 404, content: null};

    const artifacts = finalizeArtifacts(baseArtifacts, gathererArtifacts);
    expect(artifacts).toMatchObject({
      GatherContext: {gatherMode: 'navigation'},
      PageLoadError: winningError,
      HostUserAgent: 'Desktop Chrome',
      BenchmarkIndex: 500,
      MainDocumentContent: '<html>',
      RobotsTxt: {status: 404, content: null},
      LighthouseRunWarnings: [
        {i18nId: '1', formattedDefault: 'Yes'},
      ],
    });
  });

  it('should add timing entries', () => {
    const artifacts = finalizeArtifacts(baseArtifacts, gathererArtifacts);
    expect(artifacts.Timing.length).toBeGreaterThan(0);
  });

  it('should add environment warnings', () => {
    baseArtifacts.settings.channel = 'cli';
    baseArtifacts.settings.throttlingMethod = 'simulate';
    baseArtifacts.BenchmarkIndex = 200;
    const artifacts = finalizeArtifacts(baseArtifacts, gathererArtifacts);
    expect(artifacts.LighthouseRunWarnings).toHaveLength(1);
    expect(artifacts.LighthouseRunWarnings[0]).toBeDisplayString(/slower CPU/);
  });

  it('should dedupe warnings', () => {
    baseArtifacts.LighthouseRunWarnings = [
      {i18nId: '1', formattedDefault: 'Yes', values: {test: 1}},
      {i18nId: '1', formattedDefault: 'Yes', values: {test: 2}},
    ];

    const artifacts = finalizeArtifacts(baseArtifacts, gathererArtifacts);
    expect(artifacts.LighthouseRunWarnings).toEqual([
      {i18nId: '1', formattedDefault: 'Yes', values: {test: 1}},
      {i18nId: '1', formattedDefault: 'Yes', values: {test: 2}},
    ]);
  });

  it('should throw if URL was not set', () => {
    const run = () => finalizeArtifacts(baseArtifacts, gathererArtifacts);

    baseArtifacts.URL = {finalDisplayedUrl: 'https://example.com'};
    expect(run).not.toThrow();

    baseArtifacts.URL = {finalDisplayedUrl: ''};
    expect(run).toThrowError(/finalDisplayedUrl/);
  });

  it('should not throw if URL was not set for an error reason', () => {
    const run = () => finalizeArtifacts(baseArtifacts, gathererArtifacts);

    baseArtifacts.URL = {requestedUrl: 'https://example.com', finalDisplayedUrl: ''};
    baseArtifacts.PageLoadError = new LighthouseError(LighthouseError.errors.PAGE_HUNG);
    expect(run).not.toThrow();
  });
});
