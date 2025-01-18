/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {createRequire} from 'module';

import {GhPagesApp} from './gh-pages-app.js';
import {LH_ROOT} from '../shared/root.js';
import {getIcuMessageIdParts} from '../shared/localization/format.js';
import {locales} from '../shared/localization/locales.js';
import {UIStrings} from '../treemap/app/src/util.js';

const require = createRequire(import.meta.url);

/**
 * Extract only the strings needed for treemap into
 * a script that sets a global variable `strings`, whose keys
 * are locale codes (en-US, es, etc.) and values are localized UIStrings.
 */
function buildStrings() {
  const strings = /** @type {Record<LH.Locale, string>} */ ({});

  for (const [locale, lhlMessages] of Object.entries(locales)) {
    const localizedStrings = Object.fromEntries(
      Object.entries(lhlMessages).map(([icuMessageId, v]) => {
        const {filename, key} = getIcuMessageIdParts(icuMessageId);
        if (!filename.endsWith('util.js') || !(key in UIStrings)) {
          return [];
        }

        return [key, v.message];
      })
    );
    strings[/** @type {LH.Locale} */ (locale)] = localizedStrings;
  }

  return 'const strings =' + JSON.stringify(strings, null, 2) + ';';
}

/**
 * Build treemap app, optionally deploying to gh-pages if `--deploy` flag was set.
 */
async function main() {
  const app = new GhPagesApp({
    name: 'treemap',
    appDir: `${LH_ROOT}/treemap/app`,
    html: {path: 'index.html'},
    stylesheets: [
      {path: require.resolve('tabulator-tables/dist/css/tabulator.min.css')},
      {path: 'styles/*'},
    ],
    javascripts: [
      buildStrings(),
      {path: require.resolve('idb-keyval/dist/idb-keyval-min.js')},
      {path: require.resolve('event-target-shim/umd')},
      {path: require.resolve('webtreemap-cdt')},
      {path: require.resolve('tabulator-tables/dist/js/tabulator_core.js')},
      {path: require.resolve('tabulator-tables/dist/js/modules/sort.js')},
      {path: require.resolve('tabulator-tables/dist/js/modules/format.js')},
      {path: require.resolve('tabulator-tables/dist/js/modules/resize_columns.js')},
      {path: require.resolve('pako/dist/pako_inflate.js')},
      {path: 'src/main.js', esbuild: true},
    ],
    assets: [
      {path: 'images/**/*', destDir: 'images'},
      {path: 'debug.json'},
    ],
  });

  await app.build();

  const argv = process.argv.slice(2);
  if (argv.includes('--deploy')) {
    await app.deploy();
  }
}

await main();
