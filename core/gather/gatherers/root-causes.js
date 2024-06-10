/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import BaseGatherer from '../base-gatherer.js';
import Trace from './trace.js';
import * as TraceEngine from '../../lib/trace-engine.js';
import {TraceEngineResult} from '../../computed/trace-engine-result.js';

class RootCauses extends BaseGatherer {
  static symbol = Symbol('RootCauses');

  /** @type {LH.Gatherer.GathererMeta<'Trace'>} */
  meta = {
    symbol: RootCauses.symbol,
    supportedModes: ['timespan', 'navigation'],
    dependencies: {Trace: Trace.symbol},
  };

  /**
   * @param {LH.Gatherer.Driver} driver
   * @param {LH.Artifacts.TraceEngineResult['data']} traceParsedData
   * @return {Promise<LH.Artifacts.TraceEngineRootCauses>}
   */
  static async runRootCauseAnalysis(driver, traceParsedData) {
    await driver.defaultSession.sendCommand('DOM.enable');
    await driver.defaultSession.sendCommand('CSS.enable');

    // DOM.getDocument is necessary for pushNodesByBackendIdsToFrontend to properly retrieve
    // nodeIds if the DOM domain was enabled before this gatherer, invoke it to be safe.
    await driver.defaultSession.sendCommand('DOM.getDocument', {depth: -1, pierce: true});

    /** @type {import('@paulirish/trace_engine').RootCauses.RootCauses.RootCauseProtocolInterface} */
    const protocolInterface = {
      /** @param {string} url */
      // eslint-disable-next-line no-unused-vars
      getInitiatorForRequest(url) {
        return null;
      },
      /** @param {import('@paulirish/trace_engine/generated/protocol.js').DOM.BackendNodeId[]} backendNodeIds */
      async pushNodesByBackendIdsToFrontend(backendNodeIds) {
        const response = await driver.defaultSession.sendCommand(
          'DOM.pushNodesByBackendIdsToFrontend', {backendNodeIds});
        const nodeIds =
          /** @type {import('@paulirish/trace_engine/generated/protocol.js').DOM.NodeId[]} */(
            response.nodeIds);
        return nodeIds;
      },
      /** @param {import('@paulirish/trace_engine/generated/protocol.js').DOM.NodeId} nodeId */
      async getNode(nodeId) {
        try {
          const response = await driver.defaultSession.sendCommand('DOM.describeNode', {nodeId});
          // This always zero, so let's fix it here.
          // https://bugs.chromium.org/p/chromium/issues/detail?id=1515175
          response.node.nodeId = nodeId;
          const node =
            /** @type {import('@paulirish/trace_engine/generated/protocol.js').DOM.Node} */(
              response.node);
          return node;
        } catch (err) {
          if (err.message.includes('Could not find node with given id')) {
            // TODO: when injecting an iframe, the engine gets the node of that frame's document element.
            // But we don't have a way to access that frame. We just have our default session.
            // Ex:
            // node cli http://localhost:10503/shift-attribution.html --quiet --only-audits layout-shifts
            // To fix we must:
            // - Change trace engine `getNode` protocol interface to also give frame id
            // - Expand our driver.targetManager to know how to talk to a session connected to a specific frame
            // When this is fixed, remove this try/catch.
            // Note: this could be buggy by giving the wrong node detail if a node id meant for a non-main frame
            // happens to match one from the main frame ... which is pretty likely...
            // TODO: fix trace engine type to allow returning null.
            return /** @type {any} */(null);
          }
          throw err;
        }
      },
      /** @param {number} nodeId */
      async getComputedStyleForNode(nodeId) {
        try {
          const response = await driver.defaultSession.sendCommand(
            'CSS.getComputedStyleForNode', {nodeId});
          return response.computedStyle;
        } catch {
          return [];
        }
      },
      /** @param {import('@paulirish/trace_engine/generated/protocol.js').DOM.NodeId} nodeId */
      async getMatchedStylesForNode(nodeId) {
        try {
          const response = await driver.defaultSession.sendCommand(
            'CSS.getMatchedStylesForNode', {nodeId});
          return {...response, getError() {}};
        } catch (err) {
          return /** @type {any} */({getError() {
            return err.toString();
          }});
        }
      },
      /** @param {string} url */
      // @ts-expect-error not using, dont care about type error.
      // eslint-disable-next-line no-unused-vars
      async fontFaceForSource(url) {
        return null;
      },
    };

    /** @type {LH.Artifacts.TraceEngineRootCauses} */
    const rootCauses = {
      layoutShifts: {},
    };
    const rootCausesEngine = new TraceEngine.RootCauses(protocolInterface);
    const layoutShiftEvents = traceParsedData.LayoutShifts.clusters.flatMap(c => c.events);
    for (const event of layoutShiftEvents) {
      const r = await rootCausesEngine.layoutShifts.rootCausesForEvent(traceParsedData, event);
      if (!r) continue;

      for (const cause of r.fontChanges) {
        // TODO: why isn't trace engine unwrapping this promise ...
        cause.fontFace = await cause.fontFace;
      }
      rootCauses.layoutShifts[layoutShiftEvents.indexOf(event)] = r;
    }

    await driver.defaultSession.sendCommand('DOM.disable');
    await driver.defaultSession.sendCommand('CSS.disable');

    return rootCauses;
  }

  /**
   * @param {LH.Gatherer.Context<'Trace'>} context
   * @return {Promise<LH.Artifacts.TraceEngineRootCauses>}
   */
  async getArtifact(context) {
    const trace = context.dependencies.Trace;
    const traceEngineResult = await TraceEngineResult.request({trace}, context);
    return RootCauses.runRootCauseAnalysis(context.driver, traceEngineResult.data);
  }
}

export default RootCauses;
