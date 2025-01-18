/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {ReportGenerator} from '../report/generator/report-generator.js';
import {snapshotGather} from './gather/snapshot-runner.js';
import {startTimespanGather} from './gather/timespan-runner.js';
import {navigationGather} from './gather/navigation-runner.js';
import {Runner} from './runner.js';
import {initializeConfig} from './config/config.js';
import {getFormatted} from '../shared/localization/format.js';
import {mergeConfigFragment, deepClone} from './config/config-helpers.js';
import * as i18n from './lib/i18n/i18n.js';
import * as LH from '../types/lh.js';

/** @typedef {WeakMap<LH.UserFlow.GatherStep, LH.Gatherer.GatherResult['runnerOptions']>} GatherStepRunnerOptions */

const UIStrings = {
  /**
   * @description Default name for a user flow on the given url. "User flow" refers to the series of page navigations and user interactions being tested on the page. "url" is a trimmed version of a url that only includes the domain name.
   * @example {example.com} url
   */
  defaultFlowName: 'User flow ({url})',
  /**
   * @description Default name for a Lighthouse report that analyzes a page navigation. "url" is a trimmed version of a url that only includes the domain name and path.
   * @example {example.com/page} url
   */
  defaultNavigationName: 'Navigation report ({url})',
  /**
   * @description Default name for a Lighthouse report that analyzes user interactions over a period of time. "url" is a trimmed version of a url that only includes the domain name and path.
   * @example {example.com/page} url
   */
  defaultTimespanName: 'Timespan report ({url})',
  /**
   * @description Default name for a Lighthouse report that analyzes the page state at a point in time. "url" is a trimmed version of a url that only includes the domain name and path.
   * @example {example.com/page} url
   */
  defaultSnapshotName: 'Snapshot report ({url})',
};

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

/**
 * @param {string} message
 * @param {Record<string, string | number>} values
 * @param {LH.Locale} locale
 */
function translate(message, values, locale) {
  const icuMessage = str_(message, values);
  return getFormatted(icuMessage, locale);
}

class UserFlow {
  /**
   * @param {LH.Puppeteer.Page} page
   * @param {LH.UserFlow.Options} [options]
   */
  constructor(page, options) {
    /** @type {LH.Puppeteer.Page} */
    this._page = page;
    /** @type {LH.UserFlow.Options|undefined} */
    this._options = options;
    /** @type {LH.UserFlow.GatherStep[]} */
    this._gatherSteps = [];
    /** @type {GatherStepRunnerOptions} */
    this._gatherStepRunnerOptions = new WeakMap();
  }

  /**
   * @param {LH.UserFlow.StepFlags|undefined} flags
   * @return {LH.UserFlow.StepFlags|undefined}
   */
  _getNextFlags(flags) {
    const clonedFlowFlags = this._options?.flags && deepClone(this._options?.flags);
    const mergedFlags = mergeConfigFragment(clonedFlowFlags || {}, flags || {}, true);

    if (mergedFlags.usePassiveGathering === undefined) {
      mergedFlags.usePassiveGathering = true;
    }

    return mergedFlags;
  }

  /**
   * @param {LH.UserFlow.StepFlags|undefined} flags
   * @return {LH.UserFlow.StepFlags}
   */
  _getNextNavigationFlags(flags) {
    const newStepFlags = this._getNextFlags(flags) || {};

    if (newStepFlags.skipAboutBlank === undefined) {
      newStepFlags.skipAboutBlank = true;
    }

    // On repeat navigations, we want to disable storage reset by default (i.e. it's not a cold load).
    const isSubsequentNavigation = this._gatherSteps
      .some(step => step.artifacts.GatherContext.gatherMode === 'navigation');
    if (isSubsequentNavigation) {
      if (newStepFlags.disableStorageReset === undefined) {
        newStepFlags.disableStorageReset = true;
      }
    }

    return newStepFlags;
  }

