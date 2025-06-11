#!/usr/bin/env node
/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable no-console */

import path from 'path';
import {execFileSync} from 'child_process';

import constants from './constants.js';
import {LH_ROOT} from '../../../shared/root.js';
import {readJson} from '../../test/test-utils.js';

const INPUT_URL = process.argv[2];
if (!INPUT_URL) throw new Error('Usage $0: <url>');

const SITE_INDEX_PATH = path.resolve(process.cwd(), constants.SITE_INDEX_WITH_GOLDEN_PATH);
const SITE_INDEX_DIR = path.dirname(SITE_INDEX_PATH);
const RUN_ONCE_PATH = path.join(LH_ROOT, 'core/scripts/lantern/run-once.js');

const siteIndex = readJson(SITE_INDEX_PATH);
// @ts-expect-error - over-aggressive implicit any on site
const site = siteIndex.sites.find(site => site.url === INPUT_URL);
if (!site) throw new Error(`Could not find with site URL ${INPUT_URL}`);

const trace = path.join(SITE_INDEX_DIR, site.unthrottled.tracePath);
const log = path.join(SITE_INDEX_DIR, site.unthrottled.devtoolsLogPath);
process.env.LANTERN_DEBUG = 'true';
execFileSync('node', ['--inspect-brk', RUN_ONCE_PATH, trace, log], {stdio: 'inherit'});
