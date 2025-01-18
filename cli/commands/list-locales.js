/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {locales} from '../../shared/localization/locales.js';

function listLocales() {
  const localesList = Object.keys(locales);
  process.stdout.write(JSON.stringify({locales: localesList}, null, 2));
  process.exit(0);
}

export {listLocales};
