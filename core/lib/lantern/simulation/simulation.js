/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Lantern from '../types/lantern.js';

export {ConnectionPool} from './ConnectionPool.js';
export {Constants} from './Constants.js';
export {DNSCache} from './DNSCache.js';
export {NetworkAnalyzer} from './NetworkAnalyzer.js';
export {Simulator} from './Simulator.js';
export {SimulatorTimingMap} from './SimulationTimingMap.js';
export {TcpConnection} from './TcpConnection.js';

/** @template [T=any] @typedef {Lantern.Simulation.GraphNetworkNode<T>} GraphNetworkNode */
/** @template [T=any] @typedef {Lantern.Simulation.GraphNode<T>} GraphNode */
/** @template [T=any] @typedef {Lantern.Simulation.Result<T>} Result */
/** @typedef {Lantern.Simulation.GraphCPUNode} GraphCPUNode */
/** @typedef {Lantern.Simulation.MetricCoefficients} MetricCoefficients */
/** @typedef {Lantern.Simulation.MetricComputationDataInput} MetricComputationDataInput */
/** @typedef {Lantern.Simulation.NodeTiming} NodeTiming */
/** @typedef {Lantern.Simulation.Options} Options */
/** @typedef {Lantern.Simulation.PrecomputedLanternData} PrecomputedLanternData */
/** @typedef {Lantern.Simulation.ProcessedNavigation} ProcessedNavigation */
/** @typedef {Lantern.Simulation.Settings} Settings */
/** @typedef {Lantern.Simulation.URL} URL */
