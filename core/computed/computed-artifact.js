/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import log from 'lighthouse-logger';

import {ArbitraryEqualityMap} from '../lib/arbitrary-equality-map.js';

/**
 * Decorate computableArtifact with a caching `request()` method which will
 * automatically call `computableArtifact.compute_()` under the hood.
 * @template {{name: string, compute_(dependencies: unknown, context: LH.Artifacts.ComputedContext): Promise<unknown>}} C
 * @template {Array<keyof LH.Util.FirstParamType<C['compute_']>>} K
 * @param {C} computableArtifact
 * @param {(K & ([keyof LH.Util.FirstParamType<C['compute_']>] extends [K[number]] ? unknown : never)) | null} keys List of properties of `dependencies` used by `compute_`; other properties are filtered out. Use `null` to allow all properties. Ensures that only required properties are used for caching result.
 */
function makeComputedArtifact(computableArtifact, keys) {
  // tsc (3.1) has more difficulty with template inter-references in jsdoc, so
  // give types to params and return value the long way, essentially recreating
  // polymorphic-this behavior for C.
  /**
   * Return an automatically cached result from the computed artifact.
   * @param {LH.Util.FirstParamType<C['compute_']>} dependencies
   * @param {LH.Artifacts.ComputedContext} context
   * @return {ReturnType<C['compute_']>}
   */
  const request = (dependencies, context) => {
    const pickedDependencies = keys ?
      Object.fromEntries(keys.map(key => [key, dependencies[key]])) :
      dependencies;

    // NOTE: break immutability solely for this caching-controller function.
    const computedCache = /** @type {Map<string, ArbitraryEqualityMap>} */ (context.computedCache);
    const computedName = computableArtifact.name;

    const cache = computedCache.get(computedName) || new ArbitraryEqualityMap();
    computedCache.set(computedName, cache);

    /** @type {ReturnType<C['compute_']>|undefined} */
    const computed = cache.get(pickedDependencies);
    if (computed) {
      return computed;
    }

    const status = {msg: `Computing artifact: ${computedName}`, id: `lh:computed:${computedName}`};
    log.time(status, 'verbose');

    const artifactPromise = /** @type {ReturnType<C['compute_']>} */
        (computableArtifact.compute_(pickedDependencies, context));
    cache.set(pickedDependencies, artifactPromise);

    artifactPromise.then(() => log.timeEnd(status)).catch(() => log.timeEnd(status));

    return artifactPromise;
  };

  return Object.assign(computableArtifact, {request});
}

export {makeComputedArtifact};
