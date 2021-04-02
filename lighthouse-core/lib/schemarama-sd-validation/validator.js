/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const shexParser = require('@shexjs/parser');
const shex = require('@shexjs/core');
const utils = require('./helpers/utils.js');
const errors = require('./helpers/errors.js');
const parser = require('./parser.js');

const namespace = utils.namespace;
const formatString = utils.formatString;
const rdf = namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#');
const rdfs = namespace('http://www.w3.org/2000/01/rdf-schema#');

class ValidationReport {
  /**
   * @param {import('@shexjs').Report} jsonReport - report from shex.js, which needs to be simplified
   * @param {import('@shexjs').Schema} schema - parsed shapes in ShExJ format
   * @param {{annotations: LH.SchemaramaStructuredData.LocalizedAnnotations,
   *  messages: LH.SchemaramaStructuredData.LocalizedMessages}} localization - localized messages and annotations
   * @param {{annotations?:object}} options
   */
  constructor(jsonReport, schema, localization, options = {}) {
    /** @type Array<LH.SchemaramaStructuredData.Failure>*/
    this.failures = [];
    this.shapes = new Map();
    for (const shape of schema.shapes) {
      this.shapes.set(shape.id, this.getShapeCore(shape));
    }
    this.failureMessages = localization.messages['failureTypes'];
    this.severityMessages = localization.messages['severity'];
    this.simplify(jsonReport, undefined, undefined);
    this.removeMissingIfTypeMismatch();
    this.annotations = options.annotations;
    this.localizedAnnotations = localization.annotations;
  }

  /**
   * Simplifies shex.js nested report into a linear structure
   * @param {import('@shexjs').Report} jsonReport
   * @param {string|undefined} parentNode
   * @param {string|undefined} parentShape
   */
  simplify(jsonReport, parentNode, parentShape) {
    // STEP 0: if report is array, then run simplification for each element
    if (Array.isArray(jsonReport)) {
      for (const subReport of jsonReport) {
        this.simplify(subReport, parentNode, parentShape);
      }
      return;
    }

    // STEP 1: if report doesn't contain errors, MissingProperty @type or failures
    // that doesn't need to be added, return
    if (!jsonReport.type ||
      jsonReport.type === 'ShapeAndResults' ||
      jsonReport.type === 'ShapeOrResults' ||
      jsonReport.property === rdf('type') ||
      jsonReport.constraint && jsonReport.constraint.predicate === rdf('type') ||
      jsonReport.type === 'NodeConstraintViolation' ||
      jsonReport.type === 'ShapeOrFailure' ||
      jsonReport.type === 'ShapeTest') {
      return;
    }

    // STEP 2: if array or intermediate nested structure, simplify nested values
    if (jsonReport.type === 'ShapeAndFailure' ||
      jsonReport.type === 'Failure' ||
      jsonReport.type === 'SemActFailure' ||
      jsonReport.type === 'FailureList' ||
      jsonReport.type === 'ExtendedResults' ||
      jsonReport.type === 'ExtensionFailure' ||
      (!jsonReport.type) && jsonReport.errors) {
      const node = jsonReport.node;
      this.simplify(jsonReport.errors, node || parentNode, jsonReport.shape || parentShape);
      return;
    }
    // STEP 3: handle closed shape errors
    if (jsonReport.type === 'ClosedShapeViolation') {
      if (jsonReport.unexpectedTriples) {
        for (const triple of jsonReport.unexpectedTriples) {
          this.failures.push({
            type: jsonReport.type,
            property: triple.predicate,
            message: formatString(this.failureMessages[jsonReport.type],
              {property: triple.predicate || ''}),
            node: parentNode || '',
            shape: parentShape,
            severity: 'error',
          });
        }
      }
      return;
    }

    // STEP 4: fill out the failure
    const failure = {
      type: jsonReport.type,
      property: jsonReport.property || (jsonReport.constraint && jsonReport.constraint.predicate),
      message: '',
      node: (jsonReport.triple && jsonReport.triple.subject) || parentNode || '',
      shape: parentShape || '',
      severity: 'error',
    };
    switch (jsonReport.type) {
      case 'TypeMismatch':
        failure.message = formatString(this.failureMessages[jsonReport.type], failure);
        this.simplify(jsonReport.errors, undefined, undefined);
        break;
      case 'MissingProperty' || 'ExcessTripleViolation' || 'NegatedProperty':
        failure.message = formatString(this.failureMessages[jsonReport.type], failure);
        break;
      case 'BooleanSemActFailure':
        if (!jsonReport.ctx || !jsonReport.ctx.predicate) return;
        failure.message = formatString(this.failureMessages[jsonReport.type],
          {property: failure.property, code: jsonReport.code});
        break;
      default:
        throw new errors.ShexValidationError(`Unknown failure type ${jsonReport.type}`);
    }
    this.failures.push(failure);
  }

