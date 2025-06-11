/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';

import glob from 'glob';

import {readJson} from '../../test/test-utils.js';

const NEW_VERSION = process.argv[2];
if (!/^\d+\.\d+\.\d+(-dev\.\d{8})?$/.test(NEW_VERSION)) {
  throw new Error('Usage: node bump-versions.json x.x.x');
}

const OLD_VERSION = readJson('package.json').version;

const ignore = [
  '**/node_modules/**',
  'changelog.md',
  'docs/recipes/auth/package.json',
  'docs/recipes/custom-gatherer-puppeteer/package.json',
  'docs/recipes/integration-test/package.json',
];

for (const file of glob.sync('**/{package.json,*.md,*-expected.txt,navigation_test.ts}', {ignore})) { // eslint-disable-line max-len
  let text;
  if (file === 'package.json') {
    const pkg = readJson(file);
    if (pkg.version.startsWith('file')) continue;
    pkg.version = NEW_VERSION;
    text = JSON.stringify(pkg, null, 2) + '\n';
  } else if (file.endsWith('.md')) {
    // Replace `package.json`-like examples in markdown files.
    text = fs.readFileSync(file, 'utf-8');
    text = text.replace(/"lighthouse": ".*?"/g, `"lighthouse": "^${NEW_VERSION}"`);
  } else {
    text = fs.readFileSync(file, 'utf-8');
    text = text.replace(OLD_VERSION, NEW_VERSION);
  }

  fs.writeFileSync(file, text);
}
