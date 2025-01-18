/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
'use strict';

/**
 * @fileoverview
 * @suppress {reportUnknownTypes}
 */

/**
 * Generate a filenamePrefix of name_YYYY-MM-DD_HH-MM-SS
 * Date/time uses the local timezone, however Node has unreliable ICU
 * support, so we must construct a YYYY-MM-DD date format manually. :/
 * @param {string} name
 * @param {string|undefined} fetchTime
 */
function getFilenamePrefix(name, fetchTime) {
  const date = fetchTime ? new Date(fetchTime) : new Date();

  const timeStr = date.toLocaleTimeString('en-US', {hour12: false});
  const dateParts = date.toLocaleDateString('en-US', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).split('/');
  // @ts-expect-error - parts exists
  dateParts.unshift(dateParts.pop());
  const dateStr = dateParts.join('-');

  const filenamePrefix = `${name}_${dateStr}_${timeStr}`;
  // replace characters that are unfriendly to filenames
  return filenamePrefix.replace(/[/?<>\\:*|"]/g, '-');
}

/**
 * Generate a filenamePrefix of hostname_YYYY-MM-DD_HH-MM-SS.
 * @param {{finalDisplayedUrl: string, fetchTime: string}} lhr
 * @return {string}
 */
function getLhrFilenamePrefix(lhr) {
  const hostname = new URL(lhr.finalDisplayedUrl).hostname;
  return getFilenamePrefix(hostname, lhr.fetchTime);
}

/**
 * Generate a filenamePrefix of name_YYYY-MM-DD_HH-MM-SS.
 * @param {{name: string, steps: Array<{lhr: {fetchTime: string}}>}} flowResult
 * @return {string}
 */
function getFlowResultFilenamePrefix(flowResult) {
  const lhr = flowResult.steps[0].lhr;
  const name = flowResult.name.replace(/\s/g, '-');
  return getFilenamePrefix(name, lhr.fetchTime);
}

export {
  getLhrFilenamePrefix,
  getFilenamePrefix,
  getFlowResultFilenamePrefix,
};
