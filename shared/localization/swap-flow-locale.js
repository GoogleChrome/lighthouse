/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {swapLocale} from './swap-locale.js';

/**
 * @param {LH.FlowResult} flowResult
 * @param {LH.Locale} locale
 */
function swapFlowLocale(flowResult, locale) {
  const localizedFlowResult = JSON.parse(JSON.stringify(flowResult));
  localizedFlowResult.steps = flowResult.steps.map(step => {
    return {...step, lhr: swapLocale(step.lhr, locale).lhr};
  });
  return localizedFlowResult;
}

export {
  swapFlowLocale,
};
