/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Driver = require('./driver.js');
const Runner = require('../../runner.js');
const {collectArtifactDependencies} = require('./runner-helpers.js');
const {defaultNavigationConfig} = require('../../config/constants.js');
const {initializeConfig} = require('../config/config.js');
const {getBaseArtifacts} = require('./base-artifacts.js');

/**
 * @typedef NavigationContext
 * @property {Driver} driver
 * @property {LH.Config.NavigationDefn} navigation
 * @property {string} requestedUrl
 */

/** @typedef {Record<string, Promise<any>>} IntermediateArtifacts */

/**
 * @typedef CollectPhaseArtifactOptions
 * @property {NavigationContext} navigationContext
 * @property {ArtifactState} artifacts
 * @property {keyof Omit<LH.Gatherer.FRGathererInstance, 'name'|'meta'>} phase
 */

/** @typedef {Record<CollectPhaseArtifactOptions['phase'], IntermediateArtifacts>} ArtifactState */

/**
 * @param {{driver: Driver, config: LH.Config.FRConfig, requestedUrl: string}} args
 */
async function _setup({driver, config, requestedUrl}) {
  await driver.connect();
  // TODO(FR-COMPAT): use frameNavigated-based navigation
  await driver._page.goto(defaultNavigationConfig.blankPage);

  // TODO(FR-COMPAT): setupDriver

  const baseArtifacts = await getBaseArtifacts(config, driver);
  baseArtifacts.URL.requestedUrl = requestedUrl;

  return {baseArtifacts};
}

/**
 * @param {NavigationContext} navigationContext
 */
async function _setupNavigation({driver, navigation}) {
  // TODO(FR-COMPAT): use frameNavigated-based navigation
  await driver._page.goto(navigation.blankPage);

  // TODO(FR-COMPAT): setup network conditions (throttling & cache state)
}

/** @type {Set<CollectPhaseArtifactOptions['phase']>} */
const phasesRequiringDependencies = new Set(['afterTimespan', 'afterNavigation', 'snapshot']);
/** @type {Record<CollectPhaseArtifactOptions['phase'], LH.Gatherer.GatherMode>} */
const phaseToGatherMode = {
  beforeNavigation: 'navigation',
  beforeTimespan: 'timespan',
  afterTimespan: 'timespan',
  afterNavigation: 'navigation',
  snapshot: 'snapshot',
};
/** @type {Record<CollectPhaseArtifactOptions['phase'], CollectPhaseArtifactOptions['phase'] | undefined>} */
const phaseToPriorPhase = {
  beforeNavigation: undefined,
  beforeTimespan: undefined,
  afterTimespan: 'beforeTimespan',
  afterNavigation: 'beforeNavigation',
  snapshot: undefined,
};

/**
 * Runs the gatherer methods for a particular navigation phase (beforeTimespan/afterNavigation/etc).
 * All gatherer method return values are stored on the artifact state object, organized by phase.
 * This method collects required dependencies, runs the applicable gatherer methods, and saves the
 * result on the artifact state object that was passed as part of `options`.
 *
 * @param {CollectPhaseArtifactOptions} options
 */
async function _collectPhaseArtifacts({navigationContext, artifacts, phase}) {
  const gatherMode = phaseToGatherMode[phase];
  const priorPhase = phaseToPriorPhase[phase];
  const priorPhaseArtifacts = (priorPhase && artifacts[priorPhase]) || {};

  for (const artifactDefn of navigationContext.navigation.artifacts) {
    const gatherer = artifactDefn.gatherer.instance;
    if (!gatherer.meta.supportedModes.includes(gatherMode)) continue;

    const priorArtifactPromise = priorPhaseArtifacts[artifactDefn.id] || Promise.resolve();
    const artifactPromise = priorArtifactPromise.then(async () => {
      const dependencies = phasesRequiringDependencies.has(phase)
        ? await collectArtifactDependencies(artifactDefn, await _mergeArtifacts(artifacts))
        : {};

      return gatherer[phase]({
        url: await navigationContext.driver.url(),
        driver: navigationContext.driver,
        gatherMode: 'navigation',
        dependencies,
      });
    });

    // Do not set the artifact promise if the result was `undefined`.
    const result = await artifactPromise.catch(err => err);
    if (result === undefined) continue;
    artifacts[phase][artifactDefn.id] = artifactPromise;
  }
}

