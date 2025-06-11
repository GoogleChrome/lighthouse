/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as td from 'testdouble';

import {
  createMockDriver,
  createMockPage,
  createMockGathererInstance,
  mockDriverSubmodules,
  mockDriverModule,
  mockRunnerModule,
} from './mock-driver.js';
import {flushAllTimersAndMicrotasks, timers} from '../test-utils.js';

const mockSubmodules = await mockDriverSubmodules();
const mockRunner = await mockRunnerModule();

// Establish the mocks before we import the file under test.
/** @type {ReturnType<typeof createMockDriver>} */
let mockDriver;
await td.replaceEsm('../../gather/driver.js',
  mockDriverModule(() => mockDriver.asDriver()));

// Some imports needs to be done dynamically, so that their dependencies will be mocked.
// https://github.com/GoogleChrome/lighthouse/blob/main/docs/hacking-tips.md#mocking-modules-with-testdouble
const {startTimespanGather} = await import('../../gather/timespan-runner.js');

describe('Timespan Runner', () => {
  /** @type {ReturnType<typeof createMockPage>} */
  let mockPage;
  /** @type {LH.Puppeteer.Page} */
  let page;
  /** @type {ReturnType<typeof createMockGathererInstance>} */
  let gathererA;
  /** @type {ReturnType<typeof createMockGathererInstance>} */
  let gathererB;
  /** @type {LH.Config} */
  let config;

  before(() => timers.useFakeTimers());
  after(() => timers.dispose());

  beforeEach(() => {
    mockSubmodules.reset();
    mockPage = createMockPage();
    mockDriver = createMockDriver();
    mockRunner.reset();
    page = mockPage.asPage();

    mockDriver._session.sendCommand.mockResponse('Browser.getVersion', {
      product: 'Chrome/88.0',
      userAgent: 'Chrome',
    });

    gathererA = createMockGathererInstance({supportedModes: ['timespan']});
    gathererA.getArtifact.mockResolvedValue('Artifact A');

    gathererB = createMockGathererInstance({supportedModes: ['timespan']});
    gathererB.getArtifact.mockResolvedValue('Artifact B');

    config = {
      artifacts: [
        {id: 'A', gatherer: {instance: gathererA.asGatherer()}},
        {id: 'B', gatherer: {instance: gathererB.asGatherer()}},
      ],
    };
  });

  it('should connect to the page and run', async () => {
    const timespan = await startTimespanGather(page, {config});
    await timespan.endTimespanGather();
    expect(mockDriver.connect).toHaveBeenCalled();
    expect(mockRunner.gather).toHaveBeenCalled();
    expect(mockRunner.audit).not.toHaveBeenCalled();
  });

  it('should prepare the target', async () => {
    const timespan = await startTimespanGather(page, {config});
    expect(mockSubmodules.prepareMock.prepareTargetForTimespanMode).toHaveBeenCalled();
    await timespan.endTimespanGather();
  });

  it('should invoke startInstrumentation', async () => {
    const timespan = await startTimespanGather(page, {config});
    expect(gathererA.startInstrumentation).toHaveBeenCalled();
    expect(gathererB.startInstrumentation).toHaveBeenCalled();
    expect(gathererA.startSensitiveInstrumentation).toHaveBeenCalled();
    expect(gathererB.startSensitiveInstrumentation).toHaveBeenCalled();
    await timespan.endTimespanGather();
  });

  it('should collect base artifacts', async () => {
    mockDriver.url.mockResolvedValue('https://start.example.com/');

    const timespan = await startTimespanGather(page, {config});

    mockDriver.url.mockResolvedValue('https://end.example.com/');

    await timespan.endTimespanGather();
    const artifacts = await mockRunner.gather.mock.calls[0][0]();
    expect(artifacts).toMatchObject({
      fetchTime: expect.any(String),
      URL: {
        finalDisplayedUrl: 'https://end.example.com/',
      },
    });
  });

  it('should use flags', async () => {
    const flags = {
      formFactor: /** @type {const} */ ('desktop'),
      maxWaitForLoad: 1234,
      screenEmulation: {mobile: false},
    };

    const timespan = await startTimespanGather(page, {config, flags});
    await timespan.endTimespanGather();

    expect(mockRunner.gather.mock.calls[0][1]).toMatchObject({
      resolvedConfig: {
        settings: flags,
      },
    });
  });

  it('should invoke stop instrumentation', async () => {
    const timespan = await startTimespanGather(page, {config});
    await timespan.endTimespanGather();
    await mockRunner.gather.mock.calls[0][0]();
    expect(gathererA.stopSensitiveInstrumentation).toHaveBeenCalled();
    expect(gathererB.stopSensitiveInstrumentation).toHaveBeenCalled();
    expect(gathererA.stopInstrumentation).toHaveBeenCalled();
    expect(gathererB.stopInstrumentation).toHaveBeenCalled();
  });

  it('should collect timespan artifacts', async () => {
    const timespan = await startTimespanGather(page, {config});
    await timespan.endTimespanGather();
    const artifacts = await mockRunner.gather.mock.calls[0][0]();
    expect(artifacts).toMatchObject({A: 'Artifact A', B: 'Artifact B'});
  });

  it('should carryover failures from startInstrumentation', async () => {
    const artifactError = new Error('BEFORE_TIMESPAN_ERROR');
    gathererA.startInstrumentation.mockRejectedValue(artifactError);

    const timespan = await startTimespanGather(page, {config});
    await timespan.endTimespanGather();
    const artifacts = await mockRunner.gather.mock.calls[0][0]();
    expect(artifacts).toMatchObject({A: artifactError, B: 'Artifact B'});
    expect(gathererA.stopInstrumentation).not.toHaveBeenCalled();
    expect(gathererB.stopInstrumentation).toHaveBeenCalled();
  });

  it('should skip snapshot artifacts', async () => {
    gathererB.meta.supportedModes = ['snapshot'];

    const timespan = await startTimespanGather(page, {config});
    await timespan.endTimespanGather();
    const artifacts = await mockRunner.gather.mock.calls[0][0]();
    expect(artifacts).toMatchObject({A: 'Artifact A'});
    expect(artifacts).not.toHaveProperty('B');
    expect(gathererB.startInstrumentation).not.toHaveBeenCalled();
    expect(gathererB.getArtifact).not.toHaveBeenCalled();
  });

  it('should support artifact dependencies', async () => {
    const dependencySymbol = Symbol('dep');
    gathererA.meta.symbol = dependencySymbol;
    // @ts-expect-error - the default fixture was defined as one without dependencies.
    gathererB.meta.dependencies = {ImageElements: dependencySymbol};

    const timespan = await startTimespanGather(page, {config});
    await timespan.endTimespanGather();
    const artifacts = await mockRunner.gather.mock.calls[0][0]();
    expect(artifacts).toMatchObject({A: 'Artifact A', B: 'Artifact B'});
    expect(gathererB.getArtifact.mock.calls[0][0]).toMatchObject({
      dependencies: {
        ImageElements: 'Artifact A',
      },
    });
  });

  it('should warn if a navigation was detected', async () => {
    mockDriver._session.on.mockEvent('Page.frameNavigated', {});

    const timespan = await startTimespanGather(page, {config});
    await flushAllTimersAndMicrotasks();
    await timespan.endTimespanGather();

    const artifacts = await mockRunner.gather.mock.calls[0][0]();
    expect(artifacts.LighthouseRunWarnings).toHaveLength(1);
    expect(artifacts.LighthouseRunWarnings[0])
      .toBeDisplayString(/A page navigation was detected during the run. Using timespan mode/);
  });
});
