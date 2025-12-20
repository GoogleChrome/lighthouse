/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ArbitraryEqualityMap = require('../lib/arbitrary-equality-map.js');
const log = require('lighthouse-logger');

/**
 * Decorate computableArtifact with a caching `request()` method which will
 * automatically call `computableArtifact.compute_()` under the hood.
 * @template {{name: string, compute_(artifacts: unknown, context: LH.Audit.Context): Promise<unknown>}} C
 * @param {C} computableArtifact
 */
function makeComputedArtifact(computableArtifact) {
  // tsc (3.1) has more difficulty with template inter-references in jsdoc, so
  // give types to params and return value the long way, essentially recreating
  // polymorphic-this behavior for C.
  /**
   * Return an automatically cached result from the computed artifact.
   * @param {FirstParamType<C['compute_']>} artifacts
   * @param {LH.Audit.Context} context
   * @return {ReturnType<C['compute_']>}
   */
  const request = (artifacts, context) => {
    // NOTE: break immutability solely for this caching-controller function.
    const computedCache = /** @type {Map<string, ArbitraryEqualityMap>} */ (context.computedCache);
    const computedName = computableArtifact.name;

    const cache = computedCache.get(computedName) || new ArbitraryEqualityMap();
    computedCache.set(computedName, cache);

    const computed = /** @type {ReturnType<C['compute_']>|undefined} */ (cache.get(artifacts));
    if (computed) {
      return computed;
    }

    const status = {msg: `Computing artifact: ${computedName}`, id: `lh:computed:${computedName}`};
    log.time(status, 'verbose');

    const artifactPromise = /** @type {ReturnType<C['compute_']>} */
        (computableArtifact.compute_(artifacts, context));
    cache.set(artifacts, artifactPromise);

    artifactPromise.then(() => log.timeEnd(status)).catch(() => log.timeEnd(status));

    return artifactPromise;
  };

  return Object.assign(computableArtifact, {request});
}

module.exports = makeComputedArtifact;
