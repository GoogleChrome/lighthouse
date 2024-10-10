/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import log from 'lighthouse-logger';
import {isEqual} from 'lodash-es';

import {
  getBrowserVersion, getBenchmarkIndex, getEnvironmentWarnings,
} from './driver/environment.js';

/**
 * @param {LH.Config.ResolvedConfig} resolvedConfig
 * @param {LH.Gatherer.Driver} driver
 * @param {{gatherMode: LH.Gatherer.GatherMode}} context
 * @return {Promise<LH.BaseArtifacts>}
 */
async function getBaseArtifacts(resolvedConfig, driver, context) {
  const BenchmarkIndex = await getBenchmarkIndex(driver.executionContext);
  const {userAgent, product} = await getBrowserVersion(driver.defaultSession);

  return {
    // Meta artifacts.
    fetchTime: new Date().toJSON(),
    Timing: [],
    LighthouseRunWarnings: [],
    settings: resolvedConfig.settings,
    // Environment artifacts that can always be computed.
    BenchmarkIndex,
    HostUserAgent: userAgent,
    HostFormFactor: userAgent.includes('Android') || userAgent.includes('Mobile') ?
      'mobile' : 'desktop',
    HostProduct: product,
    // Contextual artifacts whose collection changes based on gather mode.
    URL: {
      finalDisplayedUrl: '',
    },
    PageLoadError: null,
    GatherContext: context,
  };
}

/**
 * Deduplicates identical warnings.
 * @param {Array<string | LH.IcuMessage>} warnings
 * @return {Array<string | LH.IcuMessage>}
 */
function deduplicateWarnings(warnings) {
  /** @type {Array<string | LH.IcuMessage>} */
  const unique = [];

  for (const warning of warnings) {
    if (unique.some(existing => isEqual(warning, existing))) continue;
    unique.push(warning);
  }

  return unique;
}

/**
 * @param {LH.BaseArtifacts} baseArtifacts
 * @param {Partial<LH.GathererArtifacts>} gathererArtifacts
 * @return {LH.Artifacts}
 */
function finalizeArtifacts(baseArtifacts, gathererArtifacts) {
  baseArtifacts.LighthouseRunWarnings.push(
    ...getEnvironmentWarnings({settings: baseArtifacts.settings, baseArtifacts})
  );

  // Cast to remove the partial from gathererArtifacts.
  const artifacts = /** @type {LH.Artifacts} */ ({...baseArtifacts, ...gathererArtifacts});

  // Set the post-run meta artifacts.
  artifacts.Timing = log.getTimeEntries();
  artifacts.LighthouseRunWarnings = deduplicateWarnings(baseArtifacts.LighthouseRunWarnings);

  if (artifacts.PageLoadError && !artifacts.URL.finalDisplayedUrl) {
    artifacts.URL.finalDisplayedUrl = artifacts.URL.requestedUrl || '';
  }

  // Check that the runner remembered to mutate the special-case URL artifact.
  if (!artifacts.URL.finalDisplayedUrl) throw new Error('Runner did not set finalDisplayedUrl');

  return artifacts;
}

export {
  getBaseArtifacts,
  finalizeArtifacts,
};
