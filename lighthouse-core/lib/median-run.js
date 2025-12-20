/**
 * @license Copyright 2020 Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/** @param {LH.Result} lhr @param {string} auditName */
const getNumericValue = (lhr, auditName) =>
  (lhr.audits[auditName] && lhr.audits[auditName].numericValue) || NaN;

/**
 * @param {Array<number>} numbers
 * @return {number}
 */
function getMedianValue(numbers) {
  const sorted = numbers.slice().sort((a, b) => a - b);
  if (sorted.length % 2 === 1) return sorted[(sorted.length - 1) / 2];
  const lowerValue = sorted[sorted.length / 2 - 1];
  const upperValue = sorted[sorted.length / 2];
  return (lowerValue + upperValue) / 2;
}

/**
 * @param {LH.Result} lhr
 * @param {number} medianFcp
 * @param {number} medianInteractive
 */
function getMedianSortValue(lhr, medianFcp, medianInteractive) {
  const distanceFcp =
    medianFcp - getNumericValue(lhr, 'first-contentful-paint');
  const distanceInteractive =
    medianInteractive - getNumericValue(lhr, 'interactive');

  return distanceFcp * distanceFcp + distanceInteractive * distanceInteractive;
}

/**
 * We want the run that's closest to the median of the FCP and the median of the TTI.
 * We're using the Euclidean distance for that (https://en.wikipedia.org/wiki/Euclidean_distance).
 * We use FCP and TTI because they represent the earliest and latest moments in the page lifecycle.
 * We avoid the median of single measures like the performance score because they can still exhibit
 * outlier behavior at the beginning or end of load.
 *
 * @param {Array<LH.Result>} runs
 * @return {LH.Result}
 */
function computeMedianRun(runs) {
  const missingFcp = runs.some(run =>
    Number.isNaN(getNumericValue(run, 'first-contentful-paint'))
  );
  const missingTti = runs.some(run =>
    Number.isNaN(getNumericValue(run, 'interactive'))
  );

  if (!runs.length) throw new Error('No runs provided');
  if (missingFcp) throw new Error(`Some runs were missing an FCP value`);
  if (missingTti) throw new Error(`Some runs were missing a TTI value`);

  const medianFcp = getMedianValue(
    runs.map(run => getNumericValue(run, 'first-contentful-paint'))
  );

  const medianInteractive = getMedianValue(
    runs.map(run => getNumericValue(run, 'interactive'))
  );

  // Sort by proximity to the medians, breaking ties with the minimum TTI.
  const sortedByProximityToMedian = runs
    .slice()
    .sort(
      (a, b) =>
        getMedianSortValue(a, medianFcp, medianInteractive) -
          getMedianSortValue(b, medianFcp, medianInteractive) ||
        getNumericValue(a, 'interactive') - getNumericValue(b, 'interactive')
    );

  return sortedByProximityToMedian[0];
}

/**
 * @param {Array<LH.Result>} runs
 * @return {Array<LH.Result>}
 */
function filterToValidRuns(runs) {
  return runs
    .filter(run =>
      Number.isFinite(getNumericValue(run, 'first-contentful-paint'))
    )
    .filter(run => Number.isFinite(getNumericValue(run, 'interactive')));
}

module.exports = {computeMedianRun, filterToValidRuns};
