/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as LH from '../lh.js';

declare namespace Lantern {
    type ParsedURL = {
        /**
         * Equivalent to a `new URL(url).protocol` BUT w/o the trailing colon (:)
         */
        scheme: string;
        /**
         * Equivalent to a `new URL(url).hostname`
         */
        host: string;
        securityOrigin: string;
    };
    type LightriderStatistics = {
        /**
         * The difference in networkEndTime between the observed Lighthouse networkEndTime and Lightrider's derived networkEndTime.
         */
        endTimeDeltaMs: number;
        /**
         * The time spent making a TCP connection (connect + SSL). Note: this is poorly named.
         */
        TCPMs: number;
        /**
         * The time spent requesting a resource from a remote server, we use this to approx RTT. Note: this is poorly names, it really should be "server response time".
         */
        requestMs: number;
        /**
         * Time to receive the entire response payload starting the clock on receiving the first fragment (first non-header byte).
         */
        responseMs: number;
    };
    class NetworkRequest<T = any> {
        /**
         * The canonical network record.
         * Users of Lantern must create NetworkRequests matching this interface,
         * but can store the source-of-truth for their network model in this `record`
         * property. This is then accessible as a read-only property on NetworkNode.
         */
        record?: T;

        requestId: string;
        connectionId: string;
        connectionReused: boolean;
        url: string;
        protocol: string;
        parsedURL: ParsedURL;
        /** When the renderer process initially discovers a network request, in milliseconds. */
        rendererStartTime: number;
        /**
         * When the network service is about to handle a request, ie. just before going to the
         * HTTP cache or going to the network for DNS/connection setup, in milliseconds.
         */
        networkRequestTime: number;
        /** When the last byte of the response headers is received, in milliseconds. */
        responseHeadersEndTime: number;
        /** When the last byte of the response body is received, in milliseconds. */
        networkEndTime: number;
        transferSize: number;
        resourceSize: number;
        fromDiskCache: boolean;
        fromMemoryCache: boolean;
        // TODO(15841): remove from lantern.
        /** Extra timing information available only when run in Lightrider. */
        lrStatistics: LightriderStatistics | undefined;
        finished: boolean;
        statusCode: number;
        /** The network request that this one redirected to */
        redirectDestination: NetworkRequest<T> | undefined;
        failed: boolean;
        initiator: LH.Crdp.Network.Initiator;
        timing: LH.Crdp.Network.ResourceTiming | undefined;
        resourceType: LH.Crdp.Network.ResourceType | undefined;
        priority: LH.Crdp.Network.ResourcePriority;
    }

    namespace Simulation {
        type GraphNode = import('../../core/lib/lantern/base-node.js').Node;
        type GraphNetworkNode = import('../../core/lib/lantern/network-node.js').NetworkNode;
        type GraphCPUNode = import('../../core/lib/lantern/cpu-node.js').CPUNode;
        type Simulator = import('../../core/lib/lantern/simulator/simulator.js').Simulator;

        interface MetricCoefficients {
            intercept: number;
            optimistic: number;
            pessimistic: number;
        }

        interface Options {
            rtt?: number;
            throughput?: number;
            observedThroughput: number;
            maximumConcurrentRequests?: number;
            cpuSlowdownMultiplier?: number;
            layoutTaskMultiplier?: number;
            additionalRttByOrigin?: Map<string, number>;
            serverResponseTimeByOrigin?: Map<string, number>;
        }

        interface NodeTiming {
            startTime: number;
            endTime: number;
            duration: number;
        }

        interface Result {
            timeInMs: number;
            nodeTimings: Map<GraphNode, NodeTiming>;
        }
    }
}
