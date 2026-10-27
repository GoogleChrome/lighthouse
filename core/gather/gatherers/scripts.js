/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import BaseGatherer from '../base-gatherer.js';
import Trace from './trace.js';

/**
 * @typedef {Object} TraceScript
 * @property {string} scriptId
 * @property {string} [sourceText]
 * @property {string[]} [chunks]
 * @property {string} [url]
 * @property {string} [sourceUrl]
 * @property {number} [executionContextId]
 * @property {string} [frame]
 */

/**
 * @template T, U
 * @param {Array<T>} values
 * @param {(value: T, index: number) => Promise<U>} promiseMapper
 * @param {boolean} runInSeries
 * @return {Promise<Array<U>>}
 */
async function runInSeriesOrParallel(values, promiseMapper, runInSeries) {
  if (runInSeries) {
    const results = [];
    for (let i = 0; i < values.length; i++) {
      const result = await promiseMapper(values[i], i);
      results.push(result);
    }
    return results;
  } else {
    const promises = values.map(promiseMapper);
    return await Promise.all(promises);
  }
}

/**
 * Extracts script source text and disambiguating metadata from trace rundown events,
 * grouped by `scriptId`.
 * @param {LH.TraceEvent[]} traceEvents
 * @return {Map<string, TraceScript[]>}
 */
function collectTraceScripts(traceEvents) {
  /** @type {Map<string, TraceScript>} */
  const byIsolateAndScriptId = new Map();

  /**
   * @param {NonNullable<LH.TraceEvent['args']['data']>} data
   * @return {TraceScript}
   */
  const getOrCreateRecord = (data) => {
    const scriptId = String(data.scriptId);
    const key = `${data.isolate ?? ''}.${scriptId}`;
    let record = byIsolateAndScriptId.get(key);
    if (!record) {
      record = {scriptId};
      byIsolateAndScriptId.set(key, record);
    }
    return record;
  };

  for (const event of traceEvents) {
    const data = event.args?.data;
    if (!data || data.scriptId === undefined) continue;

    if (event.cat === 'disabled-by-default-devtools.target-rundown') {
      if (typeof data.frame === 'string') {
        getOrCreateRecord(data).frame = data.frame;
      }
    } else if (event.cat === 'disabled-by-default-devtools.v8-source-rundown' &&
        event.name === 'ScriptCatchup') {
      const record = getOrCreateRecord(data);
      if (typeof data.url === 'string') record.url = data.url;
      if (typeof data.sourceUrl === 'string') record.sourceUrl = data.sourceUrl;
      if (typeof data.executionContextId === 'number') {
        record.executionContextId = data.executionContextId;
      }
    } else if (event.cat === 'disabled-by-default-devtools.v8-source-rundown-sources' &&
        typeof data.sourceText === 'string') {
      const record = getOrCreateRecord(data);
      if (event.name === 'ScriptCatchup') {
        record.sourceText = data.sourceText;
      } else if (event.name === 'LargeScriptCatchup') {
        if (!record.chunks || data.splitIndex === 0) record.chunks = [];
        record.chunks.push(data.sourceText);
      }
    }
  }

  /** @type {Map<string, TraceScript[]>} */
  const byScriptId = new Map();
  for (const record of byIsolateAndScriptId.values()) {
    if (record.chunks) record.sourceText = record.chunks.join('');
    if (record.sourceText === undefined) continue;

    let list = byScriptId.get(record.scriptId);
    if (!list) {
      list = [];
      byScriptId.set(record.scriptId, list);
    }
    list.push(record);
  }

  return byScriptId;
}

/**
 * @param {TraceScript} traceScript
 * @param {LH.Crdp.Debugger.ScriptParsedEvent} script
 * @return {boolean}
 */
function matchesScriptParsedEvent(traceScript, script) {
  const frameId = script.executionContextAuxData?.frameId;
  if (frameId && traceScript.frame !== undefined && traceScript.frame !== frameId) {
    return false;
  }
  const scriptUrl = script.embedderName || script.url;
  if (traceScript.url !== undefined &&
      traceScript.url !== scriptUrl &&
      traceScript.sourceUrl !== script.url) {
    return false;
  }
  if (script.executionContextId !== undefined &&
      traceScript.executionContextId !== undefined &&
      traceScript.executionContextId !== script.executionContextId) {
    return false;
  }
  return true;
}

/**
 * @param {LH.Crdp.Debugger.ScriptParsedEvent} script
 * @param {Map<string, TraceScript[]>} traceScriptsByScriptId
 * @return {string|undefined}
 */
