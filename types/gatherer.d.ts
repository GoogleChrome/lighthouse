/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {Protocol as Crdp} from 'devtools-protocol/types/protocol.js';
import {ProtocolMapping as CrdpMappings} from 'devtools-protocol/types/protocol-mapping.js';

import {ExecutionContext} from '../core/gather/driver/execution-context.js';
import {NetworkMonitor} from '../core/gather/driver/network-monitor.js';
import {Fetcher} from '../core/gather/fetcher.js';
import {ArbitraryEqualityMap} from '../core/lib/arbitrary-equality-map.js';

import {Artifacts, BaseArtifacts, GathererArtifacts, DevtoolsLog, Trace} from './artifacts.js';
import Config from './config.js';
import Result from './lhr/lhr.js';
import Protocol from './protocol.js';
import Puppeteer from './puppeteer.js';
import * as Lantern from '../core/lib/lantern/lantern.js';

type CrdpEvents = CrdpMappings.Events;
type CrdpCommands = CrdpMappings.Commands;

declare module Gatherer {
  /** The Lighthouse wrapper around a raw CDP session. */
  interface ProtocolSession {
    setTargetInfo(targetInfo: Crdp.Target.TargetInfo): void;
    hasNextProtocolTimeout(): boolean;
    getNextProtocolTimeout(): number;
    setNextProtocolTimeout(ms: number): void;
    on<TEvent extends keyof CrdpEvents>(event: TEvent, callback: (...args: CrdpEvents[TEvent]) => void): void;
    once<TEvent extends keyof CrdpEvents>(event: TEvent, callback: (...args: CrdpEvents[TEvent]) => void): void;
    off<TEvent extends keyof CrdpEvents>(event: TEvent, callback: (...args: CrdpEvents[TEvent]) => void): void;
    sendCommand<TMethod extends keyof CrdpCommands>(method: TMethod, ...params: CrdpCommands[TMethod]['paramsType']): Promise<CrdpCommands[TMethod]['returnType']>;
    sendCommandAndIgnore<TMethod extends keyof CrdpCommands>(method: TMethod, ...params: CrdpCommands[TMethod]['paramsType']): Promise<void>;
    dispose(): Promise<void>;
    onCrashPromise(): Promise<never>;
  }

  interface Driver {
    defaultSession: ProtocolSession;
    executionContext: ExecutionContext;
    fetcher: Fetcher;
    url: () => Promise<string>;
    targetManager: {
      rootSession(): ProtocolSession;
      mainFrameExecutionContexts(): Array<Crdp.Runtime.ExecutionContextDescription>;
      on(event: 'protocolevent', callback: (payload: Protocol.RawEventMessage) => void): void
      off(event: 'protocolevent', callback: (payload: Protocol.RawEventMessage) => void): void
    };
    networkMonitor: NetworkMonitor;
  }

  interface Context<TDependencies extends DependencyKey = DefaultDependenciesKey> {
    /** The gather mode Lighthouse is currently in. */
    gatherMode: GatherMode;
    /** The connection to the page being analyzed. */
    driver: Driver;
    /** The Puppeteer page handle. */
    page: Puppeteer.Page;
    /** The set of base artifacts that are always collected. */
    baseArtifacts: BaseArtifacts;
    /** The cached results of computed artifacts. */
    computedCache: Map<string, ArbitraryEqualityMap>;
    /** The set of available dependencies requested by the current gatherer. */
    dependencies: Pick<GathererArtifacts, Exclude<TDependencies, DefaultDependenciesKey>>;
    /** The settings used for gathering. */
    settings: Config.Settings;
  }

  interface GatherResult {
    artifacts: Artifacts;
    runnerOptions: {
      resolvedConfig: Config.ResolvedConfig;
      computedCache: Map<string, ArbitraryEqualityMap>
    }
  }

  interface LoadData {
    networkRecords: Array<Artifacts.NetworkRequest>;
    devtoolsLog: DevtoolsLog;
    trace?: Trace;
  }

  type PhaseResultNonPromise = void | GathererArtifacts[keyof GathererArtifacts];
  type PhaseResult = PhaseResultNonPromise | Promise<PhaseResultNonPromise>

  type GatherMode = Result.GatherMode;

  type DefaultDependenciesKey = '__none__'
  type DependencyKey = keyof GathererArtifacts | DefaultDependenciesKey

  interface GathererMetaNoDependencies {
    /**
     * Used to validate the dependency requirements of gatherers.
     * If this property is not defined, this gatherer cannot be the dependency of another. */
    symbol?: Symbol;
    /** Lists the modes in which this gatherer can run. */
    supportedModes: Array<GatherMode>;
  }

  interface GathererMetaWithDependencies<
    TDependencies extends Exclude<DependencyKey, DefaultDependenciesKey>
  > extends GathererMetaNoDependencies {
    /**
     * The set of required dependencies that this gatherer needs before it can compute its results.
     */
    dependencies: Record<TDependencies, Symbol>;
  }

  type GathererMeta<TDependencies extends DependencyKey = DefaultDependenciesKey> =
    [TDependencies] extends [DefaultDependenciesKey] ?
      GathererMetaNoDependencies :
      GathererMetaWithDependencies<Exclude<TDependencies, DefaultDependenciesKey>>;

  type GatherPhase = keyof Omit<Gatherer.GathererInstance, 'name'|'meta'>

  interface GathererInstance<TDependencies extends DependencyKey = DefaultDependenciesKey> {
    meta: GathererMeta<TDependencies>;
    startInstrumentation(context: Context<DefaultDependenciesKey>): Promise<void>|void;
    startSensitiveInstrumentation(context: Context<DefaultDependenciesKey>): Promise<void>|void;
    stopSensitiveInstrumentation(context: Context<DefaultDependenciesKey>): Promise<void>|void;
    stopInstrumentation(context: Context<DefaultDependenciesKey>): Promise<void>|void;
    getArtifact(context: Context<TDependencies>): PhaseResult;
  }

  type GathererInstanceExpander<TDependencies extends Gatherer.DependencyKey> =
    // Lack of brackets intentional here to convert to the union of all individual dependencies.
    TDependencies extends Gatherer.DefaultDependenciesKey ?
      GathererInstance<Gatherer.DefaultDependenciesKey> :
      GathererInstance<Exclude<TDependencies, DefaultDependenciesKey>>
  type AnyGathererInstance = GathererInstanceExpander<Gatherer.DependencyKey>

  namespace Simulation {
    type GraphNode = Lantern.Graph.Node<Artifacts.NetworkRequest>;
    type GraphNetworkNode = Lantern.Graph.NetworkNode<Artifacts.NetworkRequest>;
    type GraphCPUNode = Lantern.Graph.CPUNode<Artifacts.NetworkRequest>;
    type Simulator = Lantern.Simulation.Simulator<Artifacts.NetworkRequest>;
    type NodeTiming = Lantern.Types.Simulation.NodeTiming;
    type Result = Lantern.Simulation.Result<Artifacts.NetworkRequest>;
  }
}

export default Gatherer;
