/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import stream from 'stream';
import url from 'url';
import {createGzip, gunzipSync} from 'zlib';

import log from 'lighthouse-logger';

import * as Lantern from './lantern/lantern.js';
import lanternTraceSaver from './lantern-trace-saver.js';
import {MetricTraceEvents} from './traces/metric-trace-events.js';
import {NetworkAnalysis} from '../computed/network-analysis.js';
import {LoadSimulator} from '../computed/load-simulator.js';
import {LighthouseError} from '../lib/lh-error.js';
import {LH_ROOT} from '../../shared/root.js';

const optionsFilename = 'options.json';
const artifactsFilename = 'artifacts.json';
const traceSuffix = '.trace.json';
const devtoolsLogSuffix = '.devtoolslog.json';
const defaultPrefix = 'defaultPass';
const errorPrefix = 'pageLoadError-defaultPass';
const stepDirectoryRegex = /^step(\d+)$/;

/**
 * @typedef {object} PreparedAssets
 * @property {LH.Trace} [traceData]
 * @property {LH.DevtoolsLog} [devtoolsLog]
 */

/**
 * @param {import('stream').PipelineSource<any>} contents
 * @param {string} path
 * @param {boolean} gzip
 */
async function writeJson(contents, path, gzip) {
  const writeStream = fs.createWriteStream(gzip ? path + '.gz' : path);
  if (gzip) {
    await stream.promises.pipeline(contents, createGzip(), writeStream);
  } else {
    await stream.promises.pipeline(contents, writeStream);
  }
}

/**
 * Prefers reading a gzipped file (.gz) if present.
 * @param {string} filename
 * @param {(this: any, key: string, value: any) => any=} reviver
 */
function readJson(filename, reviver) {
  if (fs.existsSync(filename + '.gz')) {
    filename = filename + '.gz';
  }

  if (!filename.endsWith('.json.gz')) {
    return JSON.parse(fs.readFileSync(filename, 'utf8'), reviver);
  }

  const buffer = gunzipSync(fs.readFileSync(filename));
  return JSON.parse(buffer.toString('utf8'), reviver);
}

/**
 * @param {string} filename
 * @param {string} suffix
 * @returns
 */
function endsWithSuffix(filename, suffix) {
  return filename.endsWith(suffix) || filename.endsWith(suffix + '.gz');
}

/**
 * Load artifacts object from files located within basePath
 * Also save the traces to their own files
 * @param {string} basePath
 * @return {LH.Artifacts}
 */
function loadArtifacts(basePath) {
  log.log('Reading artifacts from disk:', basePath);

  if (!fs.existsSync(basePath)) {
    throw new Error('No saved artifacts found at ' + basePath);
  }

  // load artifacts.json using a reviver to deserialize any LighthouseErrors in artifacts.
  /** @type {LH.Artifacts} */
  const artifacts = readJson(path.join(basePath, artifactsFilename), LighthouseError.parseReviver);

  const filenames = fs.readdirSync(basePath);

  filenames.filter(f => endsWithSuffix(f, devtoolsLogSuffix)).forEach(filename => {
    if (!artifacts.devtoolsLogs) artifacts.devtoolsLogs = {};
    const prefix = filename.replace(devtoolsLogSuffix + '.gz', '').replace(devtoolsLogSuffix, '');
    const devtoolsLog = readJson(path.join(basePath, filename));
    artifacts.devtoolsLogs[prefix] = devtoolsLog;
    if (prefix === defaultPrefix) {
      artifacts.DevtoolsLog = devtoolsLog;
    }
    if (prefix === errorPrefix) {
      artifacts.DevtoolsLogError = devtoolsLog;
    }
  });

  filenames.filter(f => endsWithSuffix(f, traceSuffix)).forEach(filename => {
    if (!artifacts.traces) artifacts.traces = {};
    const trace = readJson(path.join(basePath, filename));
    const prefix = filename.replace(traceSuffix + '.gz', '').replace(traceSuffix, '');
    artifacts.traces[prefix] = Array.isArray(trace) ? {traceEvents: trace} : trace;
    if (prefix === defaultPrefix) {
      artifacts.Trace = artifacts.traces[prefix];
    }
    if (prefix === errorPrefix) {
      artifacts.TraceError = artifacts.traces[prefix];
    }
  });

  if (Array.isArray(artifacts.Timing)) {
    // Any Timing entries in saved artifacts will have a different timeOrigin than the auditing phase
    // The `gather` prop is read later in generate-timing-trace and they're added to a separate track of trace events
    artifacts.Timing.forEach(entry => (entry.gather = true));
  }
  return artifacts;
}

