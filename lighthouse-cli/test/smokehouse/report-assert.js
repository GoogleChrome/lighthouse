/**
 * @license Copyright 2019 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview An assertion library for comparing smoke-test expectations
 * against the results actually collected from Lighthouse.
 */

const log = require('lighthouse-logger');
const LocalConsole = require('./lib/local-console.js');

const NUMBER_REGEXP = /(?:\d|\.)+/.source;
const OPS_REGEXP = /<=?|>=?|\+\/-|±/.source;
// An optional number, optional whitespace, an operator, optional whitespace, a number.
const NUMERICAL_EXPECTATION_REGEXP =
  new RegExp(`^(${NUMBER_REGEXP})?\\s*(${OPS_REGEXP})\\s*(${NUMBER_REGEXP})$`);

/**
 * @typedef Difference
 * @property {string} path
 * @property {any} actual
 * @property {any} expected
 */

/**
 * @typedef Comparison
 * @property {string} name
 * @property {any} actual
 * @property {any} expected
 * @property {boolean} equal
 * @property {Difference|null} [diff]
 */

/**
 * Checks if the actual value matches the expectation. Does not recursively search. This supports
 *    - Greater than/less than operators, e.g. "<100", ">90"
 *    - Regular expressions
 *    - Strict equality
 *    - plus or minus a margin of error, e.g. '10+/-5', '100±10'
 *
 * @param {*} actual
 * @param {*} expected
 * @return {boolean}
 */
function matchesExpectation(actual, expected) {
  if (typeof actual === 'number' && NUMERICAL_EXPECTATION_REGEXP.test(expected)) {
    const parts = expected.match(NUMERICAL_EXPECTATION_REGEXP);
    const [, prefixNumber, operator, postfixNumber] = parts;
    switch (operator) {
      case '>':
        return actual > postfixNumber;
      case '>=':
        return actual >= postfixNumber;
      case '<':
        return actual < postfixNumber;
      case '<=':
        return actual <= postfixNumber;
      case '+/-':
      case '±':
        return Math.abs(actual - prefixNumber) <= postfixNumber;
      default:
        throw new Error(`unexpected operator ${operator}`);
    }
  } else if (typeof actual === 'string' && expected instanceof RegExp && expected.test(actual)) {
    return true;
  } else {
    // Strict equality check, plus NaN equivalence.
    return Object.is(actual, expected);
  }
}

/**
 * Walk down expected result, comparing to actual result. If a difference is found,
 * the path to the difference is returned, along with the expected primitive value
 * and the value actually found at that location. If no difference is found, returns
 * null.
 *
 * Only checks own enumerable properties, not object prototypes, and will loop
 * until the stack is exhausted, so works best with simple objects (e.g. parsed JSON).
 * @param {string} path
 * @param {*} actual
 * @param {*} expected
 * @return {(Difference|null)}
 */
function findDifference(path, actual, expected) {
  if (matchesExpectation(actual, expected)) {
    return null;
  }

  // If they aren't both an object we can't recurse further, so this is the difference.
  if (actual === null || expected === null || typeof actual !== 'object' ||
      typeof expected !== 'object' || expected instanceof RegExp) {
    return {
      path,
      actual,
      expected,
    };
  }

  // We only care that all expected's own properties are on actual (and not the other way around).
  // Note an expected `undefined` can match an actual that is either `undefined` or not defined.
  for (const key of Object.keys(expected)) {
    // Bracket numbers, but property names requiring quotes will still be unquoted.
    const keyAccessor = /^\d+$/.test(key) ? `[${key}]` : `.${key}`;
    const keyPath = path + keyAccessor;
    const expectedValue = expected[key];

    const actualValue = actual[key];
    const subDifference = findDifference(keyPath, actualValue, expectedValue);

    // Break on first difference found.
    if (subDifference) {
      return subDifference;
    }
  }

  // If the expected value is an array, assert the length as well.
  // This still allows for asserting that the first n elements of an array are specified elements,
  // but requires using an object literal (ex: {0: x, 1: y, 2: z} matches [x, y, z, q, w, e] and
  // {0: x, 1: y, 2: z, length: 5} does not match [x, y, z].
  if (Array.isArray(expected) && actual.length !== expected.length) {
    return {
      path: `${path}.length`,
      actual,
      expected,
    };
  }

  return null;
}

/**
 * @param {string} name – name of the value being asserted on (e.g. the result of a certain audit)
 * @param {any} actualResult
 * @param {any} expectedResult
 * @return {Comparison}
 */
function makeComparison(name, actualResult, expectedResult) {
  const diff = findDifference(name, actualResult, expectedResult);

  return {
    name,
    actual: actualResult,
    expected: expectedResult,
    equal: !diff,
    diff,
  };
}

/**
 * Collate results into comparisons of actual and expected scores on each audit/artifact.
 * @param {LocalConsole} localConsole
 * @param {Smokehouse.ExpectedRunnerResult} actual
 * @param {Smokehouse.ExpectedRunnerResult} expected
 * @return {Comparison[]}
 */
