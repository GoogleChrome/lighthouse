/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import Trace from './gather/gatherers/trace.js';
import {Runner} from './runner.js';
import {UserFlow, auditGatherSteps} from './user-flow.js';
import {ReportGenerator} from '../report/generator/report-generator.js';
import {startTimespanGather} from './gather/timespan-runner.js';
import {snapshotGather} from './gather/snapshot-runner.js';
import {navigationGather} from './gather/navigation-runner.js';
import * as LH from '../types/lh.js';

/*
 * The relationship between these root modules:
 *
 *   index.js  - the require('lighthouse') hook for Node modules (including the CLI)
 *
 *   runner.js - marshalls the actions that must be taken (Gather / Audit)
 *               config file is used to determine which of these actions are needed
 *
 *         cli \
 *                         -- core/index.js ----> runner.js ----> [Gather / Audit]
 *                clients /
 */

/**
 * Run Lighthouse.
 * @param {string=} url The URL to test. Optional if running in auditMode.
 * @param {LH.Flags=} flags Optional settings for the Lighthouse run. If present,
 *   they will override any settings in the config.
 * @param {LH.Config=} config Configuration for the Lighthouse run. If
 *   not present, the default config is used.
 * @param {LH.Puppeteer.Page=} page
 * @return {Promise<LH.RunnerResult|undefined>}
 */
async function lighthouse(url, flags = {}, config, page) {
  return navigation(page, url, {config, flags});
}

/**
 * @param {LH.Puppeteer.Page} page
 * @param {LH.UserFlow.Options} [options]
 */
async function startFlow(page, options) {
  return new UserFlow(page, options);
}

/**
 * @param {LH.Puppeteer.Page|undefined} page
 * @param {LH.NavigationRequestor|undefined} requestor
 * @param {{config?: LH.Config, flags?: LH.Flags}} [options]
 * @return {Promise<LH.RunnerResult|undefined>}
 */
async function navigation(page, requestor, options) {
  const gatherResult = await navigationGather(page, requestor, options);
  return Runner.audit(gatherResult.artifacts, gatherResult.runnerOptions);
}

/**
 * @param {LH.Puppeteer.Page} page
 * @param {{config?: LH.Config, flags?: LH.Flags}} [options]
 * @return {Promise<LH.RunnerResult|undefined>}
 */
async function snapshot(page, options) {
  const gatherResult = await snapshotGather(page, options);
  return Runner.audit(gatherResult.artifacts, gatherResult.runnerOptions);
}

/**
 * @param {LH.Puppeteer.Page} page
 * @param {{config?: LH.Config, flags?: LH.Flags}} [options]
 * @return {Promise<{endTimespan: () => Promise<LH.RunnerResult|undefined>}>}
 */
async function startTimespan(page, options) {
  const {endTimespanGather} = await startTimespanGather(page, options);
  const endTimespan = async () => {
    const gatherResult = await endTimespanGather();
    return Runner.audit(gatherResult.artifacts, gatherResult.runnerOptions);
  };
  return {endTimespan};
}

/**
 * @template {LH.Result|LH.FlowResult} R
 * @param {R} result
 * @param {[R] extends [LH.Result] ? LH.OutputMode : Exclude<LH.OutputMode, 'csv'>} [format]
 * @return {string}
 */
function generateReport(result, format = 'html') {
  const reportOutput = ReportGenerator.generateReport(result, format);
  if (Array.isArray(reportOutput)) {
    // In theory the output should never be an array.
    // This is mostly for type checking.
    return reportOutput[0];
  } else {
    return reportOutput;
  }
}

/**
 * @param {LH.UserFlow.FlowArtifacts} flowArtifacts
 * @param {LH.Config} [config]
 */
async function auditFlowArtifacts(flowArtifacts, config) {
  const {gatherSteps, name} = flowArtifacts;
  return await auditGatherSteps(gatherSteps, {name, config});
}

function getAuditList() {
  return Runner.getAuditList();
}

const traceCategories = Trace.getDefaultTraceCategories();

export default lighthouse;
export {Audit} from './audits/audit.js';
export {default as Gatherer} from './gather/base-gatherer.js';
export {NetworkRecords} from './computed/network-records.js';
export {default as defaultConfig} from './config/default-config.js';
export {default as desktopConfig} from './config/desktop-config.js';
export * from '../types/lh.js';
export {
  startFlow,
  navigation,
  startTimespan,
  snapshot,
  generateReport,
  auditFlowArtifacts,
  getAuditList,
  traceCategories,
};