/**
 * @param {string} basePath
 * @return {LH.UserFlow.FlowArtifacts}
 */
function loadFlowArtifacts(basePath) {
  log.log('Reading flow artifacts from disk:', basePath);

  if (!fs.existsSync(basePath)) {
    throw new Error('No saved flow artifacts found at ' + basePath);
  }

  /** @type {LH.UserFlow.FlowArtifacts} */
  const flowArtifacts = JSON.parse(
    fs.readFileSync(path.join(basePath, optionsFilename), 'utf-8')
  );

  const filenames = fs.readdirSync(basePath);

  flowArtifacts.gatherSteps = [];
  for (const filename of filenames) {
    const regexResult = stepDirectoryRegex.exec(filename);
    if (!regexResult) continue;

    const index = Number(regexResult[1]);
    if (!Number.isFinite(index)) continue;

    const stepPath = path.join(basePath, filename);
    if (!fs.lstatSync(stepPath).isDirectory()) continue;

    /** @type {LH.UserFlow.GatherStep} */
    const gatherStep = JSON.parse(
      fs.readFileSync(path.join(stepPath, optionsFilename), 'utf-8')
    );
    gatherStep.artifacts = loadArtifacts(stepPath);

    flowArtifacts.gatherSteps[index] = gatherStep;
  }

  const missingStepIndex = flowArtifacts.gatherSteps.findIndex(gatherStep => !gatherStep);
  if (missingStepIndex !== -1) {
    throw new Error(`Could not find step with index ${missingStepIndex} at ${basePath}`);
  }

  return flowArtifacts;
}

/**
 * A replacer function for JSON.stingify of the artifacts. Used to serialize objects that
 * JSON won't normally handle.
 * @param {string} key
 * @param {any} value
 */
function stringifyReplacer(key, value) {
  // Currently only handle LighthouseError and other Error types.
  if (value instanceof Error) {
    return LighthouseError.stringifyReplacer(value);
  }

  return value;
}

/**
 * Saves flow artifacts with the following file structure:
 *   flow/                             --  Directory specified by `basePath`.
 *     options.json                    --  Flow options (e.g. flow name, flags).
 *     step0/                          --  Directory containing artifacts for the first step.
 *       options.json                  --  First step's options (e.g. step flags).
 *       artifacts.json                --  First step's artifacts except the DevTools log and trace.
 *       defaultPass.devtoolslog.json  --  First step's DevTools log.
 *       defaultPass.trace.json        --  First step's trace.
 *     step1/                          --  Directory containing artifacts for the second step.
 *
 * @param {LH.UserFlow.FlowArtifacts} flowArtifacts
 * @param {string} basePath
 * @return {Promise<void>}
 */