function collateResults(localConsole, actual, expected) {
  // If actual run had a runtimeError, expected *must* have a runtimeError.
  // Relies on the fact that an `undefined` argument to makeComparison() can only match `undefined`.
  const runtimeErrorAssertion = makeComparison('runtimeError', actual.lhr.runtimeError,
      expected.lhr.runtimeError);

  // Same for warnings.
  const runWarningsAssertion = makeComparison('runWarnings', actual.lhr.runWarnings,
      expected.lhr.runWarnings || []);

  /** @type {Comparison[]} */
  let artifactAssertions = [];
  if (expected.artifacts) {
    const expectedArtifacts = expected.artifacts;
    const artifactNames = /** @type {(keyof LH.Artifacts)[]} */ (Object.keys(expectedArtifacts));
    artifactAssertions = artifactNames.map(artifactName => {
      const actualResult = (actual.artifacts || {})[artifactName];
      if (!actualResult) {
        localConsole.log(log.redify('Error: ') +
          `Config run did not generate artifact ${artifactName}`);
      }

      const expectedResult = expectedArtifacts[artifactName];
      return makeComparison(artifactName + ' artifact', actualResult, expectedResult);
    });
  }

  /** @type {Comparison[]} */
  let auditAssertions = [];
  auditAssertions = Object.keys(expected.lhr.audits).map(auditName => {
    const actualResult = actual.lhr.audits[auditName];
    if (!actualResult) {
      localConsole.log(log.redify('Error: ') +
        `Config did not trigger run of expected audit ${auditName}`);
    }

    const expectedResult = expected.lhr.audits[auditName];
    return makeComparison(auditName + ' audit', actualResult, expectedResult);
  });

  return [
    {
      name: 'final url',
      actual: actual.lhr.finalUrl,
      expected: expected.lhr.finalUrl,
      equal: actual.lhr.finalUrl === expected.lhr.finalUrl,
    },
    runtimeErrorAssertion,
    runWarningsAssertion,
    ...artifactAssertions,
    ...auditAssertions,
  ];
}

/**
 * @param {unknown} obj
 */
function isPlainObject(obj) {
  return Object.prototype.toString.call(obj) === '[object Object]';
}

/**
 * Log the result of an assertion of actual and expected results to the provided
 * console.
 * @param {LocalConsole} localConsole
 * @param {Comparison} assertion
 */
function reportAssertion(localConsole, assertion) {
  // @ts-ignore - this doesn't exist now but could one day, so try not to break the future
  const _toJSON = RegExp.prototype.toJSON;
  // @ts-ignore
  // eslint-disable-next-line no-extend-native
  RegExp.prototype.toJSON = RegExp.prototype.toString;

  if (assertion.equal) {
    if (isPlainObject(assertion.actual)) {
      localConsole.log(`  ${log.greenify(log.tick)} ${assertion.name}`);
    } else {
      localConsole.log(`  ${log.greenify(log.tick)} ${assertion.name}: ` +
          log.greenify(assertion.actual));
    }
  } else {
    if (assertion.diff) {
      const diff = assertion.diff;
      const fullActual = String(JSON.stringify(assertion.actual, null, 2))
          .replace(/\n/g, '\n      ');
      const msg = `
  ${log.redify(log.cross)} difference at ${log.bold}${diff.path}${log.reset}
              expected: ${JSON.stringify(diff.expected)}
                 found: ${JSON.stringify(diff.actual)}

          found result:
      ${log.redify(fullActual)}
`;
      localConsole.log(msg);
    } else {
      localConsole.log(`  ${log.redify(log.cross)} ${assertion.name}:
              expected: ${JSON.stringify(assertion.expected)}
                 found: ${JSON.stringify(assertion.actual)}
`);
    }
  }

  // @ts-ignore
  // eslint-disable-next-line no-extend-native
  RegExp.prototype.toJSON = _toJSON;
}

/**
 * @param {number} count
 * @return {string}
 */
function assertLogString(count) {
  const plural = count === 1 ? '' : 's';
  return `${count} assertion${plural}`;
}

/**
 * Log all the comparisons between actual and expected test results, then print
 * summary. Returns count of passed and failed tests.
 * @param {{lhr: LH.Result, artifacts: LH.Artifacts}} actual
 * @param {Smokehouse.ExpectedRunnerResult} expected
 * @param {{isDebug?: boolean}=} reportOptions
 * @return {{passed: number, failed: number, log: string}}
 */
function report(actual, expected, reportOptions = {}) {
  const localConsole = new LocalConsole();

  const comparisons = collateResults(localConsole, actual, expected);

  let correctCount = 0;
  let failedCount = 0;

  comparisons.forEach(assertion => {
    if (assertion.equal) {
      correctCount++;
    } else {
      failedCount++;
    }

    if (!assertion.equal || reportOptions.isDebug) {
      reportAssertion(localConsole, assertion);
    }
  });

  const correctStr = assertLogString(correctCount);
  const colorFn = correctCount === 0 ? log.redify : log.greenify;
  localConsole.log(`  Correctly passed ${colorFn(correctStr)}`);

  if (failedCount) {
    const failedString = assertLogString(failedCount);
    const failedColorFn = failedCount === 0 ? log.greenify : log.redify;
    localConsole.log(`  Failed ${failedColorFn(failedString)}`);
  }
  localConsole.write('\n');

  return {
    passed: correctCount,
    failed: failedCount,
    log: localConsole.getLog(),
  };
}

module.exports = report;
