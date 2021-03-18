#!/usr/bin/env node
/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Script to launch a clean Chrome instance on-demand.
 *
 * Assuming Lighthouse is installed globally or `npm link`ed, use via:
 *     chrome-debug
 * Optionally enable extensions or pass a port, additional chrome flags, and/or a URL
 *     chrome-debug --port=9222
 *     chrome-debug http://goat.com
 *     chrome-debug --show-paint-rects
 *     chrome-debug --enable-extensions
 */

const {Launcher, launch} = require('chrome-launcher');

const args = process.argv.slice(2);
const chromeFlags = [];
let startingUrl;
let port;
let ignoreDefaultFlags;

if (args.length) {
  const providedFlags = args.filter(flag => flag.startsWith('--'));

  const portFlag = providedFlags.find(flag => flag.startsWith('--port='));
  if (portFlag) port = parseInt(portFlag.replace('--port=', ''), 10);

  const enableExtensions = !!providedFlags.find(flag => flag === '--enable-extensions');
  // The basic pattern for enabling Chrome extensions
  if (enableExtensions) {
    ignoreDefaultFlags = true;
    chromeFlags.push(...Launcher.defaultFlags().filter(flag => flag !== '--disable-extensions'));
  }

  chromeFlags.push(...providedFlags);
  startingUrl = args.find(flag => !flag.startsWith('--'));
}

launch({
  startingUrl,
  port,
  ignoreDefaultFlags,
  chromeFlags,
})
// eslint-disable-next-line no-console
.then(v => console.log(`✨  Chrome debugging port: ${v.port}`));
