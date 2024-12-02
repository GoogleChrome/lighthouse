/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'assert/strict';

import * as Lantern from '../../lib/lantern/lantern.js';
import {LoadSimulator} from '../../computed/load-simulator.js';
import {NetworkRequest} from '../../lib/network-request.js';
import {readJson} from '../test-utils.js';

const devtoolsLog = readJson('../fixtures/traces/progressive-app-m60.devtools.log.json', import.meta);

function createNetworkNode() {
  const record = {
    requestId: '1',
    protocol: 'http',
    parsedURL: {scheme: 'http', securityOrigin: 'https://pwa.rocks'},
  };
  return new Lantern.Graph.NetworkNode(NetworkRequest.asLanternNetworkRequest(record));
}

describe('Simulator artifact', () => {
  it('returns a simulator for "provided" throttling', async () => {
    const settings = {throttlingMethod: 'provided'};
    const context = {settings, computedCache: new Map()};
    const simulator = await LoadSimulator.request({
      devtoolsLog,
      settings,
    }, context);

    assert.equal(Math.round(simulator._rtt), 3);
    assert.equal(Math.round(simulator.throughput / 1024), 1590);
    assert.equal(simulator.cpuSlowdownMultiplier, 1);
    assert.equal(simulator.layoutTaskMultiplier, 1);
  });

  it('returns a simulator for "devtools" throttling', async () => {
    const throttling = {requestLatencyMs: 375, downloadThroughputKbps: 900};
    const settings = {throttlingMethod: 'devtools', throttling};
    const context = {settings, computedCache: new Map()};
    const simulator = await LoadSimulator.request({
      devtoolsLog,
      settings,
    }, context);

    assert.equal(simulator._rtt, 100);
    assert.equal(simulator.throughput / 1024, 1000);
    assert.equal(simulator.cpuSlowdownMultiplier, 1);
    assert.equal(simulator.layoutTaskMultiplier, 1);
  });

  it('returns a simulator for "simulate" throttling', async () => {
    const throttling = {rttMs: 120, throughputKbps: 1000, cpuSlowdownMultiplier: 3};
    const settings = {throttlingMethod: 'simulate', throttling};
    const context = {settings, computedCache: new Map()};
    const simulator = await LoadSimulator.request({devtoolsLog, settings}, context);

    assert.equal(simulator._rtt, 120);
    assert.equal(simulator.throughput / 1024, 1000);
    assert.equal(simulator.cpuSlowdownMultiplier, 3);
    assert.equal(simulator.layoutTaskMultiplier, 1.5);
    simulator.simulate(createNetworkNode());

    const {additionalRttByOrigin, serverResponseTimeByOrigin} = simulator.connectionPool.options;
    expect(additionalRttByOrigin.get('https://pwa.rocks')).toMatchInlineSnapshot(
      `0.3960000176447025`
    );
    expect(serverResponseTimeByOrigin.get('https://pwa.rocks')).toMatchInlineSnapshot(`159.70249997917608`);
  });

  it('returns a simulator with precomputed lantern data', async () => {
    const precomputedLanternData = {
      additionalRttByOrigin: {
        'https://pwa.rocks': 1000,
        'https://www.googletagmanager.com': 500,
        'https://www.google-analytics.com': 1000,
      },
      serverResponseTimeByOrigin: {
        'https://pwa.rocks': 150,
        'https://www.googletagmanager.com': 200,
        'https://www.google-analytics.com': 400,
      },
    };

    const settings = {throttlingMethod: 'simulate', precomputedLanternData};
    const context = {settings, computedCache: new Map()};
    const simulator = await LoadSimulator.request({devtoolsLog, settings}, context);
    const result = simulator.simulate(createNetworkNode());

    const {additionalRttByOrigin, serverResponseTimeByOrigin} = simulator.connectionPool.options;
    // Make sure we passed through the right RTT
    expect(additionalRttByOrigin).toEqual(new Map([
      ['https://pwa.rocks', 1000],
      ['https://www.googletagmanager.com', 500],
      ['https://www.google-analytics.com', 1000],
    ]));
    // Make sure we passed through the right response time
    expect(serverResponseTimeByOrigin).toEqual(new Map([
      ['https://pwa.rocks', 150],
      ['https://www.googletagmanager.com', 200],
      ['https://www.google-analytics.com', 400],
    ]));
    // Make sure the simulation used those numbers
    expect(result.timeInMs).toBeGreaterThan(2000);
  });
});
