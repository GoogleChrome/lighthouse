/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as LH from '../../../../types/lh.js';

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

export class NetworkRequest<T = any> {
    /**
     * The canonical network record.
     * Users of Lantern must create NetworkRequests matching this interface,
     * but can store the source-of-truth for their network model in this `record`
     * property. This is then accessible as a read-only property on NetworkNode.
     */
    record?: T;

    requestId: string;
    connectionId: number;
    connectionReused: boolean;
    url: string;
    protocol: string;
    parsedURL: ParsedURL;
    documentURL: string;
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
    isLinkPreload: boolean;
    finished: boolean;
    failed: boolean;
    statusCode: number;
    /** The network request that redirected to this one */
    redirectSource: NetworkRequest<T> | undefined;
    /** The network request that this one redirected to */
    redirectDestination: NetworkRequest<T> | undefined;
    initiator: LH.Crdp.Network.Initiator;
    initiatorRequest: NetworkRequest<T> | undefined;
    /** The chain of network requests that redirected to this one */
    redirects: NetworkRequest[] | undefined;
    timing: LH.Crdp.Network.ResourceTiming | undefined;
    /**
     * Optional value for how long the server took to respond to this request.
     * When not provided, the server response time is derived from the timing object.
     */
    serverResponseTime?: number;
    resourceType: LH.Crdp.Network.ResourceType | undefined;
    mimeType: string;
    priority: LH.Crdp.Network.ResourcePriority;
    frameId: string | undefined;
    fromWorker: boolean;
}

export namespace Simulation {
    type GraphNode<T> = import('../base-node.js').Node<T>;
    type GraphNetworkNode<T> = import('../network-node.js').NetworkNode<T>;
    type GraphCPUNode = import('../cpu-node.js').CPUNode;
    type Simulator<T> = import('../simulator/simulator.js').Simulator<T>;

    interface MetricCoefficients {
        intercept: number;
        optimistic: number;
        pessimistic: number;
    }

    /** Simulation settings that control the amount of network & cpu throttling in the run. */
    interface ThrottlingSettings {
        /** The round trip time in milliseconds. */
        rttMs?: number;
        /** The network throughput in kilobits per second. */
        throughputKbps?: number;
        // devtools settings
        /** The network request latency in milliseconds. */
        requestLatencyMs?: number;
        /** The network download throughput in kilobits per second. */
        downloadThroughputKbps?: number;
        /** The network upload throughput in kilobits per second. */
        uploadThroughputKbps?: number;
        // used by both
        /** The amount of slowdown applied to the cpu (1/<cpuSlowdownMultiplier>). */
        cpuSlowdownMultiplier?: number
    }

    interface PrecomputedLanternData {
        additionalRttByOrigin: {[origin: string]: number};
        serverResponseTimeByOrigin: {[origin: string]: number};
    }

    interface Settings {
        networkAnalysis: {
            rtt: number;
            additionalRttByOrigin: Map<string, number>;
            serverResponseTimeByOrigin: Map<string, number>;
            throughput: number;
        };
        /** The method used to throttle the network. */
        throttlingMethod: 'devtools'|'simulate'|'provided';
        /** The throttling config settings. */
        throttling: Required<ThrottlingSettings>;
        /** Precomputed lantern estimates to use instead of observed analysis. */
        precomputedLanternData?: PrecomputedLanternData | null;
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

    interface Result<T = any> {
        timeInMs: number;
        nodeTimings: Map<GraphNode<T>, NodeTiming>;
    }

    interface MetricComputationDataInput {
        simulator: Simulator<any>;
        graph: GraphNode<any>;
        processedNavigation: LH.Artifacts.ProcessedNavigation;
    }
}
