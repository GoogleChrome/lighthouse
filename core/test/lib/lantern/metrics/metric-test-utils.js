/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {getComputationDataParams} from '../../../../computed/metrics/lantern-metric.js';
import * as Lantern from '../../../../lib/lantern/types/lantern.js';
import {getURLArtifactFromDevtoolsLog} from '../../../test-utils.js';

/** @typedef {Lantern.NetworkRequest<import('@paulirish/trace_engine/models/trace/types/TraceEvents.js').SyntheticNetworkRequest>} NetworkRequest */

// TODO(15841): remove usage of Lighthouse code to create test data

/**
 * @param {{trace: LH.Trace, devtoolsLog: LH.DevtoolsLog, settings?: LH.Config.Settings, URL?: LH.Artifacts.URL}} opts
 */
function getComputationDataFromFixture({trace, devtoolsLog, settings, URL}) {
  // @ts-expect-error don't need all settings
  settings = settings ?? {};
  // @ts-expect-error it's not undefined ...
  settings.useTraceForLantern = true;
  URL = URL || getURLArtifactFromDevtoolsLog(devtoolsLog);
  const gatherContext = {gatherMode: 'navigation'};
  const context = {settings, computedCache: new Map()};
  // @ts-ignore
  return getComputationDataParams({trace, devtoolsLog, gatherContext, settings, URL}, context);
}

export {getComputationDataFromFixture};
