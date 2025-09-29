/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* global getNodeDetails */

/**
 * @fileoverview
 * This gatherer identifies elements that contribrute to metrics in the trace (LCP, CLS, etc.).
 * We take the backend nodeId from the trace and use it to find the corresponding element in the DOM.
 */

import BaseGatherer from '../base-gatherer.js';
import {resolveNodeIdToObjectId} from '../driver/dom.js';
import {pageFunctions} from '../../lib/page-functions.js';
import {Sentry} from '../../lib/sentry.js';
import Trace from './trace.js';
import {ProcessedTrace} from '../../computed/processed-trace.js';
import {ProcessedNavigation} from '../../computed/processed-navigation.js';
import {LighthouseError} from '../../lib/lh-error.js';
import {Responsiveness} from '../../computed/metrics/responsiveness.js';
import {CumulativeLayoutShift} from '../../computed/metrics/cumulative-layout-shift.js';
import {ExecutionContext} from '../driver/execution-context.js';
import {TraceEngineResult} from '../../computed/trace-engine-result.js';
import SourceMaps from './source-maps.js';

/** @typedef {{nodeId: number, animations?: {name?: string, failureReasonsMask?: number, unsupportedProperties?: string[]}[], type?: string}} TraceElementData */

const MAX_LAYOUT_SHIFTS = 15;

/**
 * @this {HTMLElement}
 */
/* c8 ignore start */
function getNodeDetailsData() {
  const elem = this.nodeType === document.ELEMENT_NODE ? this : this.parentElement;
  let traceElement;
  if (elem) {
    // @ts-expect-error - getNodeDetails put into scope via stringification
    traceElement = {node: getNodeDetails(elem)};
  }
  return traceElement;
}
/* c8 ignore stop */

class TraceElements extends BaseGatherer {
  /** @type {LH.Gatherer.GathererMeta<'Trace'|'SourceMaps'>} */
  meta = {
    supportedModes: ['timespan', 'navigation'],
    dependencies: {Trace: Trace.symbol, SourceMaps: SourceMaps.symbol},
  };

  /** @type {Map<string, string>} */
  animationIdToName = new Map();

  constructor() {
    super();
    this._onAnimationStarted = this._onAnimationStarted.bind(this);
  }

  /** @param {LH.Crdp.Animation.AnimationStartedEvent} args */
  _onAnimationStarted({animation: {id, name}}) {
    if (name) this.animationIdToName.set(id, name);
  }

  /**
   * @param {LH.Artifacts.TraceEngineResult} traceEngineResult
   * @param {string|undefined} navigationId
   * @return {Promise<Array<{nodeId: number}>>}
   */
  static async getTraceEngineElements(traceEngineResult, navigationId) {
    // Can only resolve elements for the latest insight set, which should correspond
    // to the current navigation id (if present). Can't resolve elements for pages
    // that are gone.
    const insightSet = [...traceEngineResult.insights.values()].at(-1);
    if (!insightSet) {
      return [];
    }

    if (navigationId) {
      if (insightSet.navigation?.args.data?.navigationId !== navigationId) {
        return [];
      }
    } else {
      if (insightSet.navigation) {
        return [];
      }
    }

    /**
     * Execute `cb(obj, key)` on every object property (non-objects only), recursively.
     * @param {any} obj
     * @param {(obj: Record<string, unknown>, key: string) => void} cb
     * @param {Set<object>} seen
     */
    function recursiveObjectEnumerate(obj, cb, seen) {
      if (seen.has(seen)) {
        return;
      }

      seen.add(obj);

      if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        if (obj instanceof Map) {
          for (const [key, val] of obj) {
            if (typeof val === 'object') {
              recursiveObjectEnumerate(val, cb, seen);
            } else {
              cb(val, key);
            }
          }
        } else {
          Object.keys(obj).forEach(key => {
            if (typeof obj[key] === 'object') {
              recursiveObjectEnumerate(obj[key], cb, seen);
            } else {
              cb(obj[key], key);
            }
          });
        }
      } else if (Array.isArray(obj)) {
        obj.forEach(item => {
          if (typeof item === 'object' || Array.isArray(item)) {
            recursiveObjectEnumerate(item, cb, seen);
          }
        });
      }
    }

    /** @type {number[]} */
    const nodeIds = [];
    recursiveObjectEnumerate(insightSet.model, (val, key) => {
      const keys = ['nodeId', 'node_id', 'backendNodeId'];
      if (typeof val === 'number' && keys.includes(key)) {
        nodeIds.push(val);
      }
    }, new Set());

    // TODO: handle digging into Map in recursiveObjectEnumerate.
    for (const shift of insightSet.model.CLSCulprits.shifts.values()) {
      nodeIds.push(...shift.unsizedImages.map(s => s.backendNodeId));
    }

