/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const assetSaver = require('../../lib/asset-saver.js');
const Metrics = require('../../lib/traces/pwmetrics-events.js');
const assert = require('assert').strict;
const fs = require('fs');
const rimraf = require('rimraf');
const LHError = require('../../lib/lh-error.js');

const traceEvents = require('../fixtures/traces/progressive-app.json');
const dbwTrace = require('../results/artifacts/defaultPass.trace.json');
const dbwResults = require('../results/sample_v2.json');
const Audit = require('../../audits/audit.js');
const fullTraceObj = require('../fixtures/traces/progressive-app-m60.json');
const devtoolsLog = require('../fixtures/traces/progressive-app-m60.devtools.log.json');

// deepStrictEqual can hang on a full trace, we assert trace same-ness like so
function assertTraceEventsEqual(traceEventsA, traceEventsB) {
  assert.equal(traceEventsA.length, traceEventsB.length);
  traceEventsA.forEach((evt, i) => {
    assert.deepStrictEqual(evt, traceEventsB[i]);
  });
}

/* eslint-env jest */
describe('asset-saver helper', () => {
  describe('saves files', function() {
    beforeAll(() => {
      const artifacts = {
        devtoolsLogs: {
          [Audit.DEFAULT_PASS]: [{message: 'first'}, {message: 'second'}],
        },
        traces: {
          [Audit.DEFAULT_PASS]: {
            traceEvents,
          },
        },
      };

      return assetSaver.saveAssets(artifacts, dbwResults.audits, process.cwd() + '/the_file');
    });

    it('trace file saved to disk with only trace events', () => {
      const traceFilename = 'the_file-0.trace.json';
      const traceFileContents = fs.readFileSync(traceFilename, 'utf8');
      const traceEventsFromDisk = JSON.parse(traceFileContents).traceEvents;
      assertTraceEventsEqual(traceEventsFromDisk, traceEvents);
      fs.unlinkSync(traceFilename);
    });

    it('devtools log file saved to disk with data', () => {
      const filename = 'the_file-0.devtoolslog.json';
      const fileContents = fs.readFileSync(filename, 'utf8');
      assert.ok(fileContents.includes('"message": "first"'));
      fs.unlinkSync(filename);
    });
  });

  describe('prepareAssets', () => {
    it('adds fake events to trace', () => {
      const countEvents = trace => trace.traceEvents.length;
      const mockArtifacts = {
        devtoolsLogs: {},
        traces: {
          defaultPass: dbwTrace,
        },
      };
      const beforeCount = countEvents(dbwTrace);
      return assetSaver.prepareAssets(mockArtifacts, dbwResults.audits).then(preparedAssets => {
        const afterCount = countEvents(preparedAssets[0].traceData);
        const metricsSansNavStart = Metrics.metricsDefinitions.length - 1;
        assert.equal(afterCount, beforeCount + (2 * metricsSansNavStart), 'unexpected event count');
      });
    });
  });

  describe('saveTrace', () => {
    const traceFilename = 'test-trace-0.json';

    afterEach(() => {
      fs.unlinkSync(traceFilename);
    });

    it('correctly saves a trace with metadata to disk', () => {
      return assetSaver.saveTrace(fullTraceObj, traceFilename)
        .then(_ => {
          const traceFileContents = fs.readFileSync(traceFilename, 'utf8');
          const traceEventsFromDisk = JSON.parse(traceFileContents).traceEvents;
          assertTraceEventsEqual(traceEventsFromDisk, fullTraceObj.traceEvents);
        });
    }, 10000);

    it('correctly saves a trace with no trace events to disk', () => {
      const trace = {
        traceEvents: [],
        metadata: {
          'clock-domain': 'MAC_MACH_ABSOLUTE_TIME',
          'cpu-family': 6,
          'cpu-model': 70,
          'cpu-stepping': 1,
          'field-trials': [],
        },
      };

      return assetSaver.saveTrace(trace, traceFilename)
        .then(_ => {
          const traceFileContents = fs.readFileSync(traceFilename, 'utf8');
          assert.deepStrictEqual(JSON.parse(traceFileContents), trace);
        });
    });

    it('correctly saves a trace with multiple extra properties to disk', () => {
      const trace = {
        traceEvents,
        metadata: fullTraceObj.metadata,
        someProp: 555,
        anotherProp: {
          unlikely: {
            nested: [
              'value',
            ],
          },
        },
      };

      return assetSaver.saveTrace(trace, traceFilename)
        .then(_ => {
          const traceFileContents = fs.readFileSync(traceFilename, 'utf8');
          const traceEventsFromDisk = JSON.parse(traceFileContents).traceEvents;
          assertTraceEventsEqual(traceEventsFromDisk, trace.traceEvents);
        });
    });

    it('can save traces over 256MB (slow)', () => {
      // Create a trace that wil be longer than 256MB when stringified, the hard
      // limit of a string in v8.
      // https://mobile.twitter.com/bmeurer/status/879276976523157505
      const baseEventsLength = JSON.stringify(traceEvents).length;
      const countNeeded = Math.ceil(Math.pow(2, 28) / baseEventsLength);
      let longTraceEvents = [];
      for (let i = 0; i < countNeeded; i++) {
        longTraceEvents = longTraceEvents.concat(traceEvents);
      }
      const trace = {
        traceEvents: longTraceEvents,
      };

      return assetSaver.saveTrace(trace, traceFilename)
        .then(_ => {
          const fileStats = fs.lstatSync(traceFilename);
          assert.ok(fileStats.size > Math.pow(2, 28));
        });
    }, 40 * 1000);
  });

  describe('loadArtifacts', () => {
    it('loads artifacts from disk', async () => {
      const artifactsPath = __dirname + '/../fixtures/artifacts/perflog/';
      const artifacts = await assetSaver.loadArtifacts(artifactsPath);
      assert.strictEqual(artifacts.LighthouseRunWarnings.length, 2);
      assert.strictEqual(artifacts.URL.requestedUrl, 'https://www.reddit.com/r/nba');
      assert.strictEqual(artifacts.devtoolsLogs.defaultPass.length, 555);
      assert.strictEqual(artifacts.traces.defaultPass.traceEvents.length, 12);
    });
  });

  describe('JSON serialization', () => {
    const outputPath = __dirname + '/json-serialization-test-data/';

    afterEach(() => {
      rimraf.sync(outputPath);
    });

    it('round trips saved artifacts', async () => {
      const artifactsPath = __dirname + '/../results/artifacts/';
      const originalArtifacts = await assetSaver.loadArtifacts(artifactsPath);

      await assetSaver.saveArtifacts(originalArtifacts, outputPath);
      const roundTripArtifacts = await assetSaver.loadArtifacts(outputPath);
      expect(roundTripArtifacts).toStrictEqual(originalArtifacts);
    });

    it('round trips artifacts with an Error member', async () => {
      const error = new Error('Connection refused by server');
      // test code to make sure e.g. Node errors get serialized well.
      error.code = 'ECONNREFUSED';

      const artifacts = {
        traces: {},
        devtoolsLogs: {},
        ViewportDimensions: error,
      };

      await assetSaver.saveArtifacts(artifacts, outputPath);
      const roundTripArtifacts = await assetSaver.loadArtifacts(outputPath);
      expect(roundTripArtifacts).toStrictEqual(artifacts);

      expect(roundTripArtifacts.ViewportDimensions).toBeInstanceOf(Error);
      expect(roundTripArtifacts.ViewportDimensions.code).toEqual('ECONNREFUSED');
      expect(roundTripArtifacts.ViewportDimensions.stack).toMatch(
        /^Error: Connection refused by server.*test[\\/]lib[\\/]asset-saver-test\.js/s);
    });

    it('round trips artifacts with an LHError member', async () => {
      // Use an LHError that has an ICU replacement.
      const protocolMethod = 'Page.getFastness';
      const lhError = new LHError(LHError.errors.PROTOCOL_TIMEOUT, {protocolMethod});

      const artifacts = {
        traces: {},
        devtoolsLogs: {},
        ScriptElements: lhError,
      };

      await assetSaver.saveArtifacts(artifacts, outputPath);
      const roundTripArtifacts = await assetSaver.loadArtifacts(outputPath);
      expect(roundTripArtifacts).toStrictEqual(artifacts);

      expect(roundTripArtifacts.ScriptElements).toBeInstanceOf(LHError);
      expect(roundTripArtifacts.ScriptElements.code).toEqual('PROTOCOL_TIMEOUT');
      expect(roundTripArtifacts.ScriptElements.protocolMethod).toEqual(protocolMethod);
      expect(roundTripArtifacts.ScriptElements.stack).toMatch(
          /^LHError: PROTOCOL_TIMEOUT.*test[\\/]lib[\\/]asset-saver-test\.js/s);
      expect(roundTripArtifacts.ScriptElements.friendlyMessage)
        .toBeDisplayString(/\(Method: Page\.getFastness\)/);
    });
  });

  describe('saveLanternNetworkData', () => {
    const outputFilename = 'test-lantern-network-data.json';

    afterEach(() => {
      fs.unlinkSync(outputFilename);
    });

    it('saves the network analysis to disk', async () => {
      await assetSaver.saveLanternNetworkData(devtoolsLog, outputFilename);

      const results = JSON.parse(fs.readFileSync(outputFilename, 'utf8'));

      expect(results).toEqual({
        additionalRttByOrigin: {
          'https://pwa.rocks': expect.any(Number),
          'https://www.google-analytics.com': expect.any(Number),
          'https://www.googletagmanager.com': expect.any(Number),
        },
        serverResponseTimeByOrigin: {
          'https://pwa.rocks': expect.any(Number),
          'https://www.google-analytics.com': expect.any(Number),
          'https://www.googletagmanager.com': expect.any(Number),
        },
      });
    });
  });
});
