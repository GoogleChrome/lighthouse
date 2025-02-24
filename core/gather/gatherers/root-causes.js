/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import BaseGatherer from '../base-gatherer.js';
import Trace from './trace.js';
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
   * @param {LH.Gatherer.Context<'Trace'>} context
   * @return {Promise<LH.Artifacts.TraceEngineRootCauses>}
   */
  async getArtifact(context) {
    const trace = context.dependencies.Trace;
    const traceEngineResult = await TraceEngineResult.request({trace}, context);

    /** @type {LH.Artifacts.TraceEngineRootCauses} */
    const rootCauses = {
      layoutShifts: new Map(),
    };
    for (const insightSet of traceEngineResult.insights.values()) {
      for (const [shift, reasons] of insightSet.model.CLSCulprits.shifts) {
        rootCauses.layoutShifts.set(shift, reasons);
      }
    }

    return rootCauses;
  }
}

export default RootCauses;
