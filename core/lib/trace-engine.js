import * as TraceEngine from '@paulirish/trace_engine';

import {polyfillDOMRect} from './polyfill-dom-rect.js';

/** @typedef {import('@paulirish/trace_engine').Types.Events.SyntheticLayoutShift} SyntheticLayoutShift */
/** @typedef {SyntheticLayoutShift & {args: {data: NonNullable<SyntheticLayoutShift['args']['data']>}}} SaneSyntheticLayoutShift */
/** @typedef {{i18nId: string, values: Record<string, string|number|{__i18nBytes: number}|{__i18nMillis: number}>}} DevToolsIcuMessage */

polyfillDOMRect();

const TraceProcessor = TraceEngine.Processor.TraceProcessor;
const TraceHandlers = TraceEngine.Handlers.ModelHandlers;
const Insights = TraceEngine.Insights;

export {
  TraceProcessor,
  TraceHandlers,
  Insights,
};
