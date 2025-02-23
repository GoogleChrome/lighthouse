/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import BaseGatherer from '../base-gatherer.js';

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
 * @param {LH.Crdp.Debugger.ScriptParsedEvent} script
 */
function shouldIgnoreScript(script) {
  return script.hasSourceURL && [
    '_lighthouse-eval.js',
    '__puppeteer_evaluation_script__',
    'pptr://__puppeteer_evaluation_script__',
    'pptr:internal',
  ].includes(script.url);
}

/**
 * @fileoverview Gets JavaScript file contents.
 */
class Scripts extends BaseGatherer {
  static symbol = Symbol('Scripts');

  /** @type {LH.Gatherer.GathererMeta} */
  meta = {
    symbol: Scripts.symbol,
    supportedModes: ['timespan', 'navigation'],
  };

  /** @type {LH.Crdp.Debugger.ScriptParsedEvent[]} */
  _scriptParsedEvents = [];

  /** @type {Array<string | undefined>} */
  _scriptContents = [];

  /** @type {Array<string | undefined>} */
  _scriptFrameUrls = [];

  /** @type {Map<string, string>} */
  _frameIdToUrl = new Map();

  constructor() {
    super();
    this.onFrameNavigated = this.onFrameNavigated.bind(this);
    this.onScriptParsed = this.onScriptParsed.bind(this);
  }

  /**
   * @param {LH.Crdp.Debugger.ScriptParsedEvent} event
   */
  onScriptParsed(event) {
    if (!shouldIgnoreScript(event)) {
      this._scriptParsedEvents.push(event);
      this._scriptFrameUrls.push(
        event.executionContextAuxData?.frameId ?
          this._frameIdToUrl.get(event.executionContextAuxData?.frameId) :
          undefined
      );
    }
  }

  /**
   * @param {LH.Crdp.Page.FrameNavigatedEvent} event
   */
  onFrameNavigated(event) {
    this._frameIdToUrl.set(event.frame.id, event.frame.url);
  }

  /**
   * @param {LH.Gatherer.Context} context
   */
  async startInstrumentation(context) {
    const session = context.driver.defaultSession;
    session.on('Debugger.scriptParsed', this.onScriptParsed);
    await session.sendCommand('Debugger.enable');
    await session.sendCommand('Page.enable');
    session.on('Page.frameNavigated', this.onFrameNavigated);
  }

  /**
   * @param {LH.Gatherer.Context} context
   */
  async stopInstrumentation(context) {
    const session = context.driver.defaultSession;
    const formFactor = context.baseArtifacts.HostFormFactor;

    session.off('Debugger.scriptParsed', this.onScriptParsed);

    // If run on a mobile device, be sensitive to memory limitations and only
    // request one at a time.
    this._scriptContents = await runInSeriesOrParallel(
      this._scriptParsedEvents,
      ({scriptId}) => {
        return session.sendCommand('Debugger.getScriptSource', {scriptId})
          .then((resp) => resp.scriptSource)
          .catch(() => undefined);
      },
      formFactor === 'mobile' /* runInSeries */
    );
    await session.sendCommand('Debugger.disable');
    await session.sendCommand('Page.disable');
    session.off('Page.frameNavigated', this.onFrameNavigated);
  }

  async getArtifact() {
    /** @type {LH.Artifacts['Scripts']} */
    const scripts = this._scriptParsedEvents.map((event, i) => {
      // 'embedderName' and 'url' are confusingly named, so we rewrite them here.
      // On the protocol, 'embedderName' always refers to the URL of the script (or HTML if inline).
      // Same for 'url' ... except, magic "sourceURL=" comments will override the value.
      // It's nice to display the user-provided value in Lighthouse, so we add a field 'name'
      // to make it clear this is for presentational purposes.
      // See https://chromium-review.googlesource.com/c/v8/v8/+/2317310
      let name = event.url;
      // embedderName is optional on the protocol because backends like Node may not set it.
      // For our purposes, it is always set, although it may be an empty string for scripts
      // compiled from a string at runtime. See following comments.
      const url = event.embedderName || undefined;

      // If an event.url (what we use as `name`) is empty, then the script was compiled from a string
      // (or possibly is from the protocol, but we've filtered out those protocol Runtime.evaluate scripts
      // by this point) via eval, setTimeout, etc.
      //
      // We can provide a more useful indicator of the source of the script by looking at the callFrame,
      // but that may not be present (it is only the top-level call frame, no async stack frames). As a final
      // fallback, we grab the frame url of the execution context at the time the script was parsed.
      if (!url && !name) {
        if (event.stackTrace?.callFrames.length) {
          name = `<compiled from string in ${event.stackTrace.callFrames[0].url}>`;
        } else if (this._scriptFrameUrls[i]) {
          name = `<compiled from string in ${this._scriptFrameUrls[i]}>`;
        } else {
          name = '<compiled from string>';
        }
      } else if (url && !name) {
        name = url;
      }

      return {
        name,
        ...event,
        url,
        content: this._scriptContents[i],
      };
    })
    // If we can't name a script or know its url, just ignore it.
    .filter(script => script.name || script.url)
    // This script comes from Chromium debugger internals.
    // https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/core/inspector/thread_debugger.cc;l=522;drc=1f67b0dc03c0b4e45a922f7e1ef3a2b28640b673
    .filter(script => script.content !== '(function(e) { console.log(e.type, e); })');

    return scripts;
  }
}

export default Scripts;
