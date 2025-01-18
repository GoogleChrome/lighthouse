#!/usr/bin/env node
/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable no-console */

/** @typedef {{tracePath: string, devtoolsLogPath: string, lhrPath: string}} GoldenUnthrottled */
/** @typedef {Record<string, number|undefined>} GoldenWpt3g */
/**
 * @typedef Wpt3gUnthrottled
 * @property {number|undefined} firstContentfulPaint
 * @property {number|undefined} timeToConsistentlyInteractive
 * @property {number|undefined} speedIndex
 * @property {number|undefined} largestContentfulPaint
 */
/** @typedef {{url:string, unthrottled: GoldenUnthrottled, wpt3g: Wpt3gUnthrottled}} GoldenSite */
/** @typedef {{sites: GoldenSite[]}} Golden */

import fs from 'fs';
import path from 'path';
import {execFileSync} from 'child_process';

import constants from './constants.js';
import {LH_ROOT} from '../../../shared/root.js';
import {readJson} from '../../test/test-utils.js';

const INPUT_PATH = process.argv[2] || constants.SITE_INDEX_WITH_GOLDEN_PATH;
const SITE_INDEX_PATH = path.resolve(process.cwd(), INPUT_PATH);
const SITE_INDEX_DIR = path.dirname(SITE_INDEX_PATH);
const RUN_ONCE_PATH = path.join(LH_ROOT, 'core/scripts/lantern/run-once.js');

if (!fs.existsSync(SITE_INDEX_PATH)) throw new Error('Usage $0 <expectations file>');

/** @type {Golden} */
const expectations = readJson(SITE_INDEX_PATH);

for (const site of expectations.sites) {
  const trace = path.join(SITE_INDEX_DIR, site.unthrottled.tracePath);
  const log = path.join(SITE_INDEX_DIR, site.unthrottled.devtoolsLogPath);

  console.log('Running', site.url, '...');
  try {
    const rawOutput = execFileSync(RUN_ONCE_PATH, [trace, log])
      .toString()
      .trim();
    if (!rawOutput) console.log('ERROR EMPTY OUTPUT!');
    const lantern = JSON.parse(rawOutput);
    Object.assign(site, {lantern});
  } catch (e) {
    console.error(e);
  }
}

// eslint-disable-next-line max-len
fs.writeFileSync(constants.SITE_INDEX_WITH_GOLDEN_WITH_COMPUTED_PATH, JSON.stringify(expectations, null, 2));
