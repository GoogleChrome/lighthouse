/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const log = require('lighthouse-logger');
const stream = require('stream');
const {promisify} = require('util');
const Simulator = require('./dependency-graph/simulator/simulator.js');
const lanternTraceSaver = require('./lantern-trace-saver.js');
const Metrics = require('./traces/pwmetrics-events.js');
const NetworkAnalysisComputed = require('../computed/network-analysis.js');
const LoadSimulatorComputed = require('../computed/load-simulator.js');
const LHError = require('../lib/lh-error.js');
// TODO(esmodules): Rollup does not support `promisfy` or `stream.pipeline`. Bundled files
// don't need anything in this file except for `stringifyReplacer`, so a check for
// truthiness before using is enough.
const pipeline = promisify && promisify(stream.pipeline);

const artifactsFilename = 'artifacts.json';
const traceSuffix = '.trace.json';
const devtoolsLogSuffix = '.devtoolslog.json';

/**
 * @typedef {object} PreparedAssets
 * @property {string} passName
 * @property {LH.Trace} traceData
 * @property {LH.DevtoolsLog} devtoolsLog
 */


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

  // load artifacts.json using a reviver to deserialize any LHErrors in artifacts.
  const artifactsStr = fs.readFileSync(path.join(basePath, artifactsFilename), 'utf8');
  /** @type {LH.Artifacts} */
  const artifacts = JSON.parse(artifactsStr, LHError.parseReviver);

  const filenames = fs.readdirSync(basePath);

  // load devtoolsLogs
  artifacts.devtoolsLogs = {};
  filenames.filter(f => f.endsWith(devtoolsLogSuffix)).forEach(filename => {
    const passName = filename.replace(devtoolsLogSuffix, '');
    const devtoolsLog = JSON.parse(fs.readFileSync(path.join(basePath, filename), 'utf8'));
    artifacts.devtoolsLogs[passName] = devtoolsLog;
  });

  // load traces
  artifacts.traces = {};
  filenames.filter(f => f.endsWith(traceSuffix)).forEach(filename => {
    const file = fs.readFileSync(path.join(basePath, filename), {encoding: 'utf-8'});
    const trace = JSON.parse(file);
    const passName = filename.replace(traceSuffix, '');
    artifacts.traces[passName] = Array.isArray(trace) ? {traceEvents: trace} : trace;
  });

  if (Array.isArray(artifacts.Timing)) {
    // Any Timing entries in saved artifacts will have a different timeOrigin than the auditing phase
    // The `gather` prop is read later in generate-timing-trace and they're added to a separate track of trace events
    artifacts.Timing.forEach(entry => (entry.gather = true));
  }
  return artifacts;
}

/**
 * A replacer function for JSON.stingify of the artifacts. Used to serialize objects that
 * JSON won't normally handle.
 * @param {string} key
 * @param {any} value
 */
function stringifyReplacer(key, value) {
  // Currently only handle LHError and other Error types.
  if (value instanceof Error) {
    return LHError.stringifyReplacer(value);
  }

  return value;
}

/**
 * Save artifacts object mostly to single file located at basePath/artifacts.json.
 * Also save the traces & devtoolsLogs to their own files
 * @param {LH.Artifacts} artifacts
 * @param {string} basePath
 * @return {Promise<void>}
 */
