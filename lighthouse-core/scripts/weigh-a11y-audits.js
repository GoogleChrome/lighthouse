/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const path = require('path');
const glob = require('glob');
const Config = require('../config/config.js');

const config = new Config(require('../config/default-config.js'));
if (!config.categories || !config.audits) throw new Error('wut');

const axePath = path.dirname(require.resolve('axe-core'));

/** @type {Record<string, {any: string[], all: string[], none: string[]}>} */
const axeRules = {};
const axeRulesPath = `${axePath}/lib/rules`;
for (const file of glob.sync(`${axeRulesPath}/**/*.json`)) {
  const json = require(file);
  axeRules[json.id] = json;
}

/** @type {Record<string, {metadata: {impact: string}}>} */
const axeChecks = {};
const axeChecksPath = `${axePath}/lib/checks`;
for (const file of glob.sync(`${axeChecksPath}/**/*.json`)) {
  const json = require(file);
  axeChecks[json.id] = json;
}

/**
 * @template T
 * @param {T[]} values
 */
function uniq(values) {
  return [...new Set(values)];
}

/**
 * @param {number[]} values
 */
function sum(values) {
  return values.reduce((acc, cur) => acc + cur, 0);
}

const axeImpacts = ['minor', 'moderate', 'serious', 'critical'];

/**
 * @param {string[]} checks
 */
function parseImpactsFromChecks(checks) {
  const impactStrings = uniq(checks.map(check => axeChecks[check].metadata.impact));
  return impactStrings.map(impactString => {
    const value = axeImpacts.indexOf(impactString);
    if (value === -1) throw new Error(`unknown impact ${impactString}`);

    return {
      impactString,
      value,
    };
  }).sort((a, b) => b.value - a.value);
}

// Determine weights.
// See https://github.com/dequelabs/axe-core/blob/develop/build/configure.js#L257-L269

const results = [];
for (const {id} of Object.values(config.categories.accessibility.auditRefs)) {
  const audit = config.audits.find(a => a.implementation.meta.id === id);
  if (!audit || audit.implementation.meta.scoreDisplayMode === 'manual') continue;
  if (!axeRules[id]) throw new Error(`no rule found for ${id}`);

  const rule = axeRules[id];
  const impacts = {
    any: parseImpactsFromChecks(rule.any),
    all: parseImpactsFromChecks(rule.all),
    none: parseImpactsFromChecks(rule.none),
  };

  if (impacts.any.length) impacts.any = [impacts.any[0]];
  const impactValues =
    uniq([...impacts.any, ...impacts.all, ...impacts.none].map(impact => impact.value));
  const weight = sum(impactValues);
  results.push({id, weight, impactValues});
}
results.sort((a, b) => b.weight - a.weight);

for (const {id, weight, impactValues} of results) {
  console.log(id, weight, ...impactValues.map(i => axeImpacts[i]));
}
