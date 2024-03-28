/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {getComputationDataParams} from '../../../../computed/metrics/lantern-metric.js';
import {getURLArtifactFromDevtoolsLog} from '../../../test-utils.js';

// TODO(15841): remove usage of Lighthouse code to create test data

/**
 * @param {{trace: LH.Trace, devtoolsLog: LH.DevtoolsLog, settings?: LH.Audit.Context['settings'], URL?: LH.Artifacts.URL}} opts
 */
function getComputationDataFromFixture({trace, devtoolsLog, settings, URL}) {
  settings = settings || {};
  URL = URL || getURLArtifactFromDevtoolsLog(devtoolsLog);
  const gatherContext = {gatherMode: 'navigation'};
  const context = {settings, computedCache: new Map()};
  return getComputationDataParams({trace, devtoolsLog, gatherContext, settings, URL}, context);
}

export {getComputationDataFromFixture};
