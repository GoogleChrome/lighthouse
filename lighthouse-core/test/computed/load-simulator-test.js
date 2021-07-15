/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const assert = require('assert').strict;
const devtoolsLog = require('../fixtures/traces/progressive-app-m60.devtools.log.json');
const LoadSimulator = require('../../computed/load-simulator.js');
const NetworkNode = require('../../lib/dependency-graph/network-node.js');
const constants = require('../../config/constants.js');

function createNetworkNode() {
  return new NetworkNode({
    requestId: '1',
    protocol: 'http',
    parsedURL: {securityOrigin: 'https://pwa.rocks'},
  });
}

describe('Simulator artifact', () => {
  it('returns a simulator for "provided" throttling', async () => {
    const settings = {throttlingMethod: 'provided'};
    const context = {settings, computedCache: new Map()};
    const simulator = await LoadSimulator.request(
      {
        devtoolsLog,
        settings,
      },
      context
    );

    assert.equal(Math.round(simulator._rtt), 3);
    assert.equal(Math.round(simulator._throughput / 1024), 1590);
    assert.equal(simulator._cpuSlowdownMultiplier, 1);
    assert.equal(simulator._layoutTaskMultiplier, 1);
  });

  it('returns a simulator for "devtools" throttling', async () => {
    const throttling = {requestLatencyMs: 375, downloadThroughputKbps: 900};
    const settings = {throttlingMethod: 'devtools', throttling};
    const context = {settings, computedCache: new Map()};
    const simulator = await LoadSimulator.request(
      {
        devtoolsLog,
        settings,
      },
      context
    );

    assert.equal(simulator._rtt, 100);
    assert.equal(simulator._throughput / 1024, 1000);
    assert.equal(simulator._cpuSlowdownMultiplier, 1);
    assert.equal(simulator._layoutTaskMultiplier, 1);
  });

  it('returns a simulator for "simulate" throttling', async () => {
    const throttling = {rttMs: 120, throughputKbps: 1000, cpuSlowdownMultiplier: 3};
    const settings = {throttlingMethod: 'simulate', throttling};
    const context = {settings, computedCache: new Map()};
    const simulator = await LoadSimulator.request({devtoolsLog, settings}, context);

    assert.equal(simulator._rtt, 120);
    assert.equal(simulator._throughput / 1024, 1000);
    assert.equal(simulator._cpuSlowdownMultiplier, 3);
    assert.equal(simulator._layoutTaskMultiplier, 1.5);
    simulator.simulate(createNetworkNode());

    const {additionalRttByOrigin, serverResponseTimeByOrigin} = simulator._connectionPool._options;
    expect(additionalRttByOrigin.get('https://pwa.rocks')).toMatchInlineSnapshot(
      `0.3960000176447025`
    );
    expect(serverResponseTimeByOrigin.get('https://pwa.rocks')).toMatchInlineSnapshot(
      `159.42199996789026`
    );
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

    const {additionalRttByOrigin, serverResponseTimeByOrigin} = simulator._connectionPool._options;
    // Make sure we passed through the right RTT
    expect(additionalRttByOrigin).toEqual(
      new Map([
        ['__SUMMARY__', 0],
        ['https://pwa.rocks', 1000],
        ['https://www.googletagmanager.com', 500],
        ['https://www.google-analytics.com', 1000],
      ])
    );
    // Make sure we passed through the right response time
    expect(serverResponseTimeByOrigin).toEqual(
      new Map([
        ['__SUMMARY__', 159.42199996789026],
        ['https://pwa.rocks', 150],
        ['https://www.googletagmanager.com', 200],
        ['https://www.google-analytics.com', 400],
      ])
    );
    // Make sure the simulation used those numbers
    expect(result.timeInMs).toBeGreaterThan(2000);
  });

  it('returns a simulator with with fixed lantern values', async () => {
    const settings = {throttlingMethod: 'simulate', useFixedLanternRtt: true};
    const context = {settings, computedCache: new Map()};
    const simulator = await LoadSimulator.request({devtoolsLog, settings}, context);
    const result = simulator.simulate(createNetworkNode());

    const {additionalRttByOrigin, serverResponseTimeByOrigin} = simulator._connectionPool._options;
    // Make sure all RTT's are the same one as in constants
    expect(additionalRttByOrigin.get('__SUMMARY__')).toEqual(constants.fixedLanternRtt.globalRtt);
    expect(additionalRttByOrigin).toMatchInlineSnapshot(`
      Map {
        "https://pwa.rocks" => 500,
        "https://www.googletagmanager.com" => 500,
        "https://www.google-analytics.com" => 500,
        "__SUMMARY__" => 500,
      }
    `);
    // Make sure we set the right response time
    // eslint-disable-next-line max-len
    expect(serverResponseTimeByOrigin.get('__SUMMARY__')).toEqual(constants.fixedLanternRtt.globalServerResponse);
    expect(serverResponseTimeByOrigin).toMatchInlineSnapshot(`
      Map {
        "https://pwa.rocks" => 1000,
        "https://www.googletagmanager.com" => 1000,
        "https://www.google-analytics.com" => 1000,
        "__SUMMARY__" => 1000,
      }
    `);
    // Make sure the simulation used those numbers
    expect(result.timeInMs).toEqual(2600);
  });
});