  /**
   * Recursively parses ShExJ Shape structure to get the core Shape with properties
   * @param {import('@shexjs').Shape} node
   * @returns {import('@shexjs').Shape|undefined}
   */
  getShapeCore(node) {
    if (node.type === 'Shape') {
      return node;
    }
    if (node.shapeExprs) {
      const nodes = node.shapeExprs
        .map(/** @param {*} nestedStruct */nestedStruct => this.getShapeCore(nestedStruct))
        .filter(/** @param {*} nestedStruct */nestedStruct => nestedStruct !== undefined);
      if (nodes.length > 0) return nodes[0];
    }
  }

  /**
   * Gets annotations for specific property in shape from the ShExJ shape
   * @param {string} shape
   * @param {string} property
   * @returns {Map<string, string>}
   */
  getAnnotations(shape, property) {
    // TODO replace any types
    const mapper = new Map();
    const shapeObj = this.shapes.get(shape);
    if (!shapeObj || !shapeObj.expression) return mapper;
    let propStructure;
    if (shapeObj.expression.expressions !== undefined) {
      propStructure = shapeObj.expression.expressions
        .filter(/** @param {any} x*/ x => x.predicate === property)[0];
    } else if (shapeObj.expression.predicate === property) {
      propStructure = shapeObj.expression;
    }
    if (!propStructure || !propStructure.annotations) return mapper;
    propStructure.annotations.forEach(/** @param {any} x*/ x => {
      mapper.set(x.predicate.value || x.predicate, x.object.value);
    });
    return mapper;
  }

  /**
   * Hack for removing MissingProperty violations if the same property has TypeMismatch violation
   */
  removeMissingIfTypeMismatch() {
    const typeMismatches = this.failures.filter(x => x.type === 'TypeMismatch');
    /** @type Array<LH.SchemaramaStructuredData.Failure> */
    const missingFailures = [];
    for (const typeMismatch of typeMismatches) {
      missingFailures.push(this.failures.filter(x => x.property === typeMismatch.property &&
        x.type === 'MissingProperty')[0]);
      this.failures = this.failures.filter(x => !missingFailures.includes(x));
    }
  }

  /**
   * Adds localized annotations to failure
   * @param {LH.SchemaramaStructuredData.Failure}  failure
   * @param {string} id - label (uuid) of the annotation
   */
  addLocalizedAnnotations(failure, id) {
    if (!this.localizedAnnotations.hasOwnProperty(id)) return;
    for (const [key, val] of Object.entries(this.localizedAnnotations[id])) {
      if (!key.includes('@')) {
        failure[key] = val;
      }
    }
  }

  /**
   * Transforms a temporary report failures to structured data report failures
   * @returns {Array<LH.SchemaramaStructuredData.Failure>}
   */
  toStructuredDataReport() {
    return this.failures.map(err => {
      /** @type LH.SchemaramaStructuredData.Failure */
      const failure = {
        property: err.property,
        message: err.message,
        shape: err.shape,
        node: err.node,
        severity: 'error',
      };
      if (err.shape && err.property && this.annotations) {
        const shapeAnnotations = this.getAnnotations(err.shape, err.property);
        for (const [key, value] of Object.entries(this.annotations)) {
          const annotation = shapeAnnotations.get(value) || failure[key];
          if (annotation) failure[key] = annotation;
        }
        if (shapeAnnotations.has(rdfs('label'))) {
          this.addLocalizedAnnotations(failure, shapeAnnotations.get(rdfs('label')) || '');
        }
      }
      failure.severityLabel = this.severityMessages[failure['severity']];
      return failure;
    });
  }
}

class ShexValidator {
  /**
   * @param {import('@shexjs').Schema|string} shapes - ShExJ shapes
   * @param {{annotations: LH.SchemaramaStructuredData.LocalizedAnnotations,
   *  messages: LH.SchemaramaStructuredData.LocalizedMessages}} localization - localized messages and annotations
   * @param {{annotations?:object}} options
   */
  constructor(shapes, localization, options = {}) {
    if (typeof shapes === 'string') {
      this.shapes = shexParser.construct('', {}, {}).parse(shapes);
    } else {
      this.shapes = shapes;
    }
    this.localization = localization;
    this.options = options;
  }

  /**
   * Validates data against ShEx shapes
   * @param {string|import('n3').Store} data
   * @param {string} shape -  identifier of the target shape
   * @param {{ baseUrl?: string }} options
   * @returns {Promise<{baseUrl: string, store: import('n3').Store, failures: Array<LH.SchemaramaStructuredData.Failure>}>}
   */
  async validate(data, shape, options = {}) {
    const baseUrl = options.baseUrl || utils.dummyUrl();
    let parsedData;
    if (typeof data === 'string') {
      parsedData = await parser.stringToQuads(data, baseUrl);
    } else parsedData = data;
    const db = shex.Util.makeN3DB(parsedData);
    const validator = shex.Validator.construct(this.shapes);
    const errors = new ValidationReport(validator.validate(db, [{
      node: baseUrl,
      shape: shape,
    }]), this.shapes, this.localization, this.options);
    return {
      baseUrl: baseUrl,
      store: parsedData,
      failures: errors.toStructuredDataReport(),
    };
  }
}

module.exports = {Validator: ShexValidator};
