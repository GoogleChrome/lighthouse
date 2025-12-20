/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const SettingsController = require('../../extension/scripts/settings-controller.js');
const Config = require('../../../lighthouse-core/config/config.js');
const defaultConfig = require('../../../lighthouse-core/config/default-config.js');
const i18n = require('../../../lighthouse-core/lib/i18n/i18n.js');

describe('Lighthouse chrome extension SettingsController', () => {
  it('default categories should be correct', () => {
    const categories = Config.getCategories(defaultConfig);
    categories.forEach(cat => cat.title = i18n.getFormatted(cat.title, 'en-US'));
    expect(SettingsController.DEFAULT_CATEGORIES).toEqual(categories);
  });
});