  /**
   * @param {LH.Gatherer.GatherResult} gatherResult
   * @param {LH.UserFlow.StepFlags} [flags]
   */
  _addGatherStep(gatherResult, flags) {
    const gatherStep = {
      artifacts: gatherResult.artifacts,
      flags,
    };
    this._gatherSteps.push(gatherStep);
    this._gatherStepRunnerOptions.set(gatherStep, gatherResult.runnerOptions);
  }

  /**
   * @param {LH.NavigationRequestor} requestor
   * @param {LH.UserFlow.StepFlags} [flags]
   */
  async navigate(requestor, flags) {
    if (this.currentTimespan) throw new Error('Timespan already in progress');
    if (this.currentNavigation) throw new Error('Navigation already in progress');

    const nextFlags = this._getNextNavigationFlags(flags);
    const gatherResult = await navigationGather(this._page, requestor, {
      config: this._options?.config,
      flags: nextFlags,
    });

    this._addGatherStep(gatherResult, nextFlags);
  }

  /**
   * This is an alternative to `navigate()` that can be used to analyze a navigation triggered by user interaction.
   * For more on user triggered navigations, see https://github.com/GoogleChrome/lighthouse/blob/main/docs/user-flows.md#triggering-a-navigation-via-user-interactions.
   *
   * @param {LH.UserFlow.StepFlags} [stepOptions]
   */
  async startNavigation(stepOptions) {
    /** @type {(value: () => void) => void} */
    let completeSetup;
    /** @type {(value: any) => void} */
    let rejectDuringSetup;

    // This promise will resolve once the setup is done
    // and Lighthouse is waiting for a page navigation to be triggered.
    const navigationSetupPromise = new Promise((resolve, reject) => {
      completeSetup = resolve;
      rejectDuringSetup = reject;
    });

    // The promise in this callback will not resolve until `continueNavigation` is invoked,
    // because `continueNavigation` is passed along to `navigateSetupPromise`
    // and extracted into `continueAndAwaitResult` below.
    const navigationResultPromise = this.navigate(
      () => new Promise(continueNavigation => completeSetup(continueNavigation)),
      stepOptions
    ).catch(err => {
      if (this.currentNavigation) {
        // If the navigation already started, re-throw the error so it is emitted when `navigationResultPromise` is awaited.
        throw err;
      } else {
        // If the navigation has not started, reject the `navigationSetupPromise` so the error throws when it is awaited in `startNavigation`.
        rejectDuringSetup(err);
      }
    });

    const continueNavigation = await navigationSetupPromise;

    async function continueAndAwaitResult() {
      continueNavigation();
      await navigationResultPromise;
    }

    this.currentNavigation = {continueAndAwaitResult};
  }

  async endNavigation() {
    if (this.currentTimespan) throw new Error('Timespan already in progress');
    if (!this.currentNavigation) throw new Error('No navigation in progress');
    await this.currentNavigation.continueAndAwaitResult();
    this.currentNavigation = undefined;
  }

  /**
   * @param {LH.UserFlow.StepFlags} [flags]
   */
  async startTimespan(flags) {
    if (this.currentTimespan) throw new Error('Timespan already in progress');
    if (this.currentNavigation) throw new Error('Navigation already in progress');

    const nextFlags = this._getNextFlags(flags);

    const timespan = await startTimespanGather(this._page, {
      config: this._options?.config,
      flags: nextFlags,
    });
    this.currentTimespan = {timespan, flags: nextFlags};
  }

  async endTimespan() {
    if (!this.currentTimespan) throw new Error('No timespan in progress');
    if (this.currentNavigation) throw new Error('Navigation already in progress');

    const {timespan, flags} = this.currentTimespan;
    const gatherResult = await timespan.endTimespanGather();
    this.currentTimespan = undefined;

    this._addGatherStep(gatherResult, flags);
  }

