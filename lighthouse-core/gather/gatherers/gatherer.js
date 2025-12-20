/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/** @typedef {void|LH.GathererArtifacts[keyof LH.GathererArtifacts]} PhaseResult */

/**
 * Base class for all gatherers; defines pass lifecycle methods. The artifact
 * from the gatherer is the last not-undefined value returned by a lifecycle
 * method. All methods can return the artifact value directly or return a
 * Promise that resolves to that value.
 *
 * If an Error is thrown (or a Promise that rejects on an Error),
 * the runner will treat it as an error internal to the gatherer and
 * continue execution of any remaining gatherers.
 */
class Gatherer {
  /**
   * @return {keyof LH.GathererArtifacts}
   */
  get name() {
    // @ts-ignore - assume that class name has been added to LH.GathererArtifacts.
    return this.constructor.name;
  }

  /* eslint-disable no-unused-vars */

  /**
   * Called before navigation to target url.
   * @param {LH.Gatherer.PassContext} passContext
   * @return {PhaseResult|Promise<PhaseResult>}
   */
  beforePass(passContext) { }

  /**
   * Called after target page is loaded. If a trace is enabled for this pass,
   * the trace is still being recorded.
   * @param {LH.Gatherer.PassContext} passContext
   * @return {PhaseResult|Promise<PhaseResult>}
   */
  pass(passContext) { }

  /**
   * Called after target page is loaded, all gatherer `pass` methods have been
   * executed, and — if generated in this pass — the trace is ended. The trace
   * and record of network activity are provided in `loadData`.
   * @param {LH.Gatherer.PassContext} passContext
   * @param {LH.Gatherer.LoadData} loadData
   * @return {PhaseResult|Promise<PhaseResult>}
   */
  afterPass(passContext, loadData) { }

  /* eslint-enable no-unused-vars */
}

module.exports = Gatherer;
