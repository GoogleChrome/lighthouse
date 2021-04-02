/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const assert = require('assert').strict;
const ShexValidator = require('../../lib/schemarama-sd-validation/validator.js').Validator;
const localization = require('../../lib/schemarama-sd-validation/helpers/localization.js');

const localizedAnnotations = localization.getAnnotations();
const localizedMessages = localization.getMessages();

describe('ShEx validation', () => {
  const shapes = `
    PREFIX schema: <http://schema.org/>
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    BASE <https://schema.org/validation>
    <#Thing> {
        schema:name Literal
        // rdfs:comment "Name is required for SomeProduct";
        schema:description Literal
        // rdfs:comment "Description is required for SomeProduct"
        // rdfs:label "warning";
        schema:identifier /GTIN|UUID|ISBN/ *
        // rdfs:label "warning";
    }
    <#CreativeWork> @<#Thing> AND {
        schema:text Literal ;
    }
  `;
  const validator = new ShexValidator(shapes,
    {annotations: localizedAnnotations, messages: localizedMessages});

  it('fails if some property is missing', async () => {
    const data = `{
      "@context": "http://schema.org/",
      "@id": "http://example.org/",
      "@type": "Thing",
      "description": "test1-description"
    }`;
    const errors = (await validator.validate(data, 'https://schema.org/validation#Thing', {baseUrl: 'http://example.org/'})).failures;

    assert.strictEqual(errors.length, 1);
    assert.deepEqual(errors, [
      {
        property: 'http://schema.org/name',
        message: 'Property http://schema.org/name not found',
        shape: 'https://schema.org/validation#Thing',
        node: 'http://example.org/',
        severity: 'error',
        severityLabel: 'error',
      },
    ]);
  });

  it('passes if the data has all required properties', async () => {
    const data = `{
      "@context": "http://schema.org/",
      "@id": "http://example.org/",
      "@type": "Thing",
      "description": "test1-description",
      "name": "test1"
    }`;
    const errors = (await validator.validate(data, 'https://schema.org/validation#Thing', {baseUrl: 'http://example.org/'})).failures;
    assert.strictEqual(errors.length, 0);
  });

  it('fails if regex check is failing', async () => {
    const data = `{
      "@context": "https://schema.org/",
      "@type": "Thing",
      "@id": "http://example.org/",
      "name": "test1",
      "description": "test1-description",
      "identifier": "AAAA"
    }`;
    const errors = (await validator.validate(data, 'https://schema.org/validation#Thing', {baseUrl: 'http://example.org/'})).failures;
    assert.strictEqual(errors.length, 1);
    assert.deepEqual(errors, [
      {
        property: 'http://schema.org/identifier',
        message: 'Value provided for property http://schema.org/identifier has an unexpected type',
        shape: 'https://schema.org/validation#Thing',
        node: 'http://example.org/',
        severity: 'error',
        severityLabel: 'error',
      },
    ]);
  });

  it('fails if some required property is missing and regex check is failing', async () => {
    const data = `{
      "@context": "https://schema.org/",
      "@type": "Thing",
      "@id": "http://example.org/",
      "name": "test1",
      "identifier": "AAAA"
    }`;
    const errors = (await validator.validate(data, 'https://schema.org/validation#Thing', {baseUrl: 'http://example.org/'})).failures;
    assert.strictEqual(errors.length, 2);
    assert.deepEqual(errors, [
      {
        property: 'http://schema.org/identifier',
        message: 'Value provided for property http://schema.org/identifier has an unexpected type',
        shape: 'https://schema.org/validation#Thing',
        node: 'http://example.org/',
        severity: 'error',
        severityLabel: 'error',
      },
      {
        property: 'http://schema.org/description',
        message: 'Property http://schema.org/description not found',
        shape: 'https://schema.org/validation#Thing',
        node: 'http://example.org/',
        severity: 'error',
        severityLabel: 'error',
      },
    ]);
  });

  it('should add annotations if they are defined', async () => {
    const data = `{
      "@context": "https://schema.org/",
      "@type": "Thing",
      "@id": "http://example.org/",
      "name": "test1",
      "identifier": "AAAA"
    }`;
    const annotations = {
      description: 'http://www.w3.org/2000/01/rdf-schema#comment',
      severity: 'http://www.w3.org/2000/01/rdf-schema#label',
    };
    const annotatedValidator = new ShexValidator(shapes,
      {annotations: localizedAnnotations, messages: localizedMessages},
      {annotations: annotations});
    const errors = (await annotatedValidator.validate(data, 'https://schema.org/validation#Thing', {baseUrl: 'http://example.org/'})).failures;
    assert.strictEqual(errors.length, 2);
    assert.deepEqual(errors, [
      {
        property: 'http://schema.org/identifier',
        message: 'Value provided for property http://schema.org/identifier has an unexpected type',
        shape: 'https://schema.org/validation#Thing',
        node: 'http://example.org/',
        severity: 'warning',
        severityLabel: 'warning',
      },
      {
        property: 'http://schema.org/description',
        message: 'Property http://schema.org/description not found',
        shape: 'https://schema.org/validation#Thing',
        node: 'http://example.org/',
        severity: 'warning',
        severityLabel: 'warning',
        description: 'Description is required for SomeProduct',
      },
    ]);
  });

  it('should include failures from parent classes', async () => {
    const data = `{
      "@context": "http://schema.org/",
      "@id": "http://example.org/",
      "@type": "CreativeWork",
      "description": "test1-description"
    }`;
    const errors = (await validator.validate(data, 'https://schema.org/validation#Thing', {baseUrl: 'http://example.org/'})).failures;
    assert.strictEqual(errors.length, 1);
    assert.deepEqual(errors, [
      {
        property: 'http://schema.org/name',
        message: 'Property http://schema.org/name not found',
        shape: 'https://schema.org/validation#Thing',
        node: 'http://example.org/',
        severity: 'error',
        severityLabel: 'error',
      },
    ]);
  });
});
