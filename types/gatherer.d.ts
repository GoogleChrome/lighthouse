/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

import _NetworkNode = require('../lighthouse-core/lib/dependency-graph/network-node');
import _CPUNode = require('../lighthouse-core/lib/dependency-graph/cpu-node');
import _Simulator = require('../lighthouse-core/lib/dependency-graph/simulator/simulator');
import Driver = require('../lighthouse-core/gather/driver');

declare global {
  module LH.Gatherer {
    export interface PassContext {
      /** The url of the currently loaded page. If the main document redirects, this will be updated to keep track. */
      url: string;
      driver: Driver;
      disableJavaScript?: boolean;
      passConfig: Config.Pass
      settings: Config.Settings;
      options?: object;
      /** Gatherers can push to this array to add top-level warnings to the LHR. */
      LighthouseRunWarnings: Array<string>;
      baseArtifacts: BaseArtifacts;
    }

    export interface LoadData {
      networkRecords: Array<Artifacts.NetworkRequest>;
      devtoolsLog: DevtoolsLog;
      trace?: Trace;
    }

    namespace Simulation {
      export type GraphNode = import('../lighthouse-core/lib/dependency-graph/base-node').Node;
      export type GraphNetworkNode = _NetworkNode;
      export type GraphCPUNode = _CPUNode;
      export type Simulator = _Simulator;

      export interface MetricCoefficients {
        intercept: number;
        optimistic: number;
        pessimistic: number;
      }

      export interface Options {
        rtt?: number;
        throughput?: number;
        maximumConcurrentRequests?: number;
        cpuSlowdownMultiplier?: number;
        layoutTaskMultiplier?: number;
        additionalRttByOrigin?: Map<string, number>;
        serverResponseTimeByOrigin?: Map<string, number>;
      }

      export interface NodeTiming {
        startTime: number;
        endTime: number;
        duration: number;
      }

      export interface Result {
        timeInMs: number;
        nodeTimings: Map<GraphNode, NodeTiming>;
      }
    }
  }
}

// empty export to keep file a module
export {};