    return [...new Set(nodeIds)].map(id => ({nodeId: id}));
  }

  /**
   * We want to a single representative node to represent the shift, so let's pick
   * the one with the largest impact (size x distance moved).
   *
   * @param {LH.Artifacts.TraceImpactedNode[]} impactedNodes
   * @param {Map<number, number>} impactByNodeId
   * @return {number|undefined}
   */
  static getBiggestImpactNodeForShiftEvent(impactedNodes, impactByNodeId) {
    let biggestImpactNodeId;
    let biggestImpactNodeScore = Number.NEGATIVE_INFINITY;
    for (const node of impactedNodes) {
      const impactScore = impactByNodeId.get(node.node_id);
      if (impactScore !== undefined && impactScore > biggestImpactNodeScore) {
        biggestImpactNodeId = node.node_id;
        biggestImpactNodeScore = impactScore;
      }
    }
    return biggestImpactNodeId;
  }

  /**
   * This function finds the top (up to 15) layout shifts on the page, and returns
   * the id of the largest impacted node of each shift, along with any related nodes
   * that may have caused the shift.
   *
   * @param {LH.Trace} trace
   * @param {LH.Artifacts.TraceEngineResult['parsedTrace']} traceEngineResult
   * @param {LH.Gatherer.Context} context
   * @return {Promise<Array<{nodeId: number}>>}
   */
  static async getTopLayoutShifts(trace, traceEngineResult, context) {
    const {impactByNodeId} = await CumulativeLayoutShift.request(trace, context);
    const clusters = traceEngineResult.LayoutShifts.clusters ?? [];
    const layoutShiftEvents =
      /** @type {import('../../lib/trace-engine.js').SaneSyntheticLayoutShift[]} */(
        clusters.flatMap(c => c.events)
      );

    return layoutShiftEvents
      .sort((a, b) => b.args.data.weighted_score_delta - a.args.data.weighted_score_delta)
      .slice(0, MAX_LAYOUT_SHIFTS)
      .flatMap(event => {
        const nodeIds = [];
        const impactedNodes = event.args.data.impacted_nodes || [];
        const biggestImpactedNodeId =
          this.getBiggestImpactNodeForShiftEvent(impactedNodes, impactByNodeId);
        if (biggestImpactedNodeId !== undefined) {
          nodeIds.push(biggestImpactedNodeId);
        }

        return nodeIds.map(nodeId => ({nodeId}));
      });
  }

  /**
   * @param {LH.Trace} trace
   * @param {LH.Gatherer.Context} context
   * @return {Promise<TraceElementData|undefined>}
   */
  static async getResponsivenessElement(trace, context) {
    const {settings} = context;
    try {
      const responsivenessEvent = await Responsiveness.request({trace, settings}, context);
      if (!responsivenessEvent) return;
      return {nodeId: responsivenessEvent.args.data.nodeId};
    } catch {
      // Don't let responsiveness errors sink the rest of the gatherer.
      return;
    }
  }

  /**
   * Find the node ids of elements which are animated using the Animation trace events.
   * @param {Array<LH.TraceEvent>} mainThreadEvents
   * @return {Promise<Array<TraceElementData>>}
   */
  async getAnimatedElements(mainThreadEvents) {
    /** @type {Map<string, {begin: LH.TraceEvent | undefined, status: LH.TraceEvent | undefined}>} */
    const animationPairs = new Map();
    for (const event of mainThreadEvents) {
      if (event.name !== 'Animation') continue;

      if (!event.id2 || !event.id2.local) continue;
      const local = event.id2.local;

      const pair = animationPairs.get(local) || {begin: undefined, status: undefined};
      if (event.ph === 'b') {
        pair.begin = event;
      } else if (
        event.ph === 'n' &&
          event.args.data &&
          event.args.data.compositeFailed !== undefined) {
        pair.status = event;
      }
      animationPairs.set(local, pair);
    }

    /** @type {Map<number, Set<{animationId: string, failureReasonsMask?: number, unsupportedProperties?: string[]}>>} */
    const elementAnimations = new Map();
    for (const {begin, status} of animationPairs.values()) {
      const nodeId = begin?.args?.data?.nodeId;
      const animationId = begin?.args?.data?.id;
      const failureReasonsMask = status?.args?.data?.compositeFailed;
      const unsupportedProperties = status?.args?.data?.unsupportedProperties;
      if (!nodeId || !animationId) continue;

      const animationIds = elementAnimations.get(nodeId) || new Set();
      animationIds.add({animationId, failureReasonsMask, unsupportedProperties});
      elementAnimations.set(nodeId, animationIds);
    }

    /** @type {Array<TraceElementData>} */
    const animatedElementData = [];
    for (const [nodeId, animationIds] of elementAnimations) {
      const animations = [];
      for (const {animationId, failureReasonsMask, unsupportedProperties} of animationIds) {
        const animationName = this.animationIdToName.get(animationId);
        animations.push({name: animationName, failureReasonsMask, unsupportedProperties});
      }
      animatedElementData.push({nodeId, animations});
    }
    return animatedElementData;
  }

  /**
   * @param {LH.Trace} trace
   * @param {LH.Gatherer.Context} context
   * @return {Promise<{nodeId: number, type: string} | undefined>}
   */
  static async getLcpElement(trace, context) {
    let processedNavigation;
    try {
      processedNavigation = await ProcessedNavigation.request(trace, context);
    } catch (err) {
      // If we were running in timespan mode and there was no paint, treat LCP as missing.
      if (context.gatherMode === 'timespan' && err.code === LighthouseError.errors.NO_FCP.code) {
        return;
      }

      throw err;
    }

    // Use main-frame-only LCP to match the metric value.
    const lcpData = processedNavigation.largestContentfulPaintEvt?.args?.data;
    // These should exist, but trace types are loose.
    if (lcpData?.nodeId === undefined || !lcpData.type) return;

    return {
      nodeId: lcpData.nodeId,
      type: lcpData.type,
    };
  }

  /**
   * @param {LH.Gatherer.Context} context
   */
  async startInstrumentation(context) {
    await context.driver.defaultSession.sendCommand('Animation.enable');
    context.driver.defaultSession.on('Animation.animationStarted', this._onAnimationStarted);
  }

  /**
   * @param {LH.Gatherer.Context} context
   */
  async stopInstrumentation(context) {
    context.driver.defaultSession.off('Animation.animationStarted', this._onAnimationStarted);
    await context.driver.defaultSession.sendCommand('Animation.disable');
  }

  /**
   * @param {LH.Gatherer.ProtocolSession} session
   * @param {number} backendNodeId
   */
  async getNodeDetails(session, backendNodeId) {
    try {
      const objectId = await resolveNodeIdToObjectId(session, backendNodeId);
      if (!objectId) return null;

      const deps = ExecutionContext.serializeDeps([
        pageFunctions.getNodeDetails,
        getNodeDetailsData,
      ]);
      return await session.sendCommand('Runtime.callFunctionOn', {
        objectId,
        functionDeclaration: `function () {
          ${deps}
          return getNodeDetailsData.call(this);
        }`,
        returnByValue: true,
        awaitPromise: true,
      });
    } catch (err) {
      Sentry.captureException(err, {
        tags: {gatherer: 'TraceElements'},
        level: 'error',
      });
    }

    return null;
  }

  /**
   * @param {LH.Gatherer.Context<'Trace'|'SourceMaps'>} context
   * @return {Promise<LH.Artifacts.TraceElement[]>}
   */
  async getArtifact(context) {
    const session = context.driver.defaultSession;

    const trace = context.dependencies.Trace;
    const SourceMaps = context.dependencies.SourceMaps;
    const settings = context.settings;
    const traceEngineResult =
      await TraceEngineResult.request({trace, settings, SourceMaps}, context);

    const processedTrace = await ProcessedTrace.request(trace, context);
    const {mainThreadEvents} = processedTrace;
    const navigationId = processedTrace.timeOriginEvt.args.data?.navigationId;

    const traceEngineData = await TraceElements.getTraceEngineElements(
      traceEngineResult, navigationId);
    const lcpNodeData = await TraceElements.getLcpElement(trace, context);
    const shiftsData = await TraceElements.getTopLayoutShifts(
      trace, traceEngineResult.parsedTrace, context);
    const animatedElementData = await this.getAnimatedElements(mainThreadEvents);
    const responsivenessElementData = await TraceElements.getResponsivenessElement(trace, context);

    /** @type {Map<string, TraceElementData[]>} */
    const backendNodeDataMap = new Map([
      ['trace-engine', traceEngineData],
      ['largest-contentful-paint', lcpNodeData ? [lcpNodeData] : []],
      ['layout-shift', shiftsData],
      ['animation', animatedElementData],
      ['responsiveness', responsivenessElementData ? [responsivenessElementData] : []],
    ]);

    /** @type {Map<number, LH.Crdp.Runtime.CallFunctionOnResponse | null>} */
    const callFunctionOnCache = new Map();
    /** @type {LH.Artifacts.TraceElement[]} */
    const traceElements = [];
    for (const [traceEventType, backendNodeData] of backendNodeDataMap) {
      for (let i = 0; i < backendNodeData.length; i++) {
        const backendNodeId = backendNodeData[i].nodeId;
        let response = callFunctionOnCache.get(backendNodeId);
        if (response === undefined) {
          response = await this.getNodeDetails(session, backendNodeId);
          callFunctionOnCache.set(backendNodeId, response);
        }

        if (response?.result?.value) {
          traceElements.push({
            ...response.result.value,
            traceEventType,
            animations: backendNodeData[i].animations,
            nodeId: backendNodeId,
            type: backendNodeData[i].type,
          });
        }
      }
    }

    return traceElements;
  }
}

export default TraceElements;
