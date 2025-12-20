/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const walkObject = require('./helpers/walk-object.js');
const schemaStructure = require('./assets/schema-tree.json');
const TYPE_KEYWORD = '@type';
const SCHEMA_ORG_URL_REGEX = /https?:\/\/schema\.org\//;

/**
 * @param {string} uri
 * @returns {string}
 */
function cleanName(uri) {
  return uri.replace(SCHEMA_ORG_URL_REGEX, '');
}

/**
 * @param {string} type
 * @returns {Array<string>}
 */
function getPropsForType(type) {
  const cleanType = cleanName(type);
  const props = schemaStructure.properties
    .filter(prop => prop.parent.includes(cleanType))
    .map(prop => prop.name);
  const foundType = findType(type);
  if (!foundType) throw new Error(`Unable to get props for missing type "${type}"`);
  const parentTypes = foundType.parent;

  return parentTypes.reduce((allProps, type) => allProps.concat(getPropsForType(type)), props);
}

/**
 * @param {string} type
 * @returns {{name: string, parent: Array<string>}|undefined}
 */
function findType(type) {
  const cleanType = cleanName(type);

  return schemaStructure.types.find(typeObj => typeObj.name === cleanType);
}

/**
 * Validates keys of given object based on its type(s). Returns an array of error messages.
 *
 * @param {string|Array<string>} typeOrTypes
 * @param {Array<string>} keys
 * @returns {Array<Pick<LH.StructuredData.ValidationError, "message" | "validTypes"> & {key?: string}>}
 */
function validateObjectKeys(typeOrTypes, keys) {
  /** @type {Array<string>} */
  let types = [];

  if (typeof typeOrTypes === 'string') {
    types = [typeOrTypes];
  } else if (Array.isArray(typeOrTypes)) {
    types = typeOrTypes;
    const invalidIndex = typeOrTypes.findIndex(s => typeof s !== 'string');
    if (invalidIndex >= 0) {
      return [{message: `Unknown value type at index ${invalidIndex}`}];
    }
  } else {
    return [{message: 'Unknown value type'}];
  }

  const unknownTypes = types.filter(t => !findType(t));

  if (unknownTypes.length) {
    return unknownTypes
      .filter(type => SCHEMA_ORG_URL_REGEX.test(type))
      .map(type => ({
        message: `Unrecognized schema.org type: ${type}`,
        key: '@type',
      }));
  }

  /** @type {Set<string>} */
  const allKnownProps = new Set();

  types.forEach(type => {
    const knownProps = getPropsForType(type);

    knownProps.forEach(key => allKnownProps.add(key));
  });

  const cleanKeys = keys
    // Skip JSON-LD keywords (including invalid ones as they were already flagged in the json-ld validator)
    .filter(key => key.indexOf('@') !== 0)
    .map(key => cleanName(key));

  return cleanKeys
    // remove Schema.org input/output constraints http://schema.org/docs/actions.html#part-4
    .map(key => key.replace(/-(input|output)$/, ''))
    .filter(key => !allKnownProps.has(key))
    .map(key => ({
      message: `Unexpected property "${key}"`,
      key,
      validTypes: types,
    }));
}

/**
 * @param {LH.StructuredData.ExpandedSchemaRepresentation|null} expandedObj Valid JSON-LD object in expanded form
 * @return {Array<Pick<LH.StructuredData.ValidationError, "message" | "validTypes" | "path">>}
 */
module.exports = function validateSchemaOrg(expandedObj) {
  /** @type {Array<Pick<LH.StructuredData.ValidationError, "message" | "validTypes" | "path">>} */
  const errors = [];

  if (expandedObj === null) {
    return errors;
  }

  // If the array only has a single item, treat it as if it was at the root to simplify the error path.
  // Arrays longer than a single item are handled in `walkObject` below.
  if (Array.isArray(expandedObj) && expandedObj.length === 1) {
    expandedObj = expandedObj[0];
  }

  walkObject(expandedObj, (name, value, path, obj) => {
    if (name === TYPE_KEYWORD) {
      const keyErrors = validateObjectKeys(value, Object.keys(obj));

      keyErrors.forEach(error => {
        errors.push({
          validTypes: error.validTypes,
          message: error.message,
          // get rid of the last chunk (/@type) as it's the same for all errors
          path:
            '/' +
            path
              .slice(0, -1)
              .concat(error.key || [])
              .map(cleanName)
              .join('/'),
        });
      });
    }
  });

  return errors;
};
