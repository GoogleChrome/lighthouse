import * as TraceEngine from '@paulirish/trace_engine';

import {polyfillDOMRect} from './polyfill-dom-rect.js';

/** @typedef {import('@paulirish/trace_engine').Types.Events.SyntheticLayoutShift} SyntheticLayoutShift */
/** @typedef {SyntheticLayoutShift & {args: {data: NonNullable<SyntheticLayoutShift['args']['data']>}}} SaneSyntheticLayoutShift */

polyfillDOMRect();

const TraceProcessor = TraceEngine.Processor.TraceProcessor;
const TraceHandlers = TraceEngine.Handlers.ModelHandlers;
const RootCauses = TraceEngine.RootCauses.RootCauses.RootCauses;
const Insights = TraceEngine.Insights;

export {
  TraceProcessor,
  TraceHandlers,
  RootCauses,
  Insights,
};
