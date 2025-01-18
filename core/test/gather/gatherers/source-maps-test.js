/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import SourceMaps from '../../../gather/gatherers/source-maps.js';
import {createMockDriver} from '../mock-driver.js';

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
   * `script` mocks the `sourceMapURL` and `url` seen from the protocol.
   * `map` mocks the (JSON) of the source maps that `Runtime.evaluate` returns.
   * `resolvedSourceMapUrl` is used to assert that the SourceMaps gatherer is using the expected
   *                        url to fetch the source map.
   * `fetchError` mocks an error that happens in the page. Only fetch error message make sense.
   * @param {Array<{script: LH.Artifacts.Script, map: string, status?: number, resolvedSourceMapUrl?: string, fetchError: string}>} mapsAndScripts
   * @return {Promise<LH.Artifacts['SourceMaps']>}
   */
  async function runSourceMaps(mapsAndScripts) {
    // pre-condition: should only define map or fetchError, not both.
    for (const {map, fetchError} of mapsAndScripts) {
      if (map && fetchError) {
        throw new Error('should only define map or fetchError, not both.');
      }
    }

    const driver = createMockDriver();

    const Scripts = [];

    for (const mapAndScript of mapsAndScripts) {
      const {
        script,
        map,
        status = null,
        resolvedSourceMapUrl,
        fetchError,
      } = mapAndScript;

      Scripts.push(script);

      if (script.sourceMapURL.startsWith('data:')) {
        // Only the source maps that need to be fetched use the `fetchMock` code path.
        continue;
      }

      driver.fetcher.fetchResource.mockImplementationOnce(async (sourceMapUrl) => {
        // Check that the source map url was resolved correctly.
        if (resolvedSourceMapUrl) {
          expect(sourceMapUrl).toBe(resolvedSourceMapUrl);
        }

        if (fetchError) {
          throw new Error(fetchError);
        }

        return {content: map, status};
      });
    }

    const sourceMaps = new SourceMaps();
    return sourceMaps.getArtifact({driver, dependencies: {Scripts}});
  }

  function makeJsonDataUrl(data) {
    return 'data:application/json;charset=utf-8;base64,' + Buffer.from(data).toString('base64');
  }

  it('ignores script with no source map url', async () => {
    const artifact = await runSourceMaps([
      {
        script: {
          name: 'http://www.example.com/script.js',
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
        script: {
          name: 'http://www.example.com/bundle.js',
          sourceMapURL: 'http://www.example.com/bundle.js.map',
        },
        map: mapJson,
        resolvedSourceMapUrl: 'http://www.example.com/bundle.js.map',
      },
    ];
    const artifact = await runSourceMaps(mapsAndEvents);
    expect(artifact).toEqual([
      {
        scriptUrl: mapsAndEvents[0].script.name,
        sourceMapUrl: mapsAndEvents[0].script.sourceMapURL,
        map: JSON.parse(mapsAndEvents[0].map),
      },
    ]);
  });

  it('fetches map for script with relative source map url', async () => {
    const mapsAndEvents = [
      {
        script: {
          name: 'http://www.example.com/path/bundle.js',
          sourceMapURL: 'bundle.js.map',
        },
        map: mapJson,
        resolvedSourceMapUrl: 'http://www.example.com/path/bundle.js.map',
      },
      {
        script: {
          name: 'http://www.example.com/path/bundle.js',
          sourceMapURL: '../bundle.js.map',
        },
        map: mapJson,
        resolvedSourceMapUrl: 'http://www.example.com/bundle.js.map',
      },
      {
        script: {
          name: 'http://www.example.com/path/bundle.js',
          sourceMapURL: 'http://www.example-2.com/path/bundle.js',
        },
        map: mapJson,
        resolvedSourceMapUrl: 'http://www.example-2.com/path/bundle.js',
      },
    ];
    const artifacts = await runSourceMaps(mapsAndEvents);
    expect(artifacts).toEqual([
      {
        scriptUrl: mapsAndEvents[0].script.name,
        sourceMapUrl: 'http://www.example.com/path/bundle.js.map',
        map: JSON.parse(mapsAndEvents[0].map),
      },
      {
        scriptUrl: mapsAndEvents[1].script.name,
        sourceMapUrl: 'http://www.example.com/bundle.js.map',
        map: JSON.parse(mapsAndEvents[1].map),
      },
      {
        scriptUrl: mapsAndEvents[2].script.name,
        sourceMapUrl: mapsAndEvents[2].script.sourceMapURL,
        map: JSON.parse(mapsAndEvents[2].map),
      },
    ]);
  });

  it('throws an error message when fetching map returns bad status code', async () => {
    const mapsAndEvents = [
      {
        script: {
          name: 'http://www.example.com/bundle.js',
          sourceMapURL: 'http://www.example.com/bundle.js.map',
        },
        status: 404,
        map: null,
      },
    ];
    const artifact = await runSourceMaps(mapsAndEvents);
    expect(artifact).toEqual([
      {
        scriptUrl: mapsAndEvents[0].script.name,
        sourceMapUrl: mapsAndEvents[0].script.sourceMapURL,
        errorMessage: 'Error: Failed fetching source map (404)',
        map: undefined,
      },
    ]);
  });

  it('generates an error message when fetching map fails', async () => {
    const mapsAndEvents = [
      {
        script: {
          name: 'http://www.example.com/bundle.js',
          sourceMapURL: 'http://www.example.com/bundle.js.map',
        },
        fetchError: 'Failed fetching source map',
      },
    ];
    const artifact = await runSourceMaps(mapsAndEvents);
    expect(artifact).toEqual([
      {
        scriptUrl: mapsAndEvents[0].script.name,
        sourceMapUrl: mapsAndEvents[0].script.sourceMapURL,
        errorMessage: 'Error: Failed fetching source map',
        map: undefined,
      },
    ]);
  });

  it('generates an error message when map url cannot be resolved', async () => {
    const mapsAndEvents = [
      {
        script: {
          name: 'http://www.example.com/bundle.js',
          sourceMapURL: 'http://',
        },
      },
    ];
    const artifact = await runSourceMaps(mapsAndEvents);
    expect(artifact).toEqual([
      {
        scriptUrl: mapsAndEvents[0].script.name,
        sourceMapUrl: undefined,
        errorMessage: 'Could not resolve map url: http://',
        map: undefined,
      },
    ]);
  });

  it('generates an error message when parsing map fails', async () => {
    const mapsAndEvents = [
      {
        script: {
          name: 'http://www.example.com/bundle.js',
          sourceMapURL: 'http://www.example.com/bundle.js.map',
        },
        map: '{{}',
      },
      {
        script: {
          name: 'http://www.example.com/bundle-2.js',
          sourceMapURL: makeJsonDataUrl('{};'),
        },
      },
    ];
    const artifact = await runSourceMaps(mapsAndEvents);
    expect(artifact).toEqual([
      {
        scriptUrl: mapsAndEvents[0].script.name,
        sourceMapUrl: mapsAndEvents[0].script.sourceMapURL,
        // This message was changed in Node 20, check for old and new versions.
        // eslint-disable-next-line max-len
        errorMessage: expect.stringMatching(/(Expected property name|Unexpected token).*at position 1/),
        map: undefined,
      },
      {
        scriptUrl: mapsAndEvents[1].script.name,
        sourceMapUrl: undefined,
        // This message was changed in Node 20, check for old and new versions.
        // eslint-disable-next-line max-len
        errorMessage: expect.stringMatching(/(Unexpected non-whitespace|Unexpected token).*at position 2/),
        map: undefined,
      },
    ]);
  });
});
