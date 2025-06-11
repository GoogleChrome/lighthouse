/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as SettingsController from '../../extension/scripts/settings-controller.js';
import defaultConfig from '../../../core/config/default-config.js';
import * as format from '../../../shared/localization/format.js';

describe('Lighthouse chrome extension SettingsController', () => {
  it('default categories should be correct', () => {
    const categories = Object.entries(defaultConfig.categories)
      .map(([id, category]) => {
        return {
          id,
          title: format.getFormatted(category.title, 'en-US'),
        };
      });
    expect(SettingsController.DEFAULT_CATEGORIES).toEqual(categories);
  });
});
