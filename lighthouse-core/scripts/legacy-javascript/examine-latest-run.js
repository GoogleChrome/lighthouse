/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-disable no-console */

/**
 * @fileoverview - Used to manually examine the polyfills/transforms used on a page.
 *
 * USAGE:
 *   1. Run `yarn start <url to examine> -G
 *   2. Run `node ./lighthouse-core/scripts/legacy-javascript/examine-latest-run.js`
 *   3. Inspect output for fishy looking polyfills.
 */

const path = require('path');
// @ts-ignore - We don't really need types for this
const colors = require('colors');
const LegacyJavascript = require('../../audits/legacy-javascript.js');

const LH_ROOT_DIR = path.join(__dirname, '../../../');
const LATEST_RUN_DIR = path.join(LH_ROOT_DIR, 'latest-run');

/** @param {LH.DevtoolsLog} log */
function requestUrlToId(log) {
  return log.reduce(
    (map, entry) => {
      if (entry.method === 'Network.requestWillBeSent') {
        map[entry.params.request.url] = entry.params.requestId;
      }
      return map;
    },
    /** @type {Record<string, string>} */ ({})
  );
}

async function main() {
  /** @type {LH.Artifacts} */
  const artifacts = require(`${LATEST_RUN_DIR}/artifacts.json`);
  const devtoolsLog = require(`${LATEST_RUN_DIR}/defaultPass.devtoolslog.json`);
  const scripts = artifacts.ScriptElements;
  const requestUrlMap = requestUrlToId(devtoolsLog);
  artifacts.devtoolsLogs = {defaultPass: devtoolsLog};

  const auditResults = await LegacyJavascript.audit(artifacts, {
    computedCache: new Map(),
    options: {},
    settings: /** @type {any} */ ({}),
  });

  const items =
    auditResults.details &&
    auditResults.details.type === 'table' &&
    auditResults.details.items;

  if (!items) {
    console.log('No signals found!');
    return;
  }

  console.log(colors.bold(`${items.length} signals found!`));
  for (const item of items) {
    if (typeof item.url !== 'string') continue;
    const requestId = requestUrlMap[item.url];
    const script = scripts.find(s => s.requestId === requestId);
    const signals = Array.isArray(item.signals) ? item.signals : [];
    const locations = Array.isArray(item.locations) ? item.locations : [];

    console.log('---------------------------------');
    console.log(`URL: ${item.url}`);
    console.log(`Signals: ${signals.length}`);
    if (!script || !script.content) {
      console.log('\nFailed to find script content! :/');
      console.log('---------------------------------\n\n');
      continue;
    }

    const lines = script.content.split('\n');
    for (let i = 0; i < signals.length; i++) {
      const signal = signals[i];
      const location = locations[i];
      if (typeof location !== 'object' || location.type !== 'source-location') {
        continue;
      }

      const line = lines[location.line || 0] || '';
      const locationString = `at ${location.line}:${location.column}`;
      console.log('');
      console.log(`${signal} ${colors.dim(locationString)}`);
      const contentToShow = line.slice(location.column - 10, location.column + 80);
      const unimportant = contentToShow.split(signal.toString());
      console.log(unimportant.map(s => colors.dim(s)).join(signal.toString()));
    }

    console.log('---------------------------------\n\n');
  }
}

main();
