/**
 * @license Copyright 2017 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

jest.useFakeTimers();

const StartUrlGatherer = require('../../../gather/gatherers/start-url.js');
const parseManifest = require('../../../lib/manifest-parser.js');

describe('StartUrl Gatherer', () => {
  let mockDriver;
  let gatherer;

  function createArtifactsWithURL(url) {
    return {
      WebAppManifest: {value: {start_url: {value: url}}},
      InstallabilityErrors: {errors: []},
    };
  }

  function unimplemented() {
    throw new Error('Unimplemented');
  }

  beforeEach(() => {
    gatherer = new StartUrlGatherer();
    mockDriver = {
      goOffline: unimplemented,
      goOnline: unimplemented,
      evaluateAsync: unimplemented,
      on: unimplemented,
      off: unimplemented,
    };
  });

  afterEach(() => {
    jest.advanceTimersByTime(5000);
  });

  it('returns a explanation when manifest cannot be found', async () => {
    mockDriver.goOffline = jest.fn();
    mockDriver.goOnline = jest.fn();

    const passContext = {
      baseArtifacts: {WebAppManifest: null},
      driver: mockDriver,
    };

    const result = await gatherer.afterPass(passContext);
    expect(result).toEqual({
      statusCode: -1,
      explanation: 'No usable web app manifest found on page.',
    });
  });

  it('returns a explanation when manifest cannot be parsed', async () => {
    mockDriver.goOffline = jest.fn();
    mockDriver.goOnline = jest.fn();

    const passContext = {
      baseArtifacts: {
        WebAppManifest: parseManifest(
          'this is invalid',
          'https://example.com/manifest.json',
          'https://example.com/'),
        InstallabilityErrors: {errors: []},
      },
      driver: mockDriver,
    };

    const result = await gatherer.afterPass(passContext);
    expect(result).toEqual({
      statusCode: -1,
      explanation:
        `Error fetching web app manifest: ERROR: file isn't valid JSON: ` +
        `SyntaxError: Unexpected token h in JSON at position 1.`,
    });
  });

  it('sets the status code to -1 when navigation fails', async () => {
    mockDriver.goOffline = jest.fn();
    mockDriver.goOnline = jest.fn();
    mockDriver.evaluateAsync = jest.fn().mockRejectedValue(new Error('Fetch failed'));
    mockDriver.on = jest.fn();
    mockDriver.off = jest.fn();

    const passContext = {
      baseArtifacts: createArtifactsWithURL('https://example.com/'),
      driver: mockDriver,
    };

    const result = await gatherer.afterPass(passContext);
    expect(mockDriver.goOffline).toHaveBeenCalled();
    expect(mockDriver.goOnline).toHaveBeenCalled();
    expect(result).toEqual({
      url: 'https://example.com/',
      statusCode: -1,
      explanation: 'Error while fetching start_url via service worker.',
    });
  });

  it('sets the status code to page status code', async () => {
    mockDriver.goOffline = jest.fn();
    mockDriver.goOnline = jest.fn();
    mockDriver.evaluateAsync = jest.fn().mockResolvedValue();
    mockDriver.on = jest.fn();
    mockDriver.off = jest.fn();

    const passContext = {
      baseArtifacts: createArtifactsWithURL('https://example.com/'),
      driver: mockDriver,
    };

    const response = {
      url: 'https://example.com/',
      status: 200,
      fromServiceWorker: true,
    };

    mockDriver.on.mockImplementation((_, onResponseReceived) => onResponseReceived({response}));

    const result = await gatherer.afterPass(passContext);
    expect(mockDriver.goOffline).toHaveBeenCalled();
    expect(mockDriver.goOnline).toHaveBeenCalled();
    expect(result).toEqual({
      url: 'https://example.com/',
      statusCode: 200,
    });
  });

  it('sets the status code to -1 when not from service worker', async () => {
    mockDriver.goOffline = jest.fn();
    mockDriver.goOnline = jest.fn();
    mockDriver.evaluateAsync = jest.fn().mockResolvedValue();
    mockDriver.on = jest.fn();
    mockDriver.off = jest.fn();

    const passContext = {
      baseArtifacts: createArtifactsWithURL('https://example.com/'),
      driver: mockDriver,
    };

    const response = {
      url: 'https://example.com/',
      status: 200,
      fromServiceWorker: false,
    };

    mockDriver.on.mockImplementation((_, onResponseReceived) => onResponseReceived({response}));

    const result = await gatherer.afterPass(passContext);
    expect(mockDriver.goOffline).toHaveBeenCalled();
    expect(mockDriver.goOnline).toHaveBeenCalled();
    expect(result).toEqual({
      url: 'https://example.com/',
      statusCode: -1,
      explanation: 'The start_url did respond, but not via a service worker.',
    });
  });

  it('sets the status code to -1 when times out waiting for a matching url', async () => {
    mockDriver.goOffline = jest.fn();
    mockDriver.goOnline = jest.fn();
    mockDriver.evaluateAsync = jest.fn().mockResolvedValue();
    mockDriver.on = jest.fn();
    mockDriver.off = jest.fn();

    const passContext = {
      baseArtifacts: createArtifactsWithURL('https://example.com/'),
      driver: mockDriver,
    };

    const response = {
      url: 'https://random-other-url.com/',
      status: 200,
      fromServiceWorker: true,
    };

    mockDriver.on.mockImplementation((_, onResponseReceived) => onResponseReceived({response}));

    const resultPromise = gatherer.afterPass(passContext);
    // Wait a tick for the evaluateAsync promise resolution to hold for the timer.
    await Promise.resolve();
    // Skip past our timeout of 3000.
    jest.advanceTimersByTime(5000);
    const result = await resultPromise;

    expect(mockDriver.goOffline).toHaveBeenCalled();
    expect(mockDriver.goOnline).toHaveBeenCalled();
    expect(result).toEqual({
      url: 'https://example.com/',
      statusCode: -1,
      explanation: 'Timed out waiting for start_url (https://example.com/) to respond.',
    });
  });

  it('navigates *while* offline', async () => {
    const callsAtNavigationTime = [];
    mockDriver.goOffline = jest.fn();
    mockDriver.goOnline = jest.fn();
    mockDriver.evaluateAsync = async () => {
      callsAtNavigationTime.push(
        ...mockDriver.goOffline.mock.calls.map(() => 'offline'),
        ...mockDriver.goOnline.mock.calls.map(() => 'online')
      );
    };
    mockDriver.on = jest.fn();
    mockDriver.off = jest.fn();

    const passContext = {
      baseArtifacts: createArtifactsWithURL('https://example.com/'),
      driver: mockDriver,
    };

    const response = {
      url: 'https://example.com/',
      status: 200,
      fromServiceWorker: true,
    };

    mockDriver.on.mockImplementation((_, onResponseReceived) => onResponseReceived({response}));
    const result = await gatherer.afterPass(passContext);
    expect(callsAtNavigationTime).toEqual(['offline']);
    expect(result).toEqual({
      url: 'https://example.com/',
      statusCode: 200,
    });
  });
});
