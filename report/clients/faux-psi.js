/**
 * @license Copyright 2021 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* global document window prepareLabData */

(function __initLighthouseReport__() {
  const mobileLHR = window.__LIGHTHOUSE_JSON__;
  const desktopLHR = JSON.parse(JSON.stringify(mobileLHR));
  desktopLHR.categories.performance.score = 0.81;

  const lhrs = {
    'tab1-mobile': mobileLHR,
    'tab2-desktop': desktopLHR,
  };

  for (const [elId, lhr] of Object.entries(lhrs)) {
    const {scoreGaugeEl, perfCategoryEl,
      finalScreenshotDataUri, scoreScaleEl, installFeatures} = prepareLabData(lhr, document);


    const container = document.querySelector(`#${elId}`).querySelector('main');
    container.append(scoreGaugeEl);
    container.append(scoreScaleEl);
    const imgEl = document.createElement('img');
    imgEl.src = finalScreenshotDataUri;
    container.append(imgEl);
    container.append(perfCategoryEl);
    installFeatures(container);
  }
})();
