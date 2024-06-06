/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';
import fs from 'fs';

import * as assetSaver from '../../lib/asset-saver.js';
import {MetricTraceEvents} from '../../lib/traces/metric-trace-events.js';
import {LighthouseError} from '../../lib/lh-error.js';
import {LH_ROOT} from '../../../shared/root.js';
import {getModuleDirectory} from '../../../shared/esm-utils.js';
import {readJson} from '../test-utils.js';

const traceEvents = readJson('../fixtures/traces/progressive-app.json', import.meta);
const dbwTrace = readJson('../results/artifacts/defaultPass.trace.json', import.meta);
const dbwResults = readJson('../results/sample_v2.json', import.meta);
const fullTraceObj = readJson('../fixtures/traces/progressive-app-m60.json', import.meta);
const devtoolsLog = readJson('../fixtures/traces/progressive-app-m60.devtools.log.json', import.meta);

const moduleDir = getModuleDirectory(import.meta);

// deepStrictEqual can hang on a full trace, we assert trace same-ness like so
function assertTraceEventsEqual(traceEventsA, traceEventsB) {
  assert.equal(traceEventsA.length, traceEventsB.length);
  traceEventsA.forEach((evt, i) => {
    assert.deepStrictEqual(evt, traceEventsB[i]);
  });
}
describe('asset-saver helper', () => {
  describe('saves files', function() {
    const tmpDir = `${LH_ROOT}/.tmp/asset-saver-test`;

    before(async () => {
      fs.mkdirSync(tmpDir, {recursive: true});
      const artifacts = {
        DevtoolsLog: [{message: 'first'}, {message: 'second'}],
        Trace: {traceEvents},
      };

      await assetSaver.saveAssets(artifacts, dbwResults.audits, `${tmpDir}/the_file`);
    });

    it('trace file saved to disk with trace events and extra fakeEvents', () => {
      const traceFilename = tmpDir + '/the_file-0.trace.json';
      const traceFileContents = fs.readFileSync(traceFilename, 'utf8');
      const traceEventsOnDisk = JSON.parse(traceFileContents).traceEvents;
      const traceEventsWithoutExtrasOnDisk = traceEventsOnDisk.slice(0, traceEvents.length);
      const traceEventsFake = traceEventsOnDisk.slice(traceEvents.length);
      assertTraceEventsEqual(traceEventsWithoutExtrasOnDisk, traceEvents);
      assert.equal(traceEventsFake.length, 16);
      fs.unlinkSync(traceFilename);
    });

    it('devtools log file saved to disk with data', () => {
      const filename = tmpDir + '/the_file-0.devtoolslog.json';
      const fileContents = fs.readFileSync(filename, 'utf8');
      assert.ok(fileContents.includes('"message":"first"'));
      fs.unlinkSync(filename);
    });

    it('skips trace when undefined', async () => {
      const noTracePrefix = tmpDir + '/the_file_no_trace';
      const artifacts = {
        DevtoolsLog: [{message: 'first'}, {message: 'second'}],
      };
      await assetSaver.saveAssets(artifacts, dbwResults.audits, noTracePrefix);

      assert.ok(fs.existsSync(noTracePrefix + '-0.devtoolslog.json'));
      fs.unlinkSync(noTracePrefix + '-0.devtoolslog.json');

      assert.ok(!fs.existsSync(noTracePrefix + '-0.trace.json'));
    });

    it('skips dt log when undefined', async () => {
      const noDtLogPrefix = tmpDir + '/the_file_no_dt';
      const artifacts = {
        Trace: {traceEvents},
      };
      await assetSaver.saveAssets(artifacts, dbwResults.audits, noDtLogPrefix);

      assert.ok(!fs.existsSync(noDtLogPrefix + '-0.devtoolslog.json'));

      assert.ok(fs.existsSync(noDtLogPrefix + '-0.trace.json'));
      fs.unlinkSync(noDtLogPrefix + '-0.trace.json');
    });
  });

  describe('prepareAssets', () => {
    it('adds fake events to trace', () => {
      const countEvents = trace => trace.traceEvents.length;
      const mockArtifacts = {
        Trace: dbwTrace,
      };
      const beforeCount = countEvents(dbwTrace);
      return assetSaver.prepareAssets(mockArtifacts, dbwResults.audits).then(preparedAssets => {
        const afterCount = countEvents(preparedAssets[0].traceData);
        const metricsMinusTimeOrigin = MetricTraceEvents.metricsDefinitions.length - 1;
        assert.equal(afterCount, beforeCount + (2 * metricsMinusTimeOrigin));
      });
    });

    it('adds fake events to error trace', () => {
      const countEvents = trace => trace.traceEvents.length;
      const mockArtifacts = {
        TraceError: dbwTrace,
      };
      const beforeCount = countEvents(dbwTrace);
      return assetSaver.prepareAssets(mockArtifacts, dbwResults.audits).then(preparedAssets => {
        const afterCount = countEvents(preparedAssets[0].traceData);
        const metricsMinusTimeOrigin = MetricTraceEvents.metricsDefinitions.length - 1;
        assert.equal(afterCount, beforeCount + (2 * metricsMinusTimeOrigin));
      });
    });
  });

  describe('saveTrace', () => {
    const traceFilename = `${LH_ROOT}/.tmp/test-trace-0.json`;

    before(() => {
      fs.mkdirSync(`${LH_ROOT}/.tmp`, {recursive: true});
    });

    afterEach(() => {
      fs.unlinkSync(traceFilename);
    });

    it('prints traces with an event per line', async () => {
      const trace = {
        traceEvents: [
          {args: {}, cat: 'devtools.timeline', pid: 1, ts: 2},
          {args: {}, cat: 'v8', pid: 1, ts: 3},
          {args: {IsMainFrame: true}, cat: 'v8', pid: 1, ts: 5},
          {args: {data: {encodedDataLength: 20, requestId: '1.22'}}, pid: 1, ts: 6},
        ],
        metadata: {'cpu-model': 9001, 'network-type': 'Unknown'},
      };
      await assetSaver.saveTrace(trace, traceFilename);

      const traceFileContents = fs.readFileSync(traceFilename, 'utf8');
      expect(traceFileContents).toEqual(
`{
"traceEvents": [
  {"args":{},"cat":"devtools.timeline","pid":1,"ts":2},
  {"args":{},"cat":"v8","pid":1,"ts":3},
  {"args":{"IsMainFrame":true},"cat":"v8","pid":1,"ts":5},
  {"args":{"data":{"encodedDataLength":20,"requestId":"1.22"}},"pid":1,"ts":6}
],
"metadata": {
  "cpu-model": 9001,
  "network-type": "Unknown"
}}
`);
    });

    it('correctly saves a trace with metadata to disk', () => {
      return assetSaver.saveTrace(fullTraceObj, traceFilename)
        .then(_ => {
          const traceFileContents = fs.readFileSync(traceFilename, 'utf8');
          const traceEventsFromDisk = JSON.parse(traceFileContents).traceEvents;
          assertTraceEventsEqual(traceEventsFromDisk, fullTraceObj.traceEvents);
        });
    });

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

  describe('saveDevtoolsLog', () => {
    const devtoolsLogFilename = 'test-devtoolslog-0.json';

    afterEach(() => {
      fs.unlinkSync(devtoolsLogFilename);
    });

    it('prints devtoolsLogs with an event per line', async () => {
      const devtoolsLog = [
        {method: 'Network.requestServedFromCache', params: {requestId: '1.22'}},
        {method: 'Network.responseReceived', params: {status: 301, headers: {':method': 'POST'}}},
      ];
      await assetSaver.saveDevtoolsLog(devtoolsLog, devtoolsLogFilename);

      const devtoolsLogFileContents = fs.readFileSync(devtoolsLogFilename, 'utf8');
      expect(devtoolsLogFileContents).toEqual(
`[
  {"method":"Network.requestServedFromCache","params":{"requestId":"1.22"}},
  {"method":"Network.responseReceived","params":{"status":301,"headers":{":method":"POST"}}}
]
`);
    });
  });

  describe('loadArtifacts', () => {
    it('loads artifacts from disk', async () => {
      const artifactsPath = moduleDir + '/../fixtures/artifacts/perflog/';
      const artifacts = await assetSaver.loadArtifacts(artifactsPath);
      assert.strictEqual(artifacts.LighthouseRunWarnings.length, 2);
      assert.strictEqual(artifacts.URL.requestedUrl, 'https://www.reddit.com/r/nba');
      assert.strictEqual(artifacts.devtoolsLogs.defaultPass.length, 555);
      assert.strictEqual(artifacts.traces.defaultPass.traceEvents.length, 14);
      assert.strictEqual(artifacts.DevtoolsLog.length, 555);
      assert.strictEqual(artifacts.Trace.traceEvents.length, 14);
    });
  });

  describe('loadFlowArtifacts', () => {
    it('loads flow artifacts from disk', async () => {
      const artifactsPath = moduleDir + '/../fixtures/user-flows/artifacts/';
      const flowArtifacts = await assetSaver.loadFlowArtifacts(artifactsPath);

      expect(flowArtifacts.gatherSteps.map(gatherStep => gatherStep.flags)).toEqual([
        {skipAboutBlank: true, usePassiveGathering: true},
        {name: 'Search input', usePassiveGathering: true},
        {name: 'Search results', usePassiveGathering: true},
        {skipAboutBlank: true, disableStorageReset: true, usePassiveGathering: true},
      ]);

      const artifactsList = flowArtifacts.gatherSteps.map(gatherStep => gatherStep.artifacts);

      expect(artifactsList).toHaveLength(4);

      expect(artifactsList[0].GatherContext.gatherMode).toEqual('navigation');
      expect(artifactsList[0].URL.finalDisplayedUrl).toEqual('https://www.mikescerealshack.co/');
      expect(artifactsList[0].DevtoolsLog.length).toBeGreaterThan(10);
      expect(artifactsList[0].Trace.traceEvents.length).toBeGreaterThan(10);

      expect(artifactsList[1].GatherContext.gatherMode).toEqual('timespan');
      expect(artifactsList[1].URL.finalDisplayedUrl).toEqual('https://www.mikescerealshack.co/search?q=call+of+duty');
      expect(artifactsList[1].DevtoolsLog.length).toBeGreaterThan(10);
      expect(artifactsList[1].Trace.traceEvents.length).toBeGreaterThan(10);

      expect(artifactsList[2].GatherContext.gatherMode).toEqual('snapshot');
      expect(artifactsList[2].URL.finalDisplayedUrl).toEqual('https://www.mikescerealshack.co/search?q=call+of+duty');
      expect(artifactsList[2].DevtoolsLog).toBeUndefined();
      expect(artifactsList[2].Trace).toBeUndefined();

      expect(artifactsList[3].GatherContext.gatherMode).toEqual('navigation');
      expect(artifactsList[3].URL.finalDisplayedUrl).toEqual('https://www.mikescerealshack.co/corrections');
      expect(artifactsList[3].DevtoolsLog.length).toBeGreaterThan(10);
      expect(artifactsList[3].Trace.traceEvents.length).toBeGreaterThan(10);
    });
  });

  describe('JSON serialization', () => {
    const outputPath = moduleDir + '/json-serialization-test-data/';

    afterEach(() => {
      fs.rmSync(outputPath, {recursive: true, force: true});
    });

    it('round trips saved artifacts', async () => {
      const artifactsPath = moduleDir + '/../results/artifacts/';
      const originalArtifacts = await assetSaver.loadArtifacts(artifactsPath);

      await assetSaver.saveArtifacts(originalArtifacts, outputPath);
      const roundTripArtifacts = await assetSaver.loadArtifacts(outputPath);
      expect(roundTripArtifacts).toStrictEqual(originalArtifacts);
    });

    it('round trips saved artifacts (compressed)', async () => {
      const artifactsPath = moduleDir + '/../results/artifacts/';
      const originalArtifacts = await assetSaver.loadArtifacts(artifactsPath);

      await assetSaver.saveArtifacts(originalArtifacts, outputPath, {gzip: true});
      const roundTripArtifacts = await assetSaver.loadArtifacts(outputPath);
      expect(roundTripArtifacts).toStrictEqual(originalArtifacts);
    });

    it('round trips saved flow artifacts', async () => {
      const flowArtifactsPath = moduleDir + '/../fixtures/user-flows/artifacts/';
      const originalArtifacts = await assetSaver.loadFlowArtifacts(flowArtifactsPath);

      await assetSaver.saveFlowArtifacts(originalArtifacts, outputPath);
      const roundTripArtifacts = await assetSaver.loadFlowArtifacts(outputPath);
      expect(roundTripArtifacts).toStrictEqual(originalArtifacts);
    });

    it('deletes existing artifact files before saving', async () => {
      // Write some fake artifact files to start with.
      fs.mkdirSync(outputPath, {recursive: true});
      fs.writeFileSync(`${outputPath}/artifacts.json`, '{"BenchmarkIndex": 1731.5}');
      const existingTracePath = `${outputPath}/bestPass.trace.json`;
      fs.writeFileSync(existingTracePath, '{"traceEvents": []}');
      const existingDevtoolslogPath = `${outputPath}/bestPass.devtoolslog.json`;
      fs.writeFileSync(existingDevtoolslogPath, '[]');

      const artifactsPath = moduleDir + '/../results/artifacts/';
      const originalArtifacts = await assetSaver.loadArtifacts(artifactsPath);

      await assetSaver.saveArtifacts(originalArtifacts, outputPath);

      expect(fs.existsSync(existingDevtoolslogPath)).toBe(false);
      expect(fs.existsSync(existingTracePath)).toBe(false);

      const roundTripArtifacts = await assetSaver.loadArtifacts(outputPath);
      expect(roundTripArtifacts).toStrictEqual(originalArtifacts);
    });

    it('deletes existing flow artifact files before saving', async () => {
      // Write some fake artifact files to start with.
      fs.mkdirSync(outputPath, {recursive: true});
      fs.writeFileSync(`${outputPath}options.json`, '{}');

      const step0Path = `${outputPath}step0`;
      fs.mkdirSync(step0Path, {recursive: true});
      fs.writeFileSync(`${step0Path}/options.json`, '{}');
      fs.writeFileSync(`${step0Path}/artifacts.json`, '{"BenchmarkIndex": 1731.5}');
      const existingTracePath = `${step0Path}/bestPass.trace.json`;
      fs.writeFileSync(existingTracePath, '{"traceEvents": []}');
      const existingDevtoolslogPath = `${step0Path}/bestPass.devtoolslog.json`;
      fs.writeFileSync(existingDevtoolslogPath, '[]');

      const artifactsPath = moduleDir + '/../fixtures/user-flows/artifacts';
      const originalArtifacts = await assetSaver.loadFlowArtifacts(artifactsPath);

      await assetSaver.saveFlowArtifacts(originalArtifacts, outputPath);

      expect(fs.existsSync(existingDevtoolslogPath)).toBe(false);
      expect(fs.existsSync(existingTracePath)).toBe(false);

      const roundTripArtifacts = await assetSaver.loadFlowArtifacts(outputPath);
      expect(roundTripArtifacts).toStrictEqual(originalArtifacts);
    });

    it('round trips artifacts with an Error member', async () => {
      const error = new Error('Connection refused by server');
      // test code to make sure e.g. Node errors get serialized well.
      error.code = 'ECONNREFUSED';

      const artifacts = {
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

    it('round trips artifacts with an LighthouseError member', async () => {
      // Use an LighthouseError that has an ICU replacement.
      const protocolMethod = 'Page.getFastness';
      const lhError = new LighthouseError(
        LighthouseError.errors.PROTOCOL_TIMEOUT,
        {protocolMethod},
        {cause: new Error('the cause')});

      const artifacts = {
        Scripts: lhError,
      };

      await assetSaver.saveArtifacts(artifacts, outputPath);
      const roundTripArtifacts = await assetSaver.loadArtifacts(outputPath);
      expect(roundTripArtifacts).toStrictEqual(artifacts);

      expect(roundTripArtifacts.Scripts).toBeInstanceOf(LighthouseError);
      expect(roundTripArtifacts.Scripts.code).toEqual('PROTOCOL_TIMEOUT');
      expect(roundTripArtifacts.Scripts.protocolMethod).toEqual(protocolMethod);
      expect(roundTripArtifacts.Scripts.cause).toBeInstanceOf(Error);
      expect(roundTripArtifacts.Scripts.cause.message).toEqual('the cause');
      expect(roundTripArtifacts.Scripts.stack).toMatch(
          /^LighthouseError: PROTOCOL_TIMEOUT.*test[\\/]lib[\\/]asset-saver-test\.js/s);
      expect(roundTripArtifacts.Scripts.friendlyMessage)
        .toBeDisplayString(/\(Method: Page\.getFastness\)/);
    });

    it('saves artifacts in files concluding with a newline', async () => {
      const artifacts = {
        DevtoolsLog: [{method: 'first'}, {method: 'second'}],
        Trace: {traceEvents: traceEvents.slice(0, 100)},
        RobotsTxt: {status: 404, content: null},
      };
      await assetSaver.saveArtifacts(artifacts, outputPath);

      const artifactFilenames = fs.readdirSync(outputPath);
      expect(artifactFilenames.length).toBeGreaterThanOrEqual(3);
      for (const artifactFilename of artifactFilenames) {
        expect(artifactFilename).toMatch(/\.json$/);
        const contents = fs.readFileSync(`${outputPath}/${artifactFilename}`, 'utf8');
        expect(contents).toMatch(/\n$/);
      }
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

  describe('elideAuditErrorStacks', () => {
    it('elides correctly', async () => {
      const lhr = JSON.parse(JSON.stringify(dbwResults));
      lhr.audits['bf-cache'].errorStack = `Error: LighthouseError: ERRORED_REQUIRED_ARTIFACT
      at Runner._runAudit (${LH_ROOT}/core/runner.js:431:25)
      at Runner._runAudits (${LH_ROOT}/core/runner.js:370:40)
      at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      at async Runner.audit (${LH_ROOT}/core/runner.js:62:32)
      at async runLighthouse (${LH_ROOT}/cli/run.js:250:8)
      at async ${LH_ROOT}/cli/index.js:10:1
      at <anonymous>:1:1`;
      assetSaver.elideAuditErrorStacks(lhr);

      // eslint-disable-next-line max-len
      expect(lhr.audits['bf-cache'].errorStack).toEqual(`Error: LighthouseError: ERRORED_REQUIRED_ARTIFACT
      at Runner._runAudit (/core/runner.js)
      at Runner._runAudits (/core/runner.js)
      at process.processTicksAndRejections (node:internal/process/task_queues)
      at async Runner.audit (/core/runner.js)
      at async runLighthouse (/cli/run.js)
      at async /cli/index.js
      at <anonymous>`);
    });
  });
});
