/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const i18n = require('../i18n/i18n.js');

const ShexValidator = require('./validator.js').Validator;
const utils = require('./helpers/utils.js');
const parsers = require('./parser.js');
const localization = require('./helpers/localization.js');
const errors = require('./helpers/errors.js');

const namespace = utils.namespace;
const rdf = namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#');
const schema = namespace('http://schema.org/');
const shex = namespace('http://schema.org/shex#');


// hierarchy of services in the tree format, used for identifying validation
// order (e.g. Schema -> Google -> GoogleAds -> ...)
const hierarchy = require('./assets/hierarchy.json');

/** @type {import('@shexjs').Schema} ShEx shapes in the ShExJ format */
// @ts-ignore
const shapes = require('./assets/shexj.json');
const shapeIds = shapes.shapes.map(shape => shape.id);

// Annotations map, used in the current version of ShEx shapes
// [property name in the validation report ->
// URI of the property annotation, used in shapes]
const annotations = {
  url: schema('url'),
  description: schema('description'),
  severity: schema('identifier'),
};
const locale = i18n.lookupLocale().toString();
const localeAnnotations = localization.getAnnotations(locale);
const localeMessages = localization.getMessages(locale);
const shexValidator = new ShexValidator(shapes,
  {annotations: localeAnnotations, messages: localeMessages},
  {annotations: annotations});

/**
 * Recursive validation against all service nodes in the hierarchy
 * @param {LH.SchemaramaStructuredData.Hierarchy} hierarchyNode
 * @param {import('n3').Store} shapeStore
 * @param {*} id
 */
async function recursiveValidate(hierarchyNode, shapeStore, id) {
  const typeQuads = shapeStore.getQuads(id, rdf('type'), undefined);
  if (typeQuads.length === 0) {
    throw new errors.InvalidDataError(
      'Markup doesn\'t have a type. Validation can\'t be performed');
  }
  const type = utils.removeUrls(typeQuads[0].object.value);
  const startShape = shex(`Valid${hierarchyNode.service}${utils.removeUrls(type)}`);

  /** @type {Array<LH.SchemaramaStructuredData.Failure>} */
  let failures = [];
  // validate only if the corresponding shex shape exists
  if (shapeIds.includes(startShape)) {
    failures = (await shexValidator.validate(shapeStore, startShape, {baseUrl: id})).failures;
  }

  failures.forEach(failure => {
    failure.service = hierarchyNode.service;
    failure.node = utils.removeUrls(type);
  });
  const properties = new Set(failures.map(failure => failure.property));

  if (hierarchyNode.nested) {
    for (const nestedService of hierarchyNode.nested) {
      const nestedFailures = (await recursiveValidate(nestedService, shapeStore, id))
        .filter(x => !properties.has(x.property));
      if (nestedFailures.length > 0) failures.push(...nestedFailures);
    }
  }

  return failures;
}


/**
 * @param {Array<string>} data JSON-LD, Microdata and RDFa data in the string format
 * @param {string} url URL of the audited page, used as base for parsing
 * @return {Promise<Array<LH.SchemaramaStructuredData.Failure>>}
 */
module.exports = async function validateSchemaOrg(data, url) {
  /** @type {Array<LH.SchemaramaStructuredData.Failure>} */
  const report = [];
  for (const item of data) {
    try {
      const shapes = utils.quadsToShapes(await parsers.stringToQuads(item, url));
      for (const [id, shape] of shapes.entries()) {
        const failures = utils.uniqueBy((await recursiveValidate(hierarchy, shape, id)),
          ['property', 'shape', 'severity']);
        if (failures.length > 0) report.push(...failures);
      }
    } catch (e) {
      if (!(e instanceof errors.InvalidDataError)) throw e;
    }
  }
  return report;
};
