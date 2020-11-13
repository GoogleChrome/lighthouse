/**
 * @license Copyright 2020 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const browserify = require('browserify');
const fs = require('fs');

const distDir = `${__dirname}/../dist`;
const bundleOutFile = `${distDir}/i18n-module.js`;
const generatorFilename = `./lighthouse-core/lib/i18n/i18n-module.js`;

const localeBasenames = fs.readdirSync(__dirname + '/../lighthouse-core/lib/i18n/locales/');
const actualLocales = localeBasenames
  .filter(basename => basename.endsWith('.json') && !basename.endsWith('.ctc.json'))
  .map(locale => locale.replace('.json', ''));
const locales =
  localeBasenames.map(f => require.resolve(`../lighthouse-core/lib/i18n/locales/${f}`));

browserify(generatorFilename, {standalone: 'Lighthouse.i18n'})
  // @ts-ignore bundle.ignore does accept an array of strings.
  .ignore(locales)
  .bundle((err, src) => {
    if (err) throw err;

    const code = [
      src.toString(),
      // locales.js maps a locale code to a locale module. Instead of displaying
      // every possible locale variant, which would require somehow extracting the mapping
      // in locales.js, we only show the locales that are exactly the name of a module. This
      // makes dynamically fetching locale files simple.
      `Lighthouse.i18n.availableLocales = ${JSON.stringify(actualLocales)}`,
      'document.dispatchEvent(new Event("lighthouseModuleLoaded-i18n"));',
    ].join('\n');
    fs.writeFileSync(bundleOutFile, code);
  });