/**
 * @param {NavigationContext} navigationContext
 */
async function _navigate(navigationContext) {
  const {driver, requestedUrl} = navigationContext;
  // TODO(FR-COMPAT): use waitForCondition-based navigation
  await driver._page.goto(requestedUrl, {waitUntil: ['load', 'networkidle2']});

  // TODO(FR-COMPAT): disable all throttling settings
  // TODO(FR-COMPAT): capture page load errors
}

/**
 * Merges artifact in Lighthouse order of specificity.
 * If a gatherer method returns `undefined`, the artifact is skipped for that phase (treated as not set).
 *
 *  - Navigation artifacts are the most specific. These win over anything.
 *  - Snapshot artifacts win out next as they have access to all available information.
 *  - Timespan artifacts win when nothing else is defined.
 *
 * @param {ArtifactState} artifactState
 * @return {Promise<Partial<LH.GathererArtifacts>>}
 */
async function _mergeArtifacts(artifactState) {
  /** @type {IntermediateArtifacts} */
  const artifacts = {};

  const artifactResultsInIncreasingPriority = [
    artifactState.afterTimespan,
    artifactState.snapshot,
    artifactState.afterNavigation,
  ];

  for (const artifactResults of artifactResultsInIncreasingPriority) {
    for (const [id, promise] of Object.entries(artifactResults)) {
      const artifact = await promise.catch(err => err);
      if (artifact === undefined) continue;
      artifacts[id] = artifact;
    }
  }

  return artifacts;
}

/**
 * @param {NavigationContext} navigationContext
 */
async function _navigation(navigationContext) {
  /** @type {ArtifactState} */
  const artifactState = {
    beforeNavigation: {},
    beforeTimespan: {},
    afterTimespan: {},
    afterNavigation: {},
    snapshot: {},
  };

  const options = {navigationContext, artifacts: artifactState};

  await _setupNavigation(navigationContext);
  await _collectPhaseArtifacts({phase: 'beforeNavigation', ...options});
  await _collectPhaseArtifacts({phase: 'beforeTimespan', ...options});
  await _navigate(navigationContext);
  await _collectPhaseArtifacts({phase: 'afterTimespan', ...options});
  await _collectPhaseArtifacts({phase: 'afterNavigation', ...options});
  await _collectPhaseArtifacts({phase: 'snapshot', ...options});

  const artifacts = await _mergeArtifacts(artifactState);
  return {artifacts};
}

/**
 * @param {{driver: Driver, config: LH.Config.FRConfig, requestedUrl: string}} args
 */
async function _navigations({driver, config, requestedUrl}) {
  if (!config.navigations) throw new Error('No navigations configured');

  /** @type {Partial<LH.GathererArtifacts>} */
  const artifacts = {};

  for (const navigation of config.navigations) {
    const navigationContext = {
      driver,
      navigation,
      requestedUrl,
    };

    const navigationResult = await _navigation(navigationContext);
    Object.assign(artifacts, navigationResult.artifacts);
  }

  return {artifacts};
}

/**
 * @param {{driver: Driver}} args
 */
async function _cleanup({driver}) { // eslint-disable-line no-unused-vars
  // TODO(FR-COMPAT): clear storage if necessary
}

/**
 * @param {{url: string, page: import('puppeteer').Page, config?: LH.Config.Json}} options
 * @return {Promise<LH.RunnerResult|undefined>}
 */
async function navigation(options) {
  const {url: requestedUrl, page} = options;
  const {config} = initializeConfig(options.config, {gatherMode: 'navigation'});

  const driver = new Driver(page);
  const {baseArtifacts} = await _setup({driver, config, requestedUrl});
  const {artifacts: gathererArtifacts} = await _navigations({driver, config, requestedUrl});
  await _cleanup({driver});

  const artifacts = /** @type {LH.Artifacts} */ ({...baseArtifacts, ...gathererArtifacts}); // Cast to drop Partial<>

  return Runner.run(artifacts, {config});
}

module.exports = {
  navigation,
  _setup,
  _setupNavigation,
  _collectPhaseArtifacts,
  _navigate,
  _navigation,
  _navigations,
  _cleanup,
};
