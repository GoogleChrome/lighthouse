/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import * as Lantern from '../../../lib/lantern/lantern.js';
import {ByteEfficiencyAudit as ByteEfficiencyAudit_} from '../../../audits/byte-efficiency/byte-efficiency-audit.js';
import {LoadSimulator} from '../../../computed/load-simulator.js';
import {getURLArtifactFromDevtoolsLog, readJson} from '../../test-utils.js';
import {networkRecordsToDevtoolsLog} from '../../network-records-to-devtools-log.js';
import {createTestTrace, rootFrame} from '../../create-test-trace.js';
import {defaultSettings} from '../../../config/constants.js';

const trace = readJson('../../fixtures/artifacts/paul/trace.json', import.meta);
const devtoolsLog = readJson('../../fixtures/artifacts/paul/devtoolslog.json', import.meta);

describe('Byte efficiency base audit', () => {
  let simulator;
  let metricComputationInput;

  const ByteEfficiencyAudit = class extends ByteEfficiencyAudit_ {
    static get meta() {
      return {name: 'test'};
    }
  };

  beforeEach(() => {
    const mainDocumentUrl = 'http://example.com/';
    const networkRecords = [
      {
        requestId: '1',
        url: mainDocumentUrl,
        protocol: 'http',
        transferSize: 400_000,
        priority: 'VeryHigh',
        resourceType: 'Document',
        frameId: rootFrame,
        timing: {sendEnd: 0},
      },
      {
        requestId: '2',
        url: 'http://example.com/script.js',
        protocol: 'http',
        transferSize: 400_000,
        priority: 'High',
        resourceType: 'Script',
        frameId: rootFrame,
        timing: {sendEnd: 0},
      },
      {
        requestId: '3',
        url: 'http://www.example.com/image.png',
        protocol: 'http',
        transferSize: 200_000,
        priority: 'High',
        resourceType: 'Image',
        frameId: rootFrame,
        timing: {sendEnd: 0},
      },
    ];
    const devtoolsLog = networkRecordsToDevtoolsLog(networkRecords);

    const trace = createTestTrace({
      frameUrl: mainDocumentUrl,
      // add a CPU node to force improvement to TTI
      topLevelTasks: [{ts: 0, duration: 100_000}],
      largestContentfulPaint: 3000,
      networkRecords,
    });

    metricComputationInput = {
      trace,
      devtoolsLog,
      gatherContext: {gatherMode: 'navigation'},
      URL: {
        requestedUrl: mainDocumentUrl,
        mainDocumentUrl,
        finalDisplayedUrl: mainDocumentUrl,
      },
      settings: JSON.parse(JSON.stringify(defaultSettings)),
    };

    simulator = new Lantern.Simulation.Simulator({});
  });

  const baseHeadings = [
    {key: 'wastedBytes', itemType: 'bytes', displayUnit: 'kb', granularity: 1, text: ''},
  ];

  it('should format details', async () => {
    const result = await ByteEfficiencyAudit.createAuditProduct({
      headings: baseHeadings,
      items: [],
    }, simulator, metricComputationInput, {computedCache: new Map()});

    assert.deepEqual(result.details.items, []);
  });

  it('should set the numericValue', async () => {
    const result = await ByteEfficiencyAudit.createAuditProduct(
      {
        headings: baseHeadings,
        items: [
          {url: 'http://example.com/', wastedBytes: 200 * 1000},
        ],
      },
      simulator,
      metricComputationInput,
      {computedCache: new Map()}
    );

    // 900ms savings comes from the graph calculation
    assert.equal(result.numericValue, 900);
  });

  it('should estimate the FCP & LCP impact', async () => {
    const result = await ByteEfficiencyAudit.createAuditProduct({
      headings: baseHeadings,
      items: [
        {url: 'http://example.com/', wastedBytes: 200_000},
        {url: 'http://example.com/script.js', wastedBytes: 100_000},
      ],
    }, simulator, metricComputationInput, {computedCache: new Map()});

    assert.equal(result.metricSavings.FCP, 900);
    assert.equal(result.metricSavings.LCP, 900);
  });

  it('should use LCP request savings if larger than LCP graph savings', async () => {
    const result = await ByteEfficiencyAudit.createAuditProduct({
      headings: baseHeadings,
      items: [
        {url: 'http://example.com/', wastedBytes: 200_000},
        {url: 'http://www.example.com/image.png', wastedBytes: 500_000},
      ],
    }, simulator, metricComputationInput, {computedCache: new Map()});

    assert.equal(result.metricSavings.FCP, 900);
    assert.equal(result.metricSavings.LCP, 2380);
  });

  it('should fail if there are any results regardless of wastedMs', async () => {
    const perfectResult = await ByteEfficiencyAudit.createAuditProduct({
      headings: baseHeadings,
      items: [{url: 'http://example.com/', wastedBytes: 1 * 1000}],
    }, simulator, metricComputationInput, {computedCache: new Map()});

    const goodResult = await ByteEfficiencyAudit.createAuditProduct({
      headings: baseHeadings,
      items: [{url: 'http://example.com/', wastedBytes: 20 * 1000}],
    }, simulator, metricComputationInput, {computedCache: new Map()});

    const averageResult = await ByteEfficiencyAudit.createAuditProduct({
      headings: baseHeadings,
      items: [{url: 'http://example.com/', wastedBytes: 100 * 1000}],
    }, simulator, metricComputationInput, {computedCache: new Map()});

    const failingResult = await ByteEfficiencyAudit.createAuditProduct({
      headings: baseHeadings,
      items: [{url: 'http://example.com/', wastedBytes: 400 * 1000}],
    }, simulator, metricComputationInput, {computedCache: new Map()});

    assert.equal(perfectResult.score, 0, 'scores perfect wastedMs');
    assert.equal(goodResult.score, 0, 'scores good wastedMs');
    assert.equal(averageResult.score, 0, 'scores average wastedMs');
    assert.equal(failingResult.score, 0, 'scores failing wastedMs');
  });

  it('should populate KiB', async () => {
    const result = await ByteEfficiencyAudit.createAuditProduct({
      headings: baseHeadings,
      items: [
        {wastedBytes: 2048, totalBytes: 4096, wastedPercent: 50},
        {wastedBytes: 1986, totalBytes: 5436},
      ],
    }, simulator, metricComputationInput, {computedCache: new Map()});

    assert.equal(result.details.items[0].wastedBytes, 2048);
    assert.equal(result.details.items[0].totalBytes, 4096);
    assert.equal(result.details.items[1].wastedBytes, 1986);
    assert.equal(result.details.items[1].totalBytes, 5436);
  });

  it('should sort on wastedBytes', async () => {
    const result = await ByteEfficiencyAudit.createAuditProduct({
      headings: baseHeadings,
      items: [
        {wastedBytes: 350, totalBytes: 700, wastedPercent: 50},
        {wastedBytes: 450, totalBytes: 1000, wastedPercent: 50},
        {wastedBytes: 400, totalBytes: 450, wastedPercent: 50},
      ],
    }, simulator, metricComputationInput, {computedCache: new Map()});

    assert.equal(result.details.items[0].wastedBytes, 450);
    assert.equal(result.details.items[1].wastedBytes, 400);
    assert.equal(result.details.items[2].wastedBytes, 350);
  });

  it('should create a display value', async () => {
    const result = await ByteEfficiencyAudit.createAuditProduct({
      headings: baseHeadings,
      items: [
        {wastedBytes: 512, totalBytes: 700, wastedPercent: 50},
        {wastedBytes: 512, totalBytes: 1000, wastedPercent: 50},
        {wastedBytes: 1024, totalBytes: 1200, wastedPercent: 50},
      ],
    }, simulator, metricComputationInput, {computedCache: new Map()});

    expect(result.displayValue).toBeDisplayString(/savings of 2/);
  });

  it('should work on real artifacts', async () => {
    const throttling = {rttMs: 150, throughputKbps: 1600, cpuSlowdownMultiplier: 1};
    const settings = {throttlingMethod: 'simulate', throttling};
    const computedCache = new Map();
    const URL = getURLArtifactFromDevtoolsLog(devtoolsLog);
    const simulator = await LoadSimulator.request({devtoolsLog, settings, URL}, {computedCache});
    const result = await ByteEfficiencyAudit.createAuditProduct(
      {
        headings: [{key: 'wastedBytes', text: 'Label'}],
        items: [
          {url: 'https://www.paulirish.com/assets/wikipedia-flamechart.jpg', wastedBytes: 30 * 1024},
        ],
      },
      simulator,
      {trace, devtoolsLog, URL, gatherContext: {gatherMode: 'navigation'}, settings},
      {computedCache: new Map()}
    );

    assert.equal(result.numericValue, 160);
  });

  it('should create load simulator with the specified settings', async () => {
    class MockAudit extends ByteEfficiencyAudit {
      static audit_(artifacts, records) {
        return {
          items: records.map(record => ({url: record.url, wastedBytes: record.transferSize})),
          headings: [],
        };
      }
    }

    const artifacts = {
      GatherContext: {gatherMode: 'navigation'},
      traces: {defaultPass: trace},
      devtoolsLogs: {defaultPass: devtoolsLog},
      URL: getURLArtifactFromDevtoolsLog(devtoolsLog),
    };
    const computedCache = new Map();

    const modestThrottling = {rttMs: 150, throughputKbps: 1000, cpuSlowdownMultiplier: 2};
    const ultraSlowThrottling = {rttMs: 150, throughputKbps: 100, cpuSlowdownMultiplier: 8};
    let settings = {throttlingMethod: 'simulate', throttling: modestThrottling};
    let result = await MockAudit.audit(artifacts, {settings, computedCache});
    // expect modest savings
    expect(result.numericValue).toBeLessThan(5000);
    expect(result.numericValue).toMatchInlineSnapshot(`1220`);

    settings = {throttlingMethod: 'simulate', throttling: ultraSlowThrottling};
    result = await MockAudit.audit(artifacts, {settings, computedCache});
    // expect lots of savings
    expect(result.numericValue).not.toBeLessThan(5000);
    expect(result.numericValue).toMatchInlineSnapshot(`13580`);
  });

  it('should compute savings with throughput in timespan mode', async () => {
    class MockAudit extends ByteEfficiencyAudit {
      static audit_(artifacts, records) {
        return {
          items: records.map(record => ({url: record.url, wastedBytes: record.transferSize * 0.5})),
          headings: [],
        };
      }
    }

    const artifacts = {
      GatherContext: {gatherMode: 'timespan'},
      traces: {defaultPass: trace},
      devtoolsLogs: {defaultPass: devtoolsLog},
      URL: getURLArtifactFromDevtoolsLog(devtoolsLog),
    };
    const computedCache = new Map();

    const modestThrottling = {rttMs: 150, throughputKbps: 1000, cpuSlowdownMultiplier: 2};
    const settings = {throttlingMethod: 'simulate', throttling: modestThrottling};
    const result = await MockAudit.audit(artifacts, {settings, computedCache});
    expect(result.details.overallSavingsMs).toEqual(1400);
  });

  it('should return n/a if no network records in timespan mode', async () => {
    class MockAudit extends ByteEfficiencyAudit {
      static audit_(artifacts, records) {
        return {
          items: records,
          headings: [],
        };
      }
    }

    const artifacts = {
      GatherContext: {gatherMode: 'timespan'},
      traces: {defaultPass: trace},
      devtoolsLogs: {defaultPass: []},
      URL: {},
    };
    const computedCache = new Map();

    const modestThrottling = {rttMs: 150, throughputKbps: 1000, cpuSlowdownMultiplier: 2};
    const settings = {throttlingMethod: 'simulate', throttling: modestThrottling};
    const result = await MockAudit.audit(artifacts, {settings, computedCache});
    expect(result).toEqual({
      notApplicable: true,
      score: 1,
    });
  });

  it('should handle 0 download throughput in timespan', async () => {
    class MockAudit extends ByteEfficiencyAudit {
      static audit_(artifacts, records) {
        return {
          items: records.map(record => ({url: record.url, wastedBytes: record.transferSize * 0.5})),
          headings: [],
        };
      }
    }

    const artifacts = {
      GatherContext: {gatherMode: 'timespan'},
      traces: {defaultPass: trace},
      devtoolsLogs: {defaultPass: devtoolsLog},
      URL: getURLArtifactFromDevtoolsLog(devtoolsLog),
    };
    const computedCache = new Map();

    const modestThrottling = {
      rttMs: 150,
      requestLatencyMs: 150,
      throughputKbps: 1000,
      cpuSlowdownMultiplier: 2,
      downloadThroughputKbps: 0,
    };
    const settings = {throttlingMethod: 'devtools', throttling: modestThrottling};
    const result = await MockAudit.audit(artifacts, {settings, computedCache});
    expect(result.details.overallSavingsMs).toEqual(40);
  });

  describe('#scoreForWastedMs', () => {
    it('scores wastedMs values', () => {
      expect(ByteEfficiencyAudit.scoreForWastedMs(-50)).toBe(1);
      expect(ByteEfficiencyAudit.scoreForWastedMs(0)).toBe(1);
      expect(ByteEfficiencyAudit.scoreForWastedMs(240)).toBe(0.82);
      expect(ByteEfficiencyAudit.scoreForWastedMs(300)).toBe(0.78);
      expect(ByteEfficiencyAudit.scoreForWastedMs(390)).toBe(0.72);
      expect(ByteEfficiencyAudit.scoreForWastedMs(750)).toBe(0.56);
      expect(ByteEfficiencyAudit.scoreForWastedMs(1_175)).toBe(0.43);
      expect(ByteEfficiencyAudit.scoreForWastedMs(5_000)).toBe(0.12);
      expect(ByteEfficiencyAudit.scoreForWastedMs(10_000)).toBe(0.04);
      expect(ByteEfficiencyAudit.scoreForWastedMs(30_000)).toBe(0);
      expect(ByteEfficiencyAudit.scoreForWastedMs(Number.MAX_VALUE)).toBe(0);
    });
  });
});
