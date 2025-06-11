/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import log from 'lighthouse-logger';

import {Driver} from './driver.js';
import {Runner} from '../runner.js';
import {getEmptyArtifactState, collectPhaseArtifacts, awaitArtifacts} from './runner-helpers.js';
import {enableAsyncStacks, prepareTargetForTimespanMode} from './driver/prepare.js';
import {initializeConfig} from '../config/config.js';
import {getBaseArtifacts, finalizeArtifacts} from './base-artifacts.js';
import * as i18n from '../lib/i18n/i18n.js';

/* eslint-disable max-len */
const UIStrings = {
  /** A warning that indicates page navigations should be audited using navigation mode, as opposed to timespan mode. "navigation mode" refers to a Lighthouse mode that analyzes a page navigation. "timespan mode" refers to a Lighthouse mode that analyzes user interactions over an arbitrary period of time. */
  warningNavigationDetected: 'A page navigation was detected during the run. Using timespan mode to audit page navigations is not recommended. Use navigation mode to audit page navigations for better third-party attribution and main thread detection.',
};
/* eslint-enable max-len */

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

/**
 * @param {LH.Puppeteer.Page} page
 * @param {{config?: LH.Config, flags?: LH.Flags}} [options]
 * @return {Promise<{endTimespanGather(): Promise<LH.Gatherer.GatherResult>}>}
 */
async function startTimespanGather(page, options = {}) {
  const {flags = {}, config} = options;
  log.setLevel(flags.logLevel || 'error');

  const {resolvedConfig} = await initializeConfig('timespan', config, flags);
  const driver = new Driver(page);
  await driver.connect();

  /** @type {Map<string, LH.ArbitraryEqualityMap>} */
  const computedCache = new Map();
  const artifactDefinitions = resolvedConfig.artifacts || [];
  const baseArtifacts = await getBaseArtifacts(resolvedConfig, driver, {gatherMode: 'timespan'});
  const artifactState = getEmptyArtifactState();
  /** @type {Omit<import('./runner-helpers.js').CollectPhaseArtifactOptions, 'phase'>} */
  const phaseOptions = {
    driver,
    page,
    artifactDefinitions,
    artifactState,
    baseArtifacts,
    computedCache,
    gatherMode: 'timespan',
    settings: resolvedConfig.settings,
  };

  await prepareTargetForTimespanMode(driver, resolvedConfig.settings);

  let pageNavigationDetected = false;
  function onFrameNavigated() {
    pageNavigationDetected = true;
  }

  driver.defaultSession.on('Page.frameNavigated', onFrameNavigated);

  const disableAsyncStacks = await enableAsyncStacks(driver.defaultSession);

  await collectPhaseArtifacts({phase: 'startInstrumentation', ...phaseOptions});
  await collectPhaseArtifacts({phase: 'startSensitiveInstrumentation', ...phaseOptions});

  return {
    async endTimespanGather() {
      const finalDisplayedUrl = await driver.url();

      const runnerOptions = {resolvedConfig, computedCache};
      const gatherFn = async () => {
        baseArtifacts.URL = {finalDisplayedUrl};

        await collectPhaseArtifacts({phase: 'stopSensitiveInstrumentation', ...phaseOptions});
        await collectPhaseArtifacts({phase: 'stopInstrumentation', ...phaseOptions});

        // bf-cache-failures can emit `Page.frameNavigated` at the end of the run.
        // This can cause us to issue protocol commands after the target closes.
        // We should disable our `Page.frameNavigated` handlers before that.
        await disableAsyncStacks();

        driver.defaultSession.off('Page.frameNavigated', onFrameNavigated);
        if (pageNavigationDetected) {
          baseArtifacts.LighthouseRunWarnings.push(str_(UIStrings.warningNavigationDetected));
        }

        await collectPhaseArtifacts({phase: 'getArtifact', ...phaseOptions});
        await driver.disconnect();

        const artifacts = await awaitArtifacts(artifactState);
        return finalizeArtifacts(baseArtifacts, artifacts);
      };

      const artifacts = await Runner.gather(gatherFn, runnerOptions);
      return {artifacts, runnerOptions};
    },
  };
}

export {
  startTimespanGather,
  UIStrings,
};
