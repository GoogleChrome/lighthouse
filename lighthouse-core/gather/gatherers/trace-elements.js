/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* global document */

/**
 * @fileoverview
 * This gatherer identifies elements that contribrute to metrics in the trace (LCP, CLS, etc.).
 * We take the backend nodeId from the trace and use it to find the corresponding element in the DOM.
 */

const FRGatherer = require('../../fraggle-rock/gather/base-gatherer.js');
const {resolveNodeIdToObjectId} = require('../driver/dom.js');
const {getNodeDetails} = require('../../lib/page-functions.js');
const RectHelpers = require('../../lib/rect-helpers.js');
const Sentry = require('../../lib/sentry.js');
const Trace = require('./trace.js');
const ProcessedTrace = require('../../computed/processed-trace.js');
const ProcessedNavigation = require('../../computed/processed-navigation.js');
const LighthouseError = require('../../lib/lh-error.js');

/** @typedef {{nodeId: number, score?: number, animations?: {name?: string, failureReasonsMask?: number, unsupportedProperties?: string[]}[]}} TraceElementData */

/**
 * @this {Element}
 */
/* c8 ignore start */
function getNodeDetailsData() {
  const elem = this.nodeType === document.ELEMENT_NODE ? this : this.parentElement;
  let traceElement;
  if (elem) {
    traceElement = {node: getNodeDetails(elem)};
  }
  return traceElement;
}
/* c8 ignore stop */

class TraceElements extends FRGatherer {
  /** @type {LH.Gatherer.GathererMeta<'Trace'>} */
  meta = {
    supportedModes: ['timespan', 'navigation'],
    dependencies: {Trace: Trace.symbol},
  }

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
   * @param {LH.TraceEvent | undefined} event
   * @return {number | undefined}
   */
  static getNodeIDFromTraceEvent(event) {
    return event && event.args &&
      event.args.data && event.args.data.nodeId;
  }

  /**
   * @param {LH.TraceEvent | undefined} event
   * @return {string | undefined}
   */
  static getAnimationIDFromTraceEvent(event) {
    return event && event.args &&
      event.args.data && event.args.data.id;
  }

  /**
   * @param {LH.TraceEvent | undefined} event
   * @return {number | undefined}
   */
  static getFailureReasonsFromTraceEvent(event) {
    return event && event.args &&
      event.args.data && event.args.data.compositeFailed;
  }

  /**
   * @param {LH.TraceEvent | undefined} event
   * @return {string[] | undefined}
   */
  static getUnsupportedPropertiesFromTraceEvent(event) {
    return event && event.args &&
      event.args.data && event.args.data.unsupportedProperties;
  }

  /**
   * @param {Array<number>} rect
   * @return {LH.Artifacts.Rect}
   */
  static traceRectToLHRect(rect) {
    const rectArgs = {
      x: rect[0],
      y: rect[1],
      width: rect[2],
      height: rect[3],
    };
    return RectHelpers.addRectTopAndBottom(rectArgs);
  }