async function saveFlowArtifacts(flowArtifacts, basePath) {
  const status = {msg: 'Saving flow artifacts', id: 'lh:assetSaver:saveArtifacts'};
  log.time(status);
  fs.mkdirSync(basePath, {recursive: true});

  // Delete any previous artifacts in this directory.
  const filenames = fs.readdirSync(basePath);
  for (const filename of filenames) {
    if (stepDirectoryRegex.test(filename) || filename === optionsFilename) {
      fs.rmSync(`${basePath}/${filename}`, {recursive: true});
    }
  }

  const {gatherSteps, ...flowOptions} = flowArtifacts;
  for (let i = 0; i < gatherSteps.length; ++i) {
    const {artifacts, ...stepOptions} = gatherSteps[i];
    const stepPath = path.join(basePath, `step${i}`);
    await saveArtifacts(artifacts, stepPath);
    fs.writeFileSync(
      path.join(stepPath, optionsFilename),
      JSON.stringify(stepOptions, stringifyReplacer, 2) + '\n'
    );
  }

  fs.writeFileSync(
    path.join(basePath, optionsFilename),
    JSON.stringify(flowOptions, stringifyReplacer, 2) + '\n'
  );

  log.log('Flow artifacts saved to disk in folder:', basePath);
  log.timeEnd(status);
}

/**
 * Save artifacts object mostly to single file located at basePath/artifacts.json.
 * Also save the traces & devtoolsLogs to their own files, with optional compression.
 * @param {LH.Artifacts} artifacts
 * @param {string} basePath
 * @param {{gzip?: boolean}} options
 * @return {Promise<void>}
 */
async function saveArtifacts(artifacts, basePath, options = {}) {
  const status = {msg: 'Saving artifacts', id: 'lh:assetSaver:saveArtifacts'};
  log.time(status);
  fs.mkdirSync(basePath, {recursive: true});

  // Delete any previous artifacts in this directory.
  const filenames = fs.readdirSync(basePath);
  for (const filename of filenames) {
    const isPreviousFile =
      filename.endsWith(traceSuffix) || filename.endsWith(devtoolsLogSuffix) ||
      filename.endsWith(traceSuffix + '.gz') || filename.endsWith(devtoolsLogSuffix + '.gz') ||
      filename === artifactsFilename || filename === artifactsFilename + '.gz';
    if (isPreviousFile) {
      fs.unlinkSync(`${basePath}/${filename}`);
    }
  }

  // `devtoolsLogs` and `traces` are duplicate compat artifacts.
  // We don't need to save them twice, so extract them here.
  const {
    // eslint-disable-next-line no-unused-vars
    traces,
    // eslint-disable-next-line no-unused-vars
    devtoolsLogs,
    DevtoolsLog,
    Trace,
    DevtoolsLogError,
    TraceError,
    ...restArtifacts
  } = artifacts;

  if (Trace) {
    await saveTrace(Trace, `${basePath}/${defaultPrefix}${traceSuffix}`, options);
  }

  if (TraceError) {
    await saveTrace(TraceError, `${basePath}/${errorPrefix}${traceSuffix}`, options);
  }

  if (DevtoolsLog) {
    await saveDevtoolsLog(
      DevtoolsLog, `${basePath}/${defaultPrefix}${devtoolsLogSuffix}`, options);
  }

  if (DevtoolsLogError) {
    await saveDevtoolsLog(
      DevtoolsLogError, `${basePath}/${errorPrefix}${devtoolsLogSuffix}`, options);
  }

  // save everything else, using a replacer to serialize LighthouseErrors in the artifacts.
  const restArtifactsString = JSON.stringify(restArtifacts, stringifyReplacer, 2);
  await writeJson(function* () {
    yield restArtifactsString;
    yield '\n';
  }, `${basePath}/${artifactsFilename}`, !!options.gzip);

  log.log('Artifacts saved to disk in folder:', basePath);
  log.timeEnd(status);
}

/**
 * Save LHR to file located at basePath/lhr.report.json.
 * @param {LH.Result} lhr
 * @param {string} basePath
 */
function saveLhr(lhr, basePath) {
  fs.writeFileSync(`${basePath}/lhr.report.json`, JSON.stringify(lhr, null, 2));
}

/**
 * Filter trace and extract screenshots to prepare for saving.
 * @param {LH.Trace} trace
 * @param {LH.Result['audits']} [audits]
 * @return {LH.Trace}
 */
