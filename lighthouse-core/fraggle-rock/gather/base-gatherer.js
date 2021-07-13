/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-disable no-unused-vars */

/**
 * Base class for all gatherers supporting both Fraggle Rock and the legacy flow.
 * Most extending classes should implement the Fraggle Rock API and let this class handle translation.
 * See lighthouse-core/gather/gatherers/gatherer.js for legacy method explanations.
 *
 * @implements {LH.Gatherer.GathererInstance}
 * @implements {LH.Gatherer.FRGathererInstance}
 */
class FRGatherer {
  /** @type {LH.Gatherer.GathererMeta} */
  meta = {supportedModes: []}

  /**
   * Method to start observing a page for an arbitrary period of time.
   * @param {LH.Gatherer.FRTransitionalContext} passContext
   * @return {Promise<void>|void}
   */
  startInstrumentation(passContext) { }

  /**
   * Method to start observing a page when the measurements are very sensitive and
   * should observe as little Lighthouse-induced work as possible.
   * @param {LH.Gatherer.FRTransitionalContext} passContext
   * @return {Promise<void>|void}
   */
  startSensitiveInstrumentation(passContext) { }

  /**
   * Method to stop observing a page when the measurements are very sensitive and
   * should observe as little Lighthouse-induced work as possible.
   *
   * @param {LH.Gatherer.FRTransitionalContext} passContext
   * @return {Promise<void>|void}
   */
  stopSensitiveInstrumentation(passContext) { }

  /**
   * Method to end observing a page after an arbitrary period of time.
   * @param {LH.Gatherer.FRTransitionalContext} passContext
   * @return {Promise<void>|void}
   */
  stopInstrumentation(passContext) { }

  /**
   * Method to gather results about a page.
   * @param {LH.Gatherer.FRTransitionalContext} passContext
   * @return {LH.Gatherer.PhaseResult}
   */
  getArtifact(passContext) { }

  /**
   * Legacy property used to define the artifact ID. In Fraggle Rock, the artifact ID lives on the config.
   * @return {keyof LH.GathererArtifacts}
   */
  get name() {
    let name = this.constructor.name;
    // Rollup will mangle class names in an known way–just trim until `$`.
    if (name.includes('$')) {
      name = name.substr(0, name.indexOf('$'));
    }
    // @ts-expect-error - assume that class name has been added to LH.GathererArtifacts.
    return name;
  }

  /**
   * Legacy method. Called before navigation to target url, roughly corresponds to `startInstrumentation`.
   * @param {LH.Gatherer.PassContext} passContext
   * @return {Promise<LH.Gatherer.PhaseResultNonPromise>}
   */
  async beforePass(passContext) {
    await this.startInstrumentation({...passContext, dependencies: {}});
    await this.startSensitiveInstrumentation({...passContext, dependencies: {}});
  }

  /**
   * Legacy method. Should never be used by a Fraggle Rock gatherer, here for compat only.
   * @param {LH.Gatherer.PassContext} passContext
   * @return {LH.Gatherer.PhaseResult}
   */
  pass(passContext) { }

  /**
   * Legacy method. Roughly corresponds to `stopInstrumentation` or `getArtifact` depending on type of gatherer.
   * @param {LH.Gatherer.PassContext} passContext
   * @param {LH.Gatherer.LoadData} loadData
   * @return {Promise<LH.Gatherer.PhaseResultNonPromise>}
   */
  async afterPass(passContext, loadData) {
    if ('dependencies' in this.meta) {
      throw Error('Gatherer with dependencies should override afterPass');
    }
    await this.stopSensitiveInstrumentation({...passContext, dependencies: {}});
    await this.stopInstrumentation({...passContext, dependencies: {}});
    return this.getArtifact({...passContext, dependencies: {}});
  }
}

module.exports = FRGatherer;
