#!/usr/bin/env node
/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-disable no-console */

const path = require('path');
const execFileSync = require('child_process').execFileSync;
const constants = require('./constants.js');

const INPUT_URL = process.argv[2];
if (!INPUT_URL) throw new Error('Usage $0: <url>');

const SITE_INDEX_PATH = path.resolve(process.cwd(), constants.SITE_INDEX_WITH_GOLDEN_PATH);
const SITE_INDEX_DIR = path.dirname(SITE_INDEX_PATH);
const RUN_ONCE_PATH = path.join(__dirname, 'run-once.js');

const siteIndex = require(SITE_INDEX_PATH);
// @ts-ignore - over-aggressive implicit any on site
const site = siteIndex.sites.find(site => site.url === INPUT_URL);
if (!site) throw new Error(`Could not find with site URL ${INPUT_URL}`);

const trace = path.join(SITE_INDEX_DIR, site.unthrottled.tracePath);
const log = path.join(SITE_INDEX_DIR, site.unthrottled.devtoolsLogPath);
process.env.LANTERN_DEBUG = 'true';
execFileSync('node', ['--inspect-brk', RUN_ONCE_PATH, trace, log], {stdio: 'inherit'});
