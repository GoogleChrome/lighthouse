/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import BaseGatherer from '../base-gatherer.js';

/**
 * @fileoverview Tracks unused JavaScript
 */
class JsUsage extends BaseGatherer {
  /** @type {LH.Gatherer.GathererMeta} */
  meta = {
    supportedModes: ['snapshot', 'timespan', 'navigation'],
  };

  constructor() {
    super();
    /** @type {LH.Crdp.Profiler.ScriptCoverage[]} */
    this._scriptUsages = [];
    /** @type {Array<{target: LH.Crdp.Target.TargetInfo, session: LH.Gatherer.ProtocolSession}>} */
    this._sessions = [];
    /** @type {((targetWithSession: {target: LH.Crdp.Target.TargetInfo, session: LH.Gatherer.ProtocolSession}) => Promise<void>)|undefined} */
    this._onTargetAttached = undefined;
  }

  /**
   * @param {LH.Gatherer.Context} context
   */
  async startInstrumentation(context) {
    this._sessions = [];
    this._onTargetAttached = async (targetWithSession) => {
      if (targetWithSession.target.type !== 'page' && targetWithSession.target.type !== 'iframe') {
        return;
      }
      this._sessions.push(targetWithSession);
      const session = targetWithSession.session;
      await session.sendCommand('Profiler.enable');
      await session.sendCommand('Profiler.startPreciseCoverage', {detailed: false});
    };
    await context.driver.targetManager.onTargetAttached(this._onTargetAttached);
  }

  /**
   * @param {LH.Gatherer.Context} context
   */
  async stopInstrumentation(context) {
    if (this._onTargetAttached) {
      context.driver.targetManager.offTargetAttached(this._onTargetAttached);
      this._onTargetAttached = undefined;
    }
    for (const {target, session} of this._sessions) {
      try {
        const coverageResponse = await session.sendCommand('Profiler.takePreciseCoverage');
        await session.sendCommand('Profiler.stopPreciseCoverage');
        await session.sendCommand('Profiler.disable');
        for (const entry of coverageResponse.result) {
          if (target.type === 'iframe') {
            entry.scriptId = `${target.targetId}:${entry.scriptId}`;
          }
          this._scriptUsages.push(entry);
        }
      } catch (err) {
        if (target.type === 'page') throw err;
      }
    }
    this._sessions = [];
  }

  /**
   * @return {Promise<LH.Artifacts['JsUsage']>}
   */
  async getArtifact() {
    /** @type {Record<string, LH.Crdp.Profiler.ScriptCoverage>} */
    const usageByScriptId = {};

    for (const scriptUsage of this._scriptUsages) {
      // If `url` is blank, that means the script was dynamically
      // created (eval, new Function, onload, ...)
      if (scriptUsage.url === '' || scriptUsage.url === '_lighthouse-eval.js') {
        // We currently don't consider coverage of dynamic scripts, and we definitely don't want
        // coverage of code Lighthouse ran to inspect the page, so we ignore this ScriptCoverage.
        // Audits would work the same without this, it is only an optimization (not tracking coverage
        // for scripts we don't care about).
        continue;
      }

      // Scripts run via puppeteer's evaluate interface will have this url.
      if (scriptUsage.url === '__puppeteer_evaluation_script__') {
        continue;
      }

      usageByScriptId[scriptUsage.scriptId] = scriptUsage;
    }

    this._scriptUsages = [];

    return usageByScriptId;
  }
}

export default JsUsage;
