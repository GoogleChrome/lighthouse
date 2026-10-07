/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import BaseGatherer from '../base-gatherer.js';
import Trace from './trace.js';

/**
 * @template T, U
 * @param {Array<T>} values
 * @param {(value: T) => Promise<U>} promiseMapper
 * @param {boolean} runInSeries
 * @return {Promise<Array<U>>}
 */
async function runInSeriesOrParallel(values, promiseMapper, runInSeries) {
  if (runInSeries) {
    const results = [];
    for (const value of values) {
      const result = await promiseMapper(value);
      results.push(result);
    }
    return results;
  } else {
    const promises = values.map(promiseMapper);
    return await Promise.all(promises);
  }
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

    /** @type {Map<string, string>} */
    const traceSourceByScriptId = new Map();
    /** @type {Map<string, string[]>} */
    const largeScriptChunksByScriptId = new Map();
    for (const event of context.dependencies.Trace.traceEvents) {
      if (event.cat !== 'disabled-by-default-devtools.v8-source-rundown-sources') continue;
      const data = event.args?.data;
      if (!data || data.scriptId === undefined || typeof data.sourceText !== 'string') continue;
      const scriptId = String(data.scriptId);
      if (event.name === 'ScriptCatchup') {
        traceSourceByScriptId.set(scriptId, data.sourceText);
      } else if (event.name === 'LargeScriptCatchup') {
        let chunks = largeScriptChunksByScriptId.get(scriptId);
        if (!chunks) {
          chunks = [];
          largeScriptChunksByScriptId.set(scriptId, chunks);
        }
        chunks.push(data.sourceText);
      }
    }
    for (const [scriptId, chunks] of largeScriptChunksByScriptId) {
      traceSourceByScriptId.set(scriptId, chunks.join(''));
    }

    // If run on a mobile device, be sensitive to memory limitations and only
    // request one at a time.
    const scriptContents = await runInSeriesOrParallel(
      this._scriptParsedEvents,
      ({scriptId}) => {
        const traceSource = traceSourceByScriptId.get(scriptId);
        if (traceSource !== undefined) return Promise.resolve(traceSource);
        return session.sendCommand('Debugger.getScriptSource', {scriptId})
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

    return scripts;
  }
}

export default Scripts;
