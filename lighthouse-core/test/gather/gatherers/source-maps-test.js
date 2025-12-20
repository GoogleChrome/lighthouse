/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

jest.useFakeTimers();

const Driver = require('../../../gather/driver.js');
const Connection = require('../../../gather/connections/connection.js');
const SourceMaps = require('../../../gather/gatherers/source-maps.js');
const {createMockSendCommandFn, createMockOnFn} = require('../mock-commands.js');

const mapJson = JSON.stringify({
  version: 3,
  file: 'out.js',
  sourceRoot: '',
  sources: ['foo.js', 'bar.js'],
  names: ['src', 'maps', 'are', 'fun'],
  mappings: 'AAgBC,SAAQ,CAAEA',
});

describe('SourceMaps gatherer', () => {
  /**
   * `scriptParsedEvent` mocks the `sourceMapURL` and `url` seen from the protocol.
   * `map` mocks the (JSON) of the source maps that `Runtime.evaluate` returns.
   * `resolvedSourceMapUrl` is used to assert that the SourceMaps gatherer is using the expected
   *                        url to fetch the source map.
   * `fetchError` mocks an error that happens in the page. Only fetch error message make sense.
   * @param {Array<{scriptParsedEvent: LH.Crdp.Debugger.ScriptParsedEvent, map: string, resolvedSourceMapUrl?: string, fetchError: string}>} mapsAndEvents
   * @return {Promise<LH.Artifacts['SourceMaps']>}
   */
  async function runSourceMaps(mapsAndEvents) {
    // pre-condition: should only define map or fetchError, not both.
    for (const {map, fetchError} of mapsAndEvents) {
      if (map && fetchError) {
        throw new Error('should only define map or fetchError, not both.');
      }
    }

    const onMock = createMockOnFn();
    const sendCommandMock = createMockSendCommandFn()
      .mockResponse('Debugger.enable', {})
      .mockResponse('Debugger.disable', {})
      .mockResponse('Fetch.enable', {})
      .mockResponse('Fetch.disable', {});
    const fetchMock = jest.fn();

    for (const {scriptParsedEvent, map, resolvedSourceMapUrl, fetchError} of mapsAndEvents) {
      onMock.mockEvent('protocolevent', {
        method: 'Debugger.scriptParsed',
        params: scriptParsedEvent,
      });

      if (scriptParsedEvent.sourceMapURL.startsWith('data:')) {
        // Only the source maps that need to be fetched use the `fetchMock` code path.
        continue;
      }

      fetchMock.mockImplementationOnce(async (sourceMapUrl) => {
        // Check that the source map url was resolved correctly.
        if (resolvedSourceMapUrl) {
          expect(sourceMapUrl).toBe(resolvedSourceMapUrl);
        }

        if (fetchError) {
          throw new Error(fetchError);
        }

        return map;
      });
    }
    const connectionStub = new Connection();
    connectionStub.sendCommand = sendCommandMock;
    connectionStub.on = onMock;

    const driver = new Driver(connectionStub);
    driver.fetcher.fetchResource = fetchMock;

    const sourceMaps = new SourceMaps();
    await sourceMaps.beforePass({driver});
    jest.advanceTimersByTime(1);
    return sourceMaps.afterPass({driver});
  }

  function makeJsonDataUrl(data) {
    return 'data:application/json;charset=utf-8;base64,' + Buffer.from(data).toString('base64');
  }

  it('ignores script with no source map url', async () => {
    const artifact = await runSourceMaps([
      {
        scriptParsedEvent: {
          url: 'http://www.example.com/script.js',
          sourceMapURL: '',
        },
        map: null,
      },
    ]);
    expect(artifact).toEqual([]);
  });

  it('fetches map for script with source map url', async () => {
    const mapsAndEvents = [
      {
        scriptParsedEvent: {
          url: 'http://www.example.com/bundle.js',
          sourceMapURL: 'http://www.example.com/bundle.js.map',
        },
        map: mapJson,
        resolvedSourceMapUrl: 'http://www.example.com/bundle.js.map',
      },
    ];
    const artifact = await runSourceMaps(mapsAndEvents);
    expect(artifact).toEqual([
      {
        scriptUrl: mapsAndEvents[0].scriptParsedEvent.url,
        sourceMapUrl: mapsAndEvents[0].scriptParsedEvent.sourceMapURL,
        map: JSON.parse(mapsAndEvents[0].map),
      },
    ]);
  });

  it('fetches map for script with relative source map url', async () => {
    const mapsAndEvents = [
      {
        scriptParsedEvent: {
          url: 'http://www.example.com/path/bundle.js',
          sourceMapURL: 'bundle.js.map',
        },
        map: mapJson,
        resolvedSourceMapUrl: 'http://www.example.com/path/bundle.js.map',
      },
      {
        scriptParsedEvent: {
          url: 'http://www.example.com/path/bundle.js',
          sourceMapURL: '../bundle.js.map',
        },
        map: mapJson,
        resolvedSourceMapUrl: 'http://www.example.com/bundle.js.map',
      },
      {
        scriptParsedEvent: {
          url: 'http://www.example.com/path/bundle.js',
          sourceMapURL: 'http://www.example-2.com/path/bundle.js',
        },
        map: mapJson,
        resolvedSourceMapUrl: 'http://www.example-2.com/path/bundle.js',
      },
    ];
    const artifacts = await runSourceMaps(mapsAndEvents);
    expect(artifacts).toEqual([
      {
        scriptUrl: mapsAndEvents[0].scriptParsedEvent.url,
        sourceMapUrl: 'http://www.example.com/path/bundle.js.map',
        map: JSON.parse(mapsAndEvents[0].map),
      },
      {
        scriptUrl: mapsAndEvents[1].scriptParsedEvent.url,
        sourceMapUrl: 'http://www.example.com/bundle.js.map',
        map: JSON.parse(mapsAndEvents[1].map),
      },
      {
        scriptUrl: mapsAndEvents[2].scriptParsedEvent.url,
        sourceMapUrl: mapsAndEvents[2].scriptParsedEvent.sourceMapURL,
        map: JSON.parse(mapsAndEvents[2].map),
      },
    ]);
  });

  it('generates an error message when fetching map fails', async () => {
    const mapsAndEvents = [
      {
        scriptParsedEvent: {
          url: 'http://www.example.com/bundle.js',
          sourceMapURL: 'http://www.example.com/bundle.js.map',
        },
        fetchError: 'Failed fetching source map',
      },
    ];
    const artifact = await runSourceMaps(mapsAndEvents);
    expect(artifact).toEqual([
      {
        scriptUrl: mapsAndEvents[0].scriptParsedEvent.url,
        sourceMapUrl: mapsAndEvents[0].scriptParsedEvent.sourceMapURL,
        errorMessage: 'Error: Failed fetching source map',
        map: undefined,
      },
    ]);
  });

  it('generates an error message when map url cannot be resolved', async () => {
    const mapsAndEvents = [
      {
        scriptParsedEvent: {
          url: 'http://www.example.com/bundle.js',
          sourceMapURL: 'http://',
        },
      },
    ];
    const artifact = await runSourceMaps(mapsAndEvents);
    expect(artifact).toEqual([
      {
        scriptUrl: mapsAndEvents[0].scriptParsedEvent.url,
        sourceMapUrl: undefined,
        errorMessage: 'Could not resolve map url: http://',
        map: undefined,
      },
    ]);
  });

  it('generates an error message when parsing map fails', async () => {
    const mapsAndEvents = [
      {
        scriptParsedEvent: {
          url: 'http://www.example.com/bundle.js',
          sourceMapURL: 'http://www.example.com/bundle.js.map',
        },
        map: '{{}',
      },
      {
        scriptParsedEvent: {
          url: 'http://www.example.com/bundle-2.js',
          sourceMapURL: makeJsonDataUrl('{};'),
        },
      },
    ];
    const artifact = await runSourceMaps(mapsAndEvents);
    expect(artifact).toEqual([
      {
        scriptUrl: mapsAndEvents[0].scriptParsedEvent.url,
        sourceMapUrl: mapsAndEvents[0].scriptParsedEvent.sourceMapURL,
        errorMessage: 'SyntaxError: Unexpected token { in JSON at position 1',
        map: undefined,
      },
      {
        scriptUrl: mapsAndEvents[1].scriptParsedEvent.url,
        sourceMapUrl: undefined,
        errorMessage: 'SyntaxError: Unexpected token ; in JSON at position 2',
        map: undefined,
      },
    ]);
  });
});
