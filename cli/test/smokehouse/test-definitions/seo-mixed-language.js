/**
 * @license Copyright 2023 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

const BASE_URL = 'http://localhost:10200/seo/';

/** @type {LH.Config} */
const config = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['seo'],
  },
};

/**
 * @type {Smokehouse.ExpectedRunnerResult}
 * Expected Lighthouse audit values for a site that fails seo tests.
 */
const expectations = {
  lhr: {
    requestedUrl: BASE_URL + 'seo-mixed-language.html',
    finalDisplayedUrl: BASE_URL + 'seo-mixed-language.html',
    audits: {
      'link-text': {
        score: 0,
        displayValue: '14 links found',
        details: {
          'items': [
            {'text': 'Start', 'textLang': 'en-US'},
            {'text': 'here', 'textLang': 'en'},
            {'text': 'here', 'textLang': 'en'},
            {'text': 'here', 'textLang': 'en'},
            {'text': 'click here', 'textLang': 'en'},
            {'text': 'click here', 'textLang': 'en'},
            {'text': 'here', 'textLang': 'en'},
            {'text': 'here', 'textLang': 'en'},
            {'text': 'click here', 'textLang': 'en'},
            {'text': 'click here', 'textLang': 'en'},
            {'text': 'here', 'textLang': 'en'},
            {'text': 'here', 'textLang': 'en'},
            {'text': 'hier', 'textLang': 'de'},
            {'text': 'start', 'textLang': 'en'},
          ],
        },
      },
    },
  },
};

export default {
  id: 'seo-mixed-language',
  expectations,
  config,
};
