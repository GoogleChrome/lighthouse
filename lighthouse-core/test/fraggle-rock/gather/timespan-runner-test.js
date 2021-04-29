/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const {
  createMockDriver,
  createMockPage,
  createMockGathererInstance,
  mockDriverModule,
  mockRunnerModule,
} = require('./mock-driver.js');

// Establish the mocks before we require our file under test.
let mockRunnerRun = jest.fn();
/** @type {ReturnType<typeof createMockDriver>} */
let mockDriver;

jest.mock('../../../runner.js', () => mockRunnerModule(() => mockRunnerRun));
jest.mock('../../../fraggle-rock/gather/driver.js', () =>
  mockDriverModule(() => mockDriver.asDriver())
);

const {startTimespan} = require('../../../fraggle-rock/gather/timespan-runner.js');

describe('Timespan Runner', () => {
  /** @type {ReturnType<typeof createMockPage>} */
  let mockPage;
  /** @type {import('puppeteer').Page} */
  let page;
  /** @type {ReturnType<typeof createMockGathererInstance>} */
  let gathererA;
  /** @type {ReturnType<typeof createMockGathererInstance>} */
  let gathererB;
  /** @type {LH.Config.Json} */
  let config;

  beforeEach(() => {
    mockPage = createMockPage();
    mockDriver = createMockDriver();
    mockRunnerRun = jest.fn();
    page = mockPage.asPage();

    mockDriver._session.sendCommand.mockResponse('Browser.getVersion', {
      product: 'Chrome/88.0',
      userAgent: 'Chrome',
    });

    gathererA = createMockGathererInstance({supportedModes: ['timespan']});
    gathererA.afterTimespan.mockResolvedValue('Artifact A');

    gathererB = createMockGathererInstance({supportedModes: ['timespan']});
    gathererB.afterTimespan.mockResolvedValue('Artifact B');

    config = {
      artifacts: [
        {id: 'A', gatherer: {instance: gathererA.asGatherer()}},
        {id: 'B', gatherer: {instance: gathererB.asGatherer()}},
      ],
    };
  });

  it('should connect to the page and run', async () => {
    const timespan = await startTimespan({page, config});
    await timespan.endTimespan();
    expect(mockDriver.connect).toHaveBeenCalled();
    expect(mockRunnerRun).toHaveBeenCalled();
  });

  it('should invoke beforeTimespan', async () => {
    const timespan = await startTimespan({page, config});
    expect(gathererA.beforeTimespan).toHaveBeenCalled();
    expect(gathererB.beforeTimespan).toHaveBeenCalled();
    await timespan.endTimespan();
  });

  it('should collect base artifacts', async () => {
    mockPage.url.mockResolvedValue('https://start.example.com/');

    const timespan = await startTimespan({page, config});

    mockPage.url.mockResolvedValue('https://end.example.com/');

    await timespan.endTimespan();
    const artifacts = await mockRunnerRun.mock.calls[0][0];
    expect(artifacts).toMatchObject({
      fetchTime: expect.any(String),
      URL: {
        requestedUrl: 'https://start.example.com/',
        finalUrl: 'https://end.example.com/',
      },
    });
  });

  it('should collect timespan artifacts', async () => {
    const timespan = await startTimespan({page, config});
    await timespan.endTimespan();
    const artifacts = await mockRunnerRun.mock.calls[0][0];
    expect(artifacts).toMatchObject({A: 'Artifact A', B: 'Artifact B'});
    expect(gathererA.afterTimespan).toHaveBeenCalled();
    expect(gathererB.afterTimespan).toHaveBeenCalled();
  });

  it('should carryover failures from beforeTimespan', async () => {
    const artifactError = new Error('BEFORE_TIMESPAN_ERROR');
    gathererA.beforeTimespan.mockRejectedValue(artifactError);

    const timespan = await startTimespan({page, config});
    await timespan.endTimespan();
    const artifacts = await mockRunnerRun.mock.calls[0][0];
    expect(artifacts).toMatchObject({A: artifactError, B: 'Artifact B'});
    expect(gathererA.afterTimespan).not.toHaveBeenCalled();
    expect(gathererB.afterTimespan).toHaveBeenCalled();
  });

  it('should skip snapshot artifacts', async () => {
    gathererB.meta.supportedModes = ['snapshot'];

    const timespan = await startTimespan({page, config});
    await timespan.endTimespan();
    const artifacts = await mockRunnerRun.mock.calls[0][0];
    expect(artifacts).toMatchObject({A: 'Artifact A'});
    expect(artifacts).not.toHaveProperty('B');
    expect(gathererB.afterTimespan).not.toHaveBeenCalled();
  });

  it('should support artifact dependencies', async () => {
    const dependencySymbol = Symbol('dep');
    gathererA.meta.symbol = dependencySymbol;
    // @ts-expect-error - the default fixture was defined as one without dependencies.
    gathererB.meta.dependencies = {ImageElements: dependencySymbol};

    const timespan = await startTimespan({page, config});
    await timespan.endTimespan();
    const artifacts = await mockRunnerRun.mock.calls[0][0];
    expect(artifacts).toMatchObject({A: 'Artifact A', B: 'Artifact B'});
    expect(gathererB.afterTimespan.mock.calls[0][0]).toMatchObject({
      dependencies: {
        ImageElements: 'Artifact A',
      },
    });
  });
});