  /**
   * This function finds the top (up to 5) elements that contribute to the CLS score of the page.
   * Each layout shift event has a 'score' which is the amount added to the CLS as a result of the given shift(s).
   * We calculate the score per element by taking the 'score' of each layout shift event and
   * distributing it between all the nodes that were shifted, proportianal to the impact region of
   * each shifted element.
   * @param {Array<LH.TraceEvent>} mainThreadEvents
   * @return {Array<TraceElementData>}
   */
  static getTopLayoutShiftElements(mainThreadEvents) {
    /** @type {Map<number, number>} */
    const clsPerNode = new Map();
    const shiftEvents = mainThreadEvents
      .filter(e => e.name === 'LayoutShift')
      .map(e => e.args && e.args.data);
    const indexFirstEventWithoutInput =
      shiftEvents.findIndex(event => event && !event.had_recent_input);

    shiftEvents.forEach((event, index) => {
      if (!event || !event.impacted_nodes || !event.score) {
        return;
      }

      // Ignore events with input, unless it's one of the initial events.
      // See comment in computed/metrics/cumulative-layout-shift.js.
      if (indexFirstEventWithoutInput !== -1 && index >= indexFirstEventWithoutInput) {
        if (event.had_recent_input) return;
      }

      let totalAreaOfImpact = 0;
      /** @type {Map<number, number>} */
      const pixelsMovedPerNode = new Map();

      event.impacted_nodes.forEach(node => {
        if (!node.node_id || !node.old_rect || !node.new_rect) {
          return;
        }

        const oldRect = TraceElements.traceRectToLHRect(node.old_rect);
        const newRect = TraceElements.traceRectToLHRect(node.new_rect);
        const areaOfImpact = RectHelpers.getRectArea(oldRect) +
          RectHelpers.getRectArea(newRect) -
          RectHelpers.getRectOverlapArea(oldRect, newRect);

        pixelsMovedPerNode.set(node.node_id, areaOfImpact);
        totalAreaOfImpact += areaOfImpact;
      });

      for (const [nodeId, pixelsMoved] of pixelsMovedPerNode.entries()) {
        let clsContribution = clsPerNode.get(nodeId) || 0;
        clsContribution += (pixelsMoved / totalAreaOfImpact) * event.score;
        clsPerNode.set(nodeId, clsContribution);
      }
    });

    const topFive = [...clsPerNode.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([nodeId, clsContribution]) => {
      return {
        nodeId: nodeId,
        score: clsContribution,
      };
    });

    return topFive;
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
      const nodeId = TraceElements.getNodeIDFromTraceEvent(begin);
      const animationId = TraceElements.getAnimationIDFromTraceEvent(begin);
      const failureReasonsMask = TraceElements.getFailureReasonsFromTraceEvent(status);
      const unsupportedProperties = TraceElements.getUnsupportedPropertiesFromTraceEvent(status);
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
   * @param {LH.Gatherer.FRTransitionalContext} context
   */
  async startInstrumentation(context) {
    await context.driver.defaultSession.sendCommand('Animation.enable');
    context.driver.defaultSession.on('Animation.animationStarted', this._onAnimationStarted);
  }

  /**
   * @param {LH.Gatherer.FRTransitionalContext} context
   */
  async stopInstrumentation(context) {
    context.driver.defaultSession.off('Animation.animationStarted', this._onAnimationStarted);
    await context.driver.defaultSession.sendCommand('Animation.disable');
  }

  /**
   * @param {LH.Gatherer.FRTransitionalContext} context
   * @param {LH.Trace|undefined} trace
   * @return {Promise<LH.Artifacts['TraceElements']>}
   */
  async _getArtifact(context, trace) {
    const session = context.driver.defaultSession;
    if (!trace) {
      throw new Error('Trace is missing!');
    }

    const processedTrace = await ProcessedTrace.request(trace, context);
    const {largestContentfulPaintEvt} = await ProcessedNavigation
      .request(processedTrace, context)
      .catch(err => {
        // If we were running in timespan mode and there was no paint, treat LCP as missing.
        if (context.gatherMode === 'timespan' && err.code === LighthouseError.errors.NO_FCP.code) {
          return {largestContentfulPaintEvt: undefined};
        }

        throw err;
      });
    const {mainThreadEvents} = processedTrace;

    const lcpNodeId = TraceElements.getNodeIDFromTraceEvent(largestContentfulPaintEvt);
    const clsNodeData = TraceElements.getTopLayoutShiftElements(mainThreadEvents);
    const animatedElementData =
      await this.getAnimatedElements(mainThreadEvents);

    /** @type {Map<string, TraceElementData[]>} */
    const backendNodeDataMap = new Map([
      ['largest-contentful-paint', lcpNodeId ? [{nodeId: lcpNodeId}] : []],
      ['layout-shift', clsNodeData],
      ['animation', animatedElementData],
    ]);

    const traceElements = [];
    for (const [traceEventType, backendNodeData] of backendNodeDataMap) {
      for (let i = 0; i < backendNodeData.length; i++) {
        const backendNodeId = backendNodeData[i].nodeId;
        let response;
        try {
          const objectId = await resolveNodeIdToObjectId(session, backendNodeId);
          if (!objectId) continue;
          response = await session.sendCommand('Runtime.callFunctionOn', {
            objectId,
            functionDeclaration: `function () {
              ${getNodeDetailsData.toString()};
              ${getNodeDetails.toString()};
              return getNodeDetailsData.call(this);
            }`,
            returnByValue: true,
            awaitPromise: true,
          });
        } catch (err) {
          Sentry.captureException(err, {
            tags: {gatherer: this.name},
            level: 'error',
          });
          continue;
        }

        if (response && response.result && response.result.value) {
          traceElements.push({
            traceEventType,
            ...response.result.value,
            score: backendNodeData[i].score,
            animations: backendNodeData[i].animations,
            nodeId: backendNodeId,
          });
        }
      }
    }

    return traceElements;
  }

  /**
   * @param {LH.Gatherer.FRTransitionalContext<'Trace'>} context
   * @return {Promise<LH.Artifacts.TraceElement[]>}
   */
  async getArtifact(context) {
    return this._getArtifact(context, context.dependencies.Trace);
  }

  /**
   * @param {LH.Gatherer.PassContext} passContext
   * @param {LH.Gatherer.LoadData} loadData
   * @return {Promise<LH.Artifacts.TraceElement[]>}
   */
  async afterPass(passContext, loadData) {
    const context = {...passContext, dependencies: {}};
    await this.stopInstrumentation(context);
    return this._getArtifact(context, loadData.trace);
  }
}

module.exports = TraceElements;
