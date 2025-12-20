/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Runner = require('./runner.js');
const log = require('lighthouse-logger');
const ChromeProtocol = require('./gather/connections/cri.js');
const Config = require('./config/config.js');

/** @typedef {import('./gather/connections/connection.js')} Connection */

/*
 * The relationship between these root modules:
 *
 *   index.js  - the require('lighthouse') hook for Node modules (including the CLI)
 *
 *   runner.js - marshalls the actions that must be taken (Gather / Audit)
 *               config file is used to determine which of these actions are needed
 *
 *         lighthouse-cli \
 *                         -- core/index.js ----> runner.js ----> [Gather / Audit]
 *                clients /
 */

/**
 * Run Lighthouse.
 * @param {string=} url The URL to test. Optional if running in auditMode.
 * @param {LH.Flags=} flags Optional settings for the Lighthouse run. If present,
 *   they will override any settings in the config.
 * @param {LH.Config.Json=} configJSON Configuration for the Lighthouse run. If
 *   not present, the default config is used.
 * @param {Connection=} connection
 * @return {Promise<LH.RunnerResult|undefined>}
 */
async function lighthouse(url, flags = {}, configJSON, connection) {
  // set logging preferences, assume quiet
  flags.logLevel = flags.logLevel || 'error';
  log.setLevel(flags.logLevel);

  const config = generateConfig(configJSON, flags);

  connection = connection || new ChromeProtocol(flags.port, flags.hostname);

  // kick off a lighthouse run
  return Runner.run(connection, {url, config});
}

/**
 * Generate a Lighthouse Config.
 * @param {LH.Config.Json=} configJson Configuration for the Lighthouse run. If
 *   not present, the default config is used.
 * @param {LH.Flags=} flags Optional settings for the Lighthouse run. If present,
 *   they will override any settings in the config.
 * @return {Config}
 */
function generateConfig(configJson, flags) {
  return new Config(configJson, flags);
}

lighthouse.generateConfig = generateConfig;
lighthouse.getAuditList = Runner.getAuditList;
lighthouse.traceCategories = require('./gather/driver.js').traceCategories;
lighthouse.Audit = require('./audits/audit.js');
lighthouse.Gatherer = require('./gather/gatherers/gatherer.js');
lighthouse.NetworkRecords = require('./computed/network-records.js');

module.exports = lighthouse;