function prepareTraceAsset(trace, audits) {
  if (!trace) return trace;

  const traceData = Object.assign({}, trace);
  if (audits) {
    const evts = new MetricTraceEvents(traceData.traceEvents, audits).generateFakeEvents();
    traceData.traceEvents = traceData.traceEvents.concat(evts);
  }
  return traceData;
}

/**
 * @param {LH.Artifacts} artifacts
 * @param {LH.Result['audits']} [audits]
 * @return {Promise<Array<PreparedAssets>>}
 */
async function prepareAssets(artifacts, audits) {
  /** @type {Array<PreparedAssets>} */
  const assets = [];

  const devtoolsLog = artifacts.DevtoolsLog;
  const traceData = prepareTraceAsset(artifacts.Trace, audits);
  if (traceData || devtoolsLog) {
    assets.push({
      traceData,
      devtoolsLog,
    });
  }

  const devtoolsLogError = artifacts.DevtoolsLogError;
  const traceErrorData = prepareTraceAsset(artifacts.TraceError, audits);
  if (devtoolsLogError || traceErrorData) {
    assets.push({
      traceData: traceErrorData,
      devtoolsLog: devtoolsLogError,
    });
  }

  return assets;
}

/**
 * Generates a JSON representation of an array of objects with the objects
 * printed one per line for a more readable (but not too verbose) version.
 * @param {Array<unknown>} arrayOfObjects
 * @return {IterableIterator<string>}
 */
function* arrayOfObjectsJsonGenerator(arrayOfObjects) {
  const ITEMS_PER_ITERATION = 500;

  // Stringify and emit items separately to avoid a giant string in memory.
  yield '[\n';
  if (arrayOfObjects.length > 0) {
    const itemsIterator = arrayOfObjects[Symbol.iterator]();
    // Emit first item manually to avoid a trailing comma.
    const firstItem = itemsIterator.next().value;
    yield `  ${JSON.stringify(firstItem)}`;

    let itemsRemaining = ITEMS_PER_ITERATION;
    let itemsJSON = '';
    for (const item of itemsIterator) {
      itemsJSON += `,\n  ${JSON.stringify(item)}`;
      itemsRemaining--;
      if (itemsRemaining === 0) {
        yield itemsJSON;
        itemsRemaining = ITEMS_PER_ITERATION;
        itemsJSON = '';
      }
    }
    yield itemsJSON;
  }
  yield '\n]';
}

/**
 * Generates a JSON representation of traceData line-by-line for a nicer printed
 * version with one trace event per line.
 * @param {LH.Trace} traceData
 * @return {IterableIterator<string>}
 */
function* traceJsonGenerator(traceData) {
  const {traceEvents, ...rest} = traceData;

  yield '{\n';

  yield '"traceEvents": ';
  yield* arrayOfObjectsJsonGenerator(traceEvents);

  // Emit the rest of the object (usually just `metadata`, if anything).
  for (const [key, value] of Object.entries(rest)) {
    yield `,\n"${key}": ${JSON.stringify(value, null, 2)}`;
  }

  yield '}\n';
}

/**
 * Save a trace as JSON by streaming to disk at traceFilename.
 * @param {LH.Trace} traceData
 * @param {string} traceFilename
 * @param {{gzip?: boolean}=} options
 * @return {Promise<void>}
 */
function saveTrace(traceData, traceFilename, options = {}) {
  const traceIter = traceJsonGenerator(traceData);
  return writeJson(traceIter, traceFilename, !!options.gzip);
}

/**
 * Save a devtoolsLog as JSON by streaming to disk at devtoolLogFilename.
 * @param {LH.DevtoolsLog} devtoolsLog
 * @param {string} devtoolLogFilename
 * @param {{gzip?: boolean}=} options
 * @return {Promise<void>}
 */
function saveDevtoolsLog(devtoolsLog, devtoolLogFilename, options = {}) {
  return writeJson(function* () {
    yield* arrayOfObjectsJsonGenerator(devtoolsLog);
    yield '\n';
  }, devtoolLogFilename, !!options.gzip);
}

