/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const parseJSON = require('./json-linter.js');
const validateJsonLD = require('./jsonld-keyword-validator.js');
const expandAsync = require('./json-expander.js');
const validateSchemaOrg = require('./schema-validator.js');
const getLineNumberFromJsonLDPath = require('./line-number-from-jsonld-path.js');

/**
 * Validates JSON-LD input. Returns array of error objects.
 *
 * @param {string} textInput
 * @returns {Promise<Array<LH.StructuredData.ValidationError>>}
 */
module.exports = async function validate(textInput) {
  // STEP 1: VALIDATE JSON
  const parseError = parseJSON(textInput);

  if (parseError) {
    return [{
      validator: /** @type {LH.StructuredData.ValidatorType} */ ('json'),
      lineNumber: parseError.lineNumber,
      message: parseError.message,
    }];
  }

  const inputObject = JSON.parse(textInput);

  // STEP 2: VALIDATE JSONLD
  const jsonLdErrors = validateJsonLD(inputObject);

  if (jsonLdErrors.length) {
    return jsonLdErrors.map(error => {
      return {
        validator: /** @type {LH.StructuredData.ValidatorType} */ ('json-ld'),
        path: error.path,
        message: error.message,
        lineNumber: getLineNumberFromJsonLDPath(inputObject, error.path),
      };
    });
  }

  // STEP 3: EXPAND
  /** @type {LH.StructuredData.ExpandedSchemaRepresentation|null} */
  let expandedObj = null;
  try {
    expandedObj = await expandAsync(inputObject);
  } catch (error) {
    return [{
      validator: /** @type {LH.StructuredData.ValidatorType} */ ('json-ld-expand'),
      message: error.message,
    }];
  }

  // STEP 4: VALIDATE SCHEMA
  const schemaOrgErrors = validateSchemaOrg(expandedObj);

  if (schemaOrgErrors.length) {
    return schemaOrgErrors.map(error => {
      return {
        validator: /** @type {LH.StructuredData.ValidatorType} */ ('schema-org'),
        path: error.path,
        message: error.message,
        lineNumber: error.path ? getLineNumberFromJsonLDPath(inputObject, error.path) : null,
        validTypes: error.validTypes,
      };
    });
  }

  return [];
};