async function saveArtifacts(artifacts, basePath) {
  const status = {msg: 'Saving artifacts', id: 'lh:assetSaver:saveArtifacts'};
  log.time(status);
  fs.mkdirSync(basePath, {recursive: true});

  // Delete any previous artifacts in this directory.
  const filenames = fs.readdirSync(basePath);
  for (const filename of filenames) {
    if (filename.endsWith(traceSuffix) || filename.endsWith(devtoolsLogSuffix) ||
        filename === artifactsFilename) {
      fs.unlinkSync(`${basePath}/${filename}`);
    }
  }

  const {traces, devtoolsLogs, ...restArtifacts} = artifacts;

  // save traces
  for (const [passName, trace] of Object.entries(traces)) {
    await saveTrace(trace, `${basePath}/${passName}${traceSuffix}`);
  }

  // save devtools log
  for (const [passName, devtoolsLog] of Object.entries(devtoolsLogs)) {
    await saveDevtoolsLog(devtoolsLog, `${basePath}/${passName}${devtoolsLogSuffix}`);
  }

  // save everything else, using a replacer to serialize LHErrors in the artifacts.
  const restArtifactsString = JSON.stringify(restArtifacts, stringifyReplacer, 2) + '\n';
  fs.writeFileSync(`${basePath}/${artifactsFilename}`, restArtifactsString, 'utf8');
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
 * Filter traces and extract screenshots to prepare for saving.
 * @param {LH.Artifacts} artifacts
 * @param {LH.Audit.Results} [audits]
 * @return {Promise<Array<PreparedAssets>>}
 */
async function prepareAssets(artifacts, audits) {
  const passNames = Object.keys(artifacts.traces);
  /** @type {Array<PreparedAssets>} */
  const assets = [];

  for (const passName of passNames) {
    const trace = artifacts.traces[passName];
    const devtoolsLog = artifacts.devtoolsLogs[passName];

    const traceData = Object.assign({}, trace);
    if (audits) {
      const evts = new Metrics(traceData.traceEvents, audits).generateFakeEvents();
      traceData.traceEvents = traceData.traceEvents.concat(evts);
    }

    assets.push({
      passName,
      traceData,
      devtoolsLog,
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
 * @return {Promise<void>}
 */
async function saveTrace(traceData, traceFilename) {
  const traceIter = traceJsonGenerator(traceData);
  const writeStream = fs.createWriteStream(traceFilename);

  // TODO: Can remove Readable.from() in Node 13, promisify(pipeline) in Node 15.
  // https://nodejs.org/api/stream.html#stream_stream_pipeline_streams_callback
  return pipeline(stream.Readable.from(traceIter), writeStream);
}

/**
 * Save a devtoolsLog as JSON by streaming to disk at devtoolLogFilename.
 * @param {LH.DevtoolsLog} devtoolsLog
 * @param {string} devtoolLogFilename
 * @return {Promise<void>}
 */
function saveDevtoolsLog(devtoolsLog, devtoolLogFilename) {
  const logIter = arrayOfObjectsJsonGenerator(devtoolsLog);
  const writeStream = fs.createWriteStream(devtoolLogFilename);

  return pipeline(stream.Readable.from(logIter), writeStream);
}

/**
 * @param {string} pathWithBasename
 * @return {Promise<void>}
 */
async function saveLanternDebugTraces(pathWithBasename) {
  if (!process.env.LANTERN_DEBUG) return;

  for (const [label, nodeTimings] of Simulator.ALL_NODE_TIMINGS) {
    if (lanternTraceSaver.simulationNamesToIgnore.includes(label)) continue;

    const traceFilename = `${pathWithBasename}-${label}${traceSuffix}`;
    await saveTrace(lanternTraceSaver.convertNodeTimingsToTrace(nodeTimings), traceFilename);
    log.log('saveAssets', `${label} lantern trace file streamed to disk: ${traceFilename}`);
  }
}

/**
 * Writes trace(s) and associated asset(s) to disk.
 * @param {LH.Artifacts} artifacts
 * @param {LH.Audit.Results} audits
 * @param {string} pathWithBasename
 * @return {Promise<void>}
 */
async function saveAssets(artifacts, audits, pathWithBasename) {
  const allAssets = await prepareAssets(artifacts, audits);
  const saveAll = allAssets.map(async (passAssets, index) => {
    const devtoolsLogFilename = `${pathWithBasename}-${index}${devtoolsLogSuffix}`;
    fs.writeFileSync(devtoolsLogFilename, JSON.stringify(passAssets.devtoolsLog, null, 2));
    log.log('saveAssets', 'devtools log saved to disk: ' + devtoolsLogFilename);

    const streamTraceFilename = `${pathWithBasename}-${index}${traceSuffix}`;
    log.log('saveAssets', 'streaming trace file to disk: ' + streamTraceFilename);
    await saveTrace(passAssets.traceData, streamTraceFilename);
    log.log('saveAssets', 'trace file streamed to disk: ' + streamTraceFilename);
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
  const networkAnalysis = await NetworkAnalysisComputed.request(devtoolsLog, context);
  const lanternData = LoadSimulatorComputed.convertAnalysisToSaveableLanternData(networkAnalysis);

  fs.writeFileSync(outputPath, JSON.stringify(lanternData));
}

module.exports = {
  saveArtifacts,
  saveLhr,
  loadArtifacts,
  saveAssets,
  prepareAssets,
  saveTrace,
  saveDevtoolsLog,
  saveLanternNetworkData,
  stringifyReplacer,
};