  /**
   * @param {LH.UserFlow.StepFlags} [flags]
   */
  async snapshot(flags) {
    if (this.currentTimespan) throw new Error('Timespan already in progress');
    if (this.currentNavigation) throw new Error('Navigation already in progress');

    const nextFlags = this._getNextFlags(flags);

    const gatherResult = await snapshotGather(this._page, {
      config: this._options?.config,
      flags: nextFlags,
    });

    this._addGatherStep(gatherResult, nextFlags);
  }

  /**
   * @returns {Promise<LH.FlowResult>}
   */
  async createFlowResult() {
    return auditGatherSteps(this._gatherSteps, {
      name: this._options?.name,
      config: this._options?.config,
      gatherStepRunnerOptions: this._gatherStepRunnerOptions,
    });
  }

  /**
   * @return {Promise<string>}
   */
  async generateReport() {
    const flowResult = await this.createFlowResult();
    return ReportGenerator.generateFlowReportHtml(flowResult);
  }

  /**
   * @return {LH.UserFlow.FlowArtifacts}
   */
  createArtifactsJson() {
    return {
      gatherSteps: this._gatherSteps,
      name: this._options?.name,
    };
  }
}

/**
 * @param {string} longUrl
 * @returns {string}
 */
function shortenUrl(longUrl) {
  const url = new URL(longUrl);
  return `${url.hostname}${url.pathname}`;
}

/**
 * @param {LH.UserFlow.StepFlags|undefined} flags
 * @param {LH.Artifacts} artifacts
 * @return {string}
 */
function getStepName(flags, artifacts) {
  if (flags?.name) return flags.name;

  const {locale} = artifacts.settings;
  const shortUrl = shortenUrl(artifacts.URL.finalDisplayedUrl);
  switch (artifacts.GatherContext.gatherMode) {
    case 'navigation':
      return translate(UIStrings.defaultNavigationName, {url: shortUrl}, locale);
    case 'timespan':
      return translate(UIStrings.defaultTimespanName, {url: shortUrl}, locale);
    case 'snapshot':
      return translate(UIStrings.defaultSnapshotName, {url: shortUrl}, locale);
    default:
      throw new Error('Unsupported gather mode');
  }
}

/**
 * @param {string|undefined} name
 * @param {LH.UserFlow.GatherStep[]} gatherSteps
 * @return {string}
 */
function getFlowName(name, gatherSteps) {
  if (name) return name;

  const firstArtifacts = gatherSteps[0].artifacts;
  const {locale} = firstArtifacts.settings;
  const url = new URL(firstArtifacts.URL.finalDisplayedUrl).hostname;
  return translate(UIStrings.defaultFlowName, {url}, locale);
}

/**
 * @param {Array<LH.UserFlow.GatherStep>} gatherSteps
 * @param {{name?: string, config?: LH.Config, gatherStepRunnerOptions?: GatherStepRunnerOptions}} options
 */
async function auditGatherSteps(gatherSteps, options) {
  if (!gatherSteps.length) {
    throw new Error('Need at least one step before getting the result');
  }

  /** @type {LH.FlowResult['steps']} */
  const steps = [];
  for (const gatherStep of gatherSteps) {
    const {artifacts, flags} = gatherStep;
    const name = getStepName(flags, artifacts);

    let runnerOptions = options.gatherStepRunnerOptions?.get(gatherStep);

    // If the gather step is not active, we must recreate the runner options.
    if (!runnerOptions) {
      // Step specific configs take precedence over a config for the entire flow.
      const config = options.config;
      const {gatherMode} = artifacts.GatherContext;
      const {resolvedConfig} = await initializeConfig(gatherMode, config, flags);
      runnerOptions = {
        resolvedConfig,
        computedCache: new Map(),
      };
    }

    const result = await Runner.audit(artifacts, runnerOptions);
    if (!result) throw new Error(`Step "${name}" did not return a result`);
    steps.push({lhr: result.lhr, name});
  }

  return {steps, name: getFlowName(options.name, gatherSteps)};
}


export {
  UserFlow,
  auditGatherSteps,
  getStepName,
  getFlowName,
  UIStrings,
};
