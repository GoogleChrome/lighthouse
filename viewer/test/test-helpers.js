/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';

import * as jsdom from 'jsdom';

import {LH_ROOT} from '../../shared/root.js';

const PAGE = fs.readFileSync(path.join(LH_ROOT, 'viewer/app/index.html'), 'utf8');

function setupJsDomGlobals() {
  const {window} = new jsdom.JSDOM(PAGE);
  global.document = window.document;
  global.window = window;
  global.logger = console;
  global.logger.hide = () => {/* noop */};
}

function cleanupJsDomGlobals() {
  global.document = undefined;
  global.window = undefined;
  global.logger = undefined;
}

export {
  setupJsDomGlobals,
  cleanupJsDomGlobals,
};
