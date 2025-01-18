/**
 * @license Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable no-console */

/**
 * @fileoverview - Used to manually examine the polyfills/transforms used on a page.
 *
 * USAGE:
 *   1. Run `yarn start <url to examine> -G`
 *   2. Run `node ./core/scripts/legacy-javascript/examine-latest-run.js`
 *   3. Inspect output for fishy looking polyfills.
 */

import path from 'path';

// @ts-expect-error - We don't really need types for this
import colors from 'colors';

import LegacyJavascript from '../../audits/byte-efficiency/legacy-javascript.js';
import * as format from '../../../shared/localization/format.js';
import {LH_ROOT} from '../../../shared/root.js';
import {readJson} from '../../test/test-utils.js';

const LATEST_RUN_DIR = path.join(LH_ROOT, 'latest-run');

async function main() {
  /** @type {LH.Artifacts} */
  const artifacts = readJson(`${LATEST_RUN_DIR}/artifacts.json`);
  const devtoolsLog = readJson(`${LATEST_RUN_DIR}/defaultPass.devtoolslog.json`);
  const scripts = artifacts.Scripts;
  artifacts.devtoolsLogs = {defaultPass: devtoolsLog};

  const auditResults = await LegacyJavascript.audit(artifacts, {
    computedCache: new Map(),
    options: {},
    /** @type {any} */
    settings: {},
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

    const script = scripts.find(s => s.url === item.url);
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
      if (typeof location !== 'object' || format.isIcuMessage(location) ||
          location.type !== 'source-location') {
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
