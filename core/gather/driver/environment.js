/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import log from 'lighthouse-logger';

import * as constants from '../../config/constants.js';
import {pageFunctions} from '../../lib/page-functions.js';
import * as i18n from '../../lib/i18n/i18n.js';

const UIStrings = {
  /**
   * @description Warning that the host device where Lighthouse is running appears to have a slower
   * CPU than the expected Lighthouse baseline.
   */
  warningSlowHostCpu: 'The tested device appears to have a slower CPU than  ' +
  'Lighthouse expects. This can negatively affect your performance score. Learn more about ' +
  '[calibrating an appropriate CPU slowdown multiplier](https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md#cpu-throttling).',
};

/**
 * We want to warn when the CPU seemed to be at least ~2x weaker than our regular target device.
 * We're starting with a more conservative value that will increase over time to our true target threshold.
 * @see https://github.com/GoogleChrome/lighthouse/blob/ccbc8002fd058770d14e372a8301cc4f7d256414/docs/throttling.md#calibrating-multipliers
 */
const SLOW_CPU_BENCHMARK_INDEX_THRESHOLD = 1000;

const str_ = i18n.createIcuMessageFn(import.meta.url, UIStrings);

/**
 * @param {LH.Gatherer.ProtocolSession} session
 * @return {Promise<LH.Crdp.Browser.GetVersionResponse & {milestone: number}>}
 */
async function getBrowserVersion(session) {
  const status = {msg: 'Getting browser version', id: 'lh:gather:getVersion'};
  log.time(status, 'verbose');
  const version = await session.sendCommand('Browser.getVersion');
  const match = version.product.match(/\/(\d+)/); // eg 'Chrome/71.0.3577.0'
  const milestone = match ? parseInt(match[1]) : 0;
  log.timeEnd(status);
  return Object.assign(version, {milestone});
}

/**
 * Computes the benchmark index to get a rough estimate of device class.
 * @param {LH.Gatherer.Driver['executionContext']} executionContext
 * @return {Promise<number>}
 */
async function getBenchmarkIndex(executionContext) {
  const status = {msg: 'Benchmarking machine', id: 'lh:gather:getBenchmarkIndex'};
  log.time(status);
  const indexVal = await executionContext.evaluate(pageFunctions.computeBenchmarkIndex, {
    args: [],
  });
  log.timeEnd(status);
  return indexVal;
}

/**
 * Returns a warning if the host device appeared to be underpowered according to BenchmarkIndex.
 *
 * @param {{settings: LH.Config.Settings; baseArtifacts: Pick<LH.Artifacts, 'BenchmarkIndex'>}} context
 * @return {LH.IcuMessage | undefined}
 */
function getSlowHostCpuWarning(context) {
  const {settings, baseArtifacts} = context;
  const {throttling, throttlingMethod} = settings;
  const defaultThrottling = constants.defaultSettings.throttling;

  // We only want to warn when the user can take an action to fix it.
  // Eventually, this should expand to cover DevTools.
  if (settings.channel !== 'cli') return;

  // Only warn if they are using the default throttling settings.
  const isThrottledMethod = throttlingMethod === 'simulate' || throttlingMethod === 'devtools';
  const isDefaultMultiplier =
    throttling.cpuSlowdownMultiplier === defaultThrottling.cpuSlowdownMultiplier;
  if (!isThrottledMethod || !isDefaultMultiplier) return;

  // Only warn if the device didn't meet the threshold.
  // See https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md#cpu-throttling
  if (baseArtifacts.BenchmarkIndex > SLOW_CPU_BENCHMARK_INDEX_THRESHOLD) return;

  return str_(UIStrings.warningSlowHostCpu);
}

/**
 * @param {{settings: LH.Config.Settings, baseArtifacts: Pick<LH.Artifacts, 'BenchmarkIndex'>}} context
 * @return {Array<LH.IcuMessage>}
 */
function getEnvironmentWarnings(context) {
  return [
    getSlowHostCpuWarning(context),
  ].filter(s => !!s);
}

export {
  UIStrings,
  getBrowserVersion,
  getBenchmarkIndex,
  getSlowHostCpuWarning,
  getEnvironmentWarnings,
};