/**
 * @param {string} pathWithBasename
 * @return {Promise<void>}
 */
async function saveLanternDebugTraces(pathWithBasename) {
  if (!process.env.LANTERN_DEBUG) return;

  for (const [label, nodeTimings] of Lantern.Simulation.Simulator.allNodeTimings) {
    if (lanternTraceSaver.simulationNamesToIgnore.includes(label)) continue;

    const traceFilename = `${pathWithBasename}-${label}${traceSuffix}`;
    await saveTrace(lanternTraceSaver.convertNodeTimingsToTrace(nodeTimings), traceFilename);
    log.log('saveAssets', `${label} lantern trace file streamed to disk: ${traceFilename}`);
  }
}

/**
 * Writes trace(s) and associated asset(s) to disk.
 * @param {LH.Artifacts} artifacts
 * @param {LH.Result['audits']} audits
 * @param {string} pathWithBasename
 * @return {Promise<void>}
 */
async function saveAssets(artifacts, audits, pathWithBasename) {
  const allAssets = await prepareAssets(artifacts, audits);
  const saveAll = allAssets.map(async (assets, index) => {
    if (assets.devtoolsLog) {
      const devtoolsLogFilename = `${pathWithBasename}-${index}${devtoolsLogSuffix}`;
      await saveDevtoolsLog(assets.devtoolsLog, devtoolsLogFilename);
      log.log('saveAssets', 'devtools log saved to disk: ' + devtoolsLogFilename);
    }

    if (assets.traceData) {
      const traceFilename = `${pathWithBasename}-${index}${traceSuffix}`;
      await saveTrace(assets.traceData, traceFilename);
      log.log('saveAssets', 'trace file streamed to disk: ' + traceFilename);
    }
  });

  await Promise.all(saveAll);
  await saveLanternDebugTraces(pathWithBasename);
}

/**
 * @param {LH.DevtoolsLog} devtoolsLog
 * @param {string} outputPath
 * @return {Promise<void>}
 */
async function saveLanternNetworkData(devtoolsLog, outputPath) {
  /** @type {LH.Audit.Context} */
  // @ts-expect-error - the full audit context isn't needed for analysis.
  const context = {computedCache: new Map()};
  const networkAnalysis = await NetworkAnalysis.request(devtoolsLog, context);
  const lanternData = LoadSimulator.convertAnalysisToSaveableLanternData(networkAnalysis);

  fs.writeFileSync(outputPath, JSON.stringify(lanternData));
}

/**
 * Normalize timing data so it doesn't change every update.
 * @param {LH.Result.MeasureEntry[]} timings
 */
function normalizeTimingEntries(timings) {
  let baseTime = 0;
  for (const timing of timings) {
    // @ts-expect-error: Value actually is writeable at this point.
    timing.startTime = baseTime++;
    // @ts-expect-error: Value actually is writeable at this point.
    timing.duration = 1;
  }
}

/**
 * @param {LH.Result} lhr
 */
function elideAuditErrorStacks(lhr) {
  const baseCallFrameUrl = url.pathToFileURL(LH_ROOT);
  for (const auditResult of Object.values(lhr.audits)) {
    if (auditResult.errorStack) {
      auditResult.errorStack = auditResult.errorStack
        // Make paths relative to the repo root.
        .replaceAll(baseCallFrameUrl.pathname, '')
        // Remove line/col info.
        .replaceAll(/:\d+:\d+/g, '');
    }
  }
}

export {
  saveArtifacts,
  saveFlowArtifacts,
  saveLhr,
  loadArtifacts,
  loadFlowArtifacts,
  saveAssets,
  prepareAssets,
  saveTrace,
  saveDevtoolsLog,
  saveLanternNetworkData,
  stringifyReplacer,
  normalizeTimingEntries,
  elideAuditErrorStacks,
};
