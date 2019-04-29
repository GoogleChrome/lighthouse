/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';
const URL = require('../lib/url-shim');

class Budget {
  /**
   * Asserts that obj has no own properties, throwing a nice error message if it does.
   * Plugin and object name are included for nicer logging.
   * @param {Record<string, unknown>} obj
   * @param {string} objectName
   */
  static assertNoExcessProperties(obj, objectName) {
    const invalidKeys = Object.keys(obj);
    if (invalidKeys.length > 0) {
      const keys = invalidKeys.join(', ');
      throw new Error(`${objectName} has unrecognized properties: [${keys}]`);
    }
  }

  /**
   * @return {Array<string>}
   */
  static validResourceTypes() {
    return [
      'total',
      'document',
      'script',
      'stylesheet',
      'image',
      'media',
      'font',
      'other',
      'third-party',
    ];
  }

  /**
   * @param {LH.Budget.ResourceBudget} resourceBudget
   * @return {LH.Budget.ResourceBudget}
   */
  static validateResourceBudget(resourceBudget) {
    const {resourceType, budget, ...invalidRest} = resourceBudget;
    Budget.assertNoExcessProperties(invalidRest, 'Resource Budget');

    if (!this.validResourceTypes().includes(resourceBudget.resourceType)) {
      throw new Error(`Invalid resource type: ${resourceBudget.resourceType}. \n` +
        `Valid resource types are: ${this.validResourceTypes().join(', ') }`);
    }
    if (isNaN(resourceBudget.budget)) {
      throw new Error('Invalid budget: ${resourceBudget.budget}');
    }
    return {
      resourceType,
      budget,
    };
  }

  /**
   * @param {string} path
   * @return {string}
   */
  static validatePath(path) {
    if (!path) {
      throw new Error(`A valid path must be provided`);
    }

    const hasLeadingSlash = path[0] === '/';
    const validWildcardQuantity = ((path.match(/\*/g) || []).length <= 1);
    const validDollarSignQuantity = ((path.match(/\*/g) || []).length <= 1);
    const validDollarSignPlacement = (path.indexOf('$') === -1) || (path[path.length - 1] === '$');

    const isValid = hasLeadingSlash && validWildcardQuantity
      && validDollarSignQuantity && validDollarSignPlacement;

    if (!isValid) {
      throw new Error(`Invalid path ${path}. ` +
        `'Path' should be specified using the 'robots.txt' format.\n` +
        `Learn more about the 'robots.txt' format here:\n` +
        `https://developers.google.com/search/reference/robots_txt#url-matching-based-on-path-values`);
    }
    return path;
  }

  /**
   * @param {string} url
   * @param {string} pattern
   * @return {boolean}
   */
  static urlMatchesPattern(url, pattern) {
    /**
     * Pattern should use the robots.txt format. E.g. "/*-article.html" or "/". Reference:
     * https://developers.google.com/search/reference/robots_txt#url-matching-based-on-path-values
     */

    const urlObj = new URL(url);
    const urlPath = urlObj.pathname + urlObj.search;

    const hasWildcard = pattern.includes('*');
    const hasEndingPattern = pattern.includes('$');

    // No *, No $: URL should start with given pattern
    if (!hasWildcard && !hasEndingPattern) {
      return urlPath.startsWith(pattern);
    // No *, Yes $: URL should end with given pattern
    } else if (!hasWildcard && hasEndingPattern) {
      return urlPath.endsWith(pattern.slice(0, -1));
    // Yes *, No $: URL should start with the string pattern that comes before the wildcard
    // & later in the string contain the string pattern that comes after the wildcard.
    } else if (hasWildcard && !hasEndingPattern) {
      const [beforeWildcard, afterWildcard] = pattern.split('*');
      const remainingUrl = urlPath.slice(beforeWildcard.length);
      return urlPath.startsWith(beforeWildcard) && remainingUrl.includes(afterWildcard);
    // Yes *, Yes $: URL should start with the string pattern that comes before the wildcard
    // & end with the string pattern that comes after the wildcard.
    } else if (hasWildcard && hasEndingPattern) {
      const [beforeWildcard, afterWildcard] = pattern.split('*');
      return urlPath.startsWith(beforeWildcard) && urlPath.endsWith(afterWildcard.slice(0, -1));
    }
    return false;
  }

  /**
   * @param {LH.Budget.TimingBudget} timingBudget
   * @return {LH.Budget.TimingBudget}
   */
  static validateTimingBudget(timingBudget) {
    const {metric, budget, tolerance, ...invalidRest} = timingBudget;
    Budget.assertNoExcessProperties(invalidRest, 'Timing Budget');

    const validTimingMetrics = [
      'first-contentful-paint',
      'first-cpu-idle',
      'interactive',
      'first-meaningful-paint',
      'estimated-input-latency',
    ];
    if (!validTimingMetrics.includes(timingBudget.metric)) {
      throw new Error(`Invalid timing metric: ${timingBudget.metric}. \n` +
        `Valid timing metrics are: ${validTimingMetrics.join(', ')}`);
    }
    if (isNaN(timingBudget.budget)) {
      throw new Error('Invalid budget: ${timingBudget.budget}');
    }
    if (timingBudget.tolerance !== undefined && isNaN(timingBudget.tolerance)) {
      throw new Error('Invalid tolerance: ${timingBudget.tolerance}');
    }
    return {
      metric,
      budget,
      tolerance,
    };
  }

  /**
   * More info on the Budget format:
   * https://github.com/GoogleChrome/lighthouse/issues/6053#issuecomment-428385930
   * @param {Array<LH.Budget>} budgetArr
   * @return {Array<LH.Budget>}
   */
  static initializeBudget(budgetArr) {
    /** @type {Array<LH.Budget>} */
    const budgets = [];

    budgetArr.forEach((b) => {
      /** @type {LH.Budget} */
      const budget = {};

      const {path, resourceSizes, resourceCounts, timings, ...invalidRest} = b;
      Budget.assertNoExcessProperties(invalidRest, 'Budget');

      budget.path = Budget.validatePath(path);

      if (resourceSizes !== undefined) {
        budget.resourceSizes = resourceSizes.map((r) => {
          return Budget.validateResourceBudget(r);
        });
      }

      if (resourceCounts !== undefined) {
        budget.resourceCounts = resourceCounts.map((r) => {
          return Budget.validateResourceBudget(r);
        });
      }

      if (timings !== undefined) {
        budget.timings = timings.map((t) => {
          return Budget.validateTimingBudget(t);
        });
      }

      budgets.push(budget);
    });
    return budgets;
  }
}

module.exports = Budget;
