/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const {createI18nId} = require('../../lib/i18n/i18n.js');

const lhRoot = path.join(__dirname, '../../..');

const distLocalesPath = path.join(lhRoot, 'dist', 'dt-locales');

fs.mkdirSync(distLocalesPath, {recursive: true});

// @ts-expect-error
const pubAdsLocales = require('lighthouse-plugin-publisher-ads/plugin.js').locales;

const lhLocalePaths = fs.readdirSync(__dirname + '/../../lib/i18n/locales/')
    .map(f => require.resolve(`../../lib/i18n/locales/${f}`));

lhLocalePaths.forEach(localePath => {
  if (localePath.endsWith('.ctc.json')) return;
  const locale = path.basename(localePath, '.json');
  const coreMessages = require(localePath);
  const pubAdsMessages = pubAdsLocales && pubAdsLocales[locale];
  if (pubAdsMessages) {
    for (const [key, message] of Object.entries(pubAdsMessages)) {
      const [filename, keyname] = key.split(' | ');

      const i18nId = createI18nId(
        path.join(path.dirname(require.resolve('lighthouse-plugin-publisher-ads')), filename),
        keyname);
      coreMessages[i18nId] = message;
    }
  }
  fs.writeFileSync(path.join(distLocalesPath, `${locale}.json`), JSON.stringify(coreMessages));
});
