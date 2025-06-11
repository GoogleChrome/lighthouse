/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @typedef CollectPhaseArtifactOptions
 * @property {import('./driver.js').Driver} driver
 * @property {LH.Puppeteer.Page} page
 * @property {Array<LH.Config.AnyArtifactDefn>} artifactDefinitions
 * @property {ArtifactState} artifactState
 * @property {LH.BaseArtifacts} baseArtifacts
 * @property {LH.Gatherer.GatherPhase} phase
 * @property {LH.Gatherer.GatherMode} gatherMode
 * @property {Map<string, LH.ArbitraryEqualityMap>} computedCache
 * @property {LH.Config.Settings} settings
 */

/** @typedef {Record<string, Promise<any>>} IntermediateArtifacts */

/** @typedef {Record<CollectPhaseArtifactOptions['phase'], IntermediateArtifacts>} ArtifactState */

/** @typedef {LH.Gatherer.Context<LH.Gatherer.DependencyKey>['dependencies']} Dependencies */

import log from 'lighthouse-logger';

import {Sentry} from '../lib/sentry.js';

/**
 *
 * @param {{id: string}} dependency
 * @param {Error} error
 */
function createDependencyError(dependency, error) {
  const err = new Error(`Dependency "${dependency.id}" failed with exception: ${error.message}`);
  // @ts-expect-error - We already reported the original error to Sentry, don't do it again.
  err.expected = true;
  return err;
}

/** @return {ArtifactState} */
function getEmptyArtifactState() {
  return {
    startInstrumentation: {},
    startSensitiveInstrumentation: {},
    stopSensitiveInstrumentation: {},
    stopInstrumentation: {},
    getArtifact: {},
  };
}


// We make this an explicit record instead of array, so it's easily type checked.
/** @type {Record<CollectPhaseArtifactOptions['phase'], CollectPhaseArtifactOptions['phase'] | undefined>} */
const phaseToPriorPhase = {
  startInstrumentation: undefined,
  startSensitiveInstrumentation: 'startInstrumentation',
  stopSensitiveInstrumentation: 'startSensitiveInstrumentation',
  stopInstrumentation: 'stopSensitiveInstrumentation',
  getArtifact: 'stopInstrumentation',
};

/**
 * Runs the gatherer methods for a particular navigation phase (startInstrumentation/getArtifact/etc).
 * All gatherer method return values are stored on the artifact state object, organized by phase.
 * This method collects required dependencies, runs the applicable gatherer methods, and saves the
 * result on the artifact state object that was passed as part of `options`.
 *
 * @param {CollectPhaseArtifactOptions} options
 */
async function collectPhaseArtifacts(options) {
  const {
    driver,
    page,
    artifactDefinitions,
    artifactState,
    baseArtifacts,
    phase,
    gatherMode,
    computedCache,
    settings,
  } = options;
  const priorPhase = phaseToPriorPhase[phase];
  const priorPhaseArtifacts = (priorPhase && artifactState[priorPhase]) || {};
  const isFinalPhase = phase === 'getArtifact';

  for (const artifactDefn of artifactDefinitions) {
    log.verbose(`artifacts:${phase}`, artifactDefn.id);
    const gatherer = artifactDefn.gatherer.instance;

    const priorArtifactPromise = priorPhaseArtifacts[artifactDefn.id] || Promise.resolve();
    const artifactPromise = priorArtifactPromise.then(async () => {
      const dependencies = isFinalPhase
        ? await collectArtifactDependencies(artifactDefn, artifactState.getArtifact)
        : /** @type {Dependencies} */ ({});

      const status = {
        msg: `Getting artifact: ${artifactDefn.id}`,
        id: `lh:gather:getArtifact:${artifactDefn.id}`,
      };
      if (isFinalPhase) {
        log.time(status);
      }

      const artifact = await gatherer[phase]({
        gatherMode,
        driver,
        page,
        baseArtifacts,
        dependencies,
        computedCache,
        settings,
      });

      if (isFinalPhase) {
        log.timeEnd(status);
      }

      return artifact;
    });

    await artifactPromise.catch((err) => {
      Sentry.captureException(err, {
        tags: {gatherer: artifactDefn.id, phase},
        level: 'error',
      });
      log.error(artifactDefn.id, err.message);
    });
    artifactState[phase][artifactDefn.id] = artifactPromise;
  }
}

/**
 * @param {LH.Config.AnyArtifactDefn} artifact
 * @param {Record<string, LH.Gatherer.PhaseResult>} artifactsById
 * @return {Promise<Dependencies>}
 */
async function collectArtifactDependencies(artifact, artifactsById) {
  if (!artifact.dependencies) return /** @type {Dependencies} */ ({});

  const dependencyPromises = Object.entries(artifact.dependencies).map(
    async ([dependencyName, dependency]) => {
      const dependencyArtifact = artifactsById[dependency.id];
      if (dependencyArtifact === undefined) throw new Error(`"${dependency.id}" did not run`);
      if (dependencyArtifact instanceof Error) {
        throw createDependencyError(dependency, dependencyArtifact);
      }

      const dependencyPromise = Promise.resolve()
        .then(() => dependencyArtifact)
        .catch(err => Promise.reject(createDependencyError(dependency, err)));

      return [dependencyName, await dependencyPromise];
    }
  );

  return Object.fromEntries(await Promise.all(dependencyPromises));
}

/**
 * Awaits the result of artifact, catching errors to set the artifact to an error instead.
 *
 * @param {ArtifactState} artifactState
 * @return {Promise<Partial<LH.GathererArtifacts>>}
 */
async function awaitArtifacts(artifactState) {
  /** @type {IntermediateArtifacts} */
  const artifacts = {};

  for (const [id, promise] of Object.entries(artifactState.getArtifact)) {
    const artifact = await promise.catch(err => err);
    if (artifact !== undefined) artifacts[id] = artifact;
  }

  return artifacts;
}

export {
  getEmptyArtifactState,
  awaitArtifacts,
  collectPhaseArtifacts,
  collectArtifactDependencies,
};