function findTraceScriptSource(script, traceScriptsByScriptId) {
  const candidates = traceScriptsByScriptId.get(script.scriptId);
  if (!candidates) return undefined;

  const matches = candidates.filter((candidate) => matchesScriptParsedEvent(candidate, script));
  if (matches.length === 1) return matches[0].sourceText;

  const frameId = script.executionContextAuxData?.frameId;
  if (matches.length > 1 && frameId) {
    const frameMatches = matches.filter((candidate) => candidate.frame === frameId);
    if (frameMatches.length === 1) return frameMatches[0].sourceText;
  }

  return undefined;
}

/**
 * Returns true if the script was created via our own calls
 * to Runtime.evaluate.
 * @param {LH.Crdp.Debugger.ScriptParsedEvent} script
 */
function isLighthouseRuntimeEvaluateScript(script) {
  // Scripts created by Runtime.evaluate that run on the main session/frame
  // result in an empty string for the embedderName.
  // Or, it means the script was dynamically created (eval, new Function, onload, ...)
  if (!script.embedderName) return true;

  // Otherwise, when running our own code inside other frames, the embedderName
  // is set to the frame's url. In that case, we rely on the special sourceURL that
  // we set.
  return script.hasSourceURL && script.url === '_lighthouse-eval.js';
}

/**
 * @fileoverview Gets JavaScript file contents.
 */
class Scripts extends BaseGatherer {
  static symbol = Symbol('Scripts');

  /** @type {LH.Gatherer.GathererMeta<'Trace'>} */
  meta = {
    symbol: Scripts.symbol,
    supportedModes: ['timespan', 'navigation'],
    dependencies: {Trace: Trace.symbol},
  };

  /** @type {LH.Crdp.Debugger.ScriptParsedEvent[]} */
  _scriptParsedEvents = [];

  constructor() {
    super();
    this.onScriptParsed = this.onScriptParsed.bind(this);
  }

  /**
   * @param {LH.Crdp.Debugger.ScriptParsedEvent} params
   */
  onScriptParsed(params) {
    if (!isLighthouseRuntimeEvaluateScript(params)) {
      this._scriptParsedEvents.push(params);
    }
  }

  /**
   * @param {LH.Gatherer.Context} context
   */
  async startInstrumentation(context) {
    const session = context.driver.defaultSession;
    session.on('Debugger.scriptParsed', this.onScriptParsed);
    await session.sendCommand('Debugger.enable');
  }

  /**
   * @param {LH.Gatherer.Context} context
   */
  async stopInstrumentation(context) {
    const session = context.driver.defaultSession;
    session.off('Debugger.scriptParsed', this.onScriptParsed);
  }

  /**
   * @param {LH.Gatherer.Context<'Trace'>} context
   * @return {Promise<LH.Artifacts['Scripts']>}
   */
  async getArtifact(context) {
    const session = context.driver.defaultSession;
    const formFactor = context.baseArtifacts.HostFormFactor;
    const traceScriptsByScriptId = collectTraceScripts(context.dependencies.Trace.traceEvents);
    const traceSources = this._scriptParsedEvents.map(
      (script) => findTraceScriptSource(script, traceScriptsByScriptId)
    );

    if (traceSources.some((source) => source === undefined)) {
      // `disableAsyncStacks()` in `prepare.js` runs after `stopInstrumentation` and calls
      // `Debugger.disable`, so re-enable `Debugger` if we need to call `Debugger.getScriptSource`.
      await session.sendCommand('Debugger.enable');
    }

    // If run on a mobile device, be sensitive to memory limitations and only
    // request one at a time.
    const scriptContents = await runInSeriesOrParallel(
      this._scriptParsedEvents,
      (script, i) => {
        if (traceSources[i] !== undefined) return Promise.resolve(traceSources[i]);
        return session.sendCommand('Debugger.getScriptSource', {scriptId: script.scriptId})
          .then((resp) => resp.scriptSource)
          .catch(() => undefined);
      },
      formFactor === 'mobile' /* runInSeries */
    );
    await session.sendCommand('Debugger.disable');

    /** @type {LH.Artifacts['Scripts']} */
    const scripts = this._scriptParsedEvents.map((event, i) => {
      // 'embedderName' and 'url' are confusingly named, so we rewrite them here.
      // On the protocol, 'embedderName' always refers to the URL of the script (or HTML if inline).
      // Same for 'url' ... except, magic "sourceURL=" comments will override the value.
      // It's nice to display the user-provided value in Lighthouse, so we add a field 'name'
      // to make it clear this is for presentational purposes.
      // See https://chromium-review.googlesource.com/c/v8/v8/+/2317310
      return {
        name: event.url,
        ...event,
        // embedderName is optional on the protocol because backends like Node may not set it.
        // For our purposes, it is always set. But just in case it isn't... fallback to the url.
        url: event.embedderName || event.url,
        content: scriptContents[i],
      };
    });

    this._scriptParsedEvents = [];

    return scripts;
  }
}

export default Scripts;
