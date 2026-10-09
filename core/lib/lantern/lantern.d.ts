/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as TraceEngine from '@paulirish/trace_engine';

export import Core = TraceEngine.Lantern.Core;
export import Graph = TraceEngine.Lantern.Graph;
export import Metrics = TraceEngine.Lantern.Metrics;
export import Simulation = TraceEngine.Lantern.Simulation;
export import Types = TraceEngine.Lantern.Types;
export const TraceEngineComputationData: typeof TraceEngine.LanternComputationData;
export default TraceEngine.Lantern;
