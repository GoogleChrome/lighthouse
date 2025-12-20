/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * Call this script to update assets/schema-tree.json with the latest schema.org spec
 */

const fetch = require('isomorphic-fetch');
const path = require('path');
const fs = require('fs');

const SCHEMA_ORG_URL = 'https://schema.org/version/latest/schema.jsonld';
const SCHEMA_TREE_FILE = path.join(__dirname, '../assets/schema-tree.json');

/** @typedef {import('jsonlint-mod').SchemaTreeItem} SchemaDefinition */

/** @typedef {import('jsonlint-mod').JSONSchemaSource} SchemaSource */

/** @typedef {{'@id': string}} IDRef */

/**
 * @param {SchemaSource} data
 */
function processData(data) {
  /** @type {SchemaDefinition[]} */
  const types = [];
  /** @type {SchemaDefinition[]} */
  const properties = [];

  /** @param {string} str */
  function removePrefix(str) {
    return str.replace('http://schema.org/', '');
  }

  /**
   * Accepts some set of id references and returns the array of cleaned references without the `http://schema.org` prefix.
   * @param {Array<IDRef>|IDRef|undefined} parents
   */
  function cleanIdPrefixes(parents) {
    if (Array.isArray(parents)) {
      return parents.map(item => removePrefix(item['@id']));
    } else if (parents && parents['@id']) {
      return [removePrefix(parents['@id'])];
    }

    return [];
  }

  // Go through all the graph entries to find the valid types and properties.
  // i.e. this converts
  // [
  //   {@id: 'http://schema.org/CafeOrCoffeeShop', @type: 'rdfs:Class', rdfs:subClassOf: {@id: 'http://schema.org/FoodEstablishment'}},
  //   {@id: 'http://schema.org/bestRating', @type: 'rdfs:Property', http://schema.org/domainIncludes: {@id: 'http://schema.org/Rating'}},
  // ]
  // into
  // {
  //   types: [{name: 'CafeOrCoffeeShop', parent: ['FoodEstablishment']}],
  //   properties: [{name: 'bestRating', parent: ['Rating']}],
  // }
  data['@graph'].forEach(item => {
    if (item['rdfs:label'] === undefined) {
      return;
    }

    if (item['@type'] === 'rdf:Property') {
      properties.push({
        name: item['rdfs:label'],
        parent: cleanIdPrefixes(item['http://schema.org/domainIncludes']),
      });
    } else {
      types.push({
        name: item['rdfs:label'],
        parent: cleanIdPrefixes(item['rdfs:subClassOf']),
      });
    }
  });

  return {types, properties};
}

async function run() {
  try {
    const response = await fetch(SCHEMA_ORG_URL);
    const data = await response.json();
    const processed = processData(data);
    fs.writeFileSync(SCHEMA_TREE_FILE, JSON.stringify(processed, null, 2));
    console.log('Success.'); // eslint-disable-line no-console
  } catch (e) {
    console.error(e); // eslint-disable-line no-console
  }
}

run();
