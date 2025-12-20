/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const assert = require('assert').strict;
const validateJSONLD = require('../../lib/sd-validation/sd-validation.js');

describe('JSON validation', () => {
  it('reports missing closing bracket', async () => {
    const errors = await validateJSONLD(`{
      "test": "test"
    `);

    assert.equal(errors.length, 1);
    assert.strictEqual(errors[0].lineNumber, 2);
    assert.ok(errors[0].message.indexOf(`Expecting '}'`) === 0);
  });

  it('reports missing comma', async () => {
    const errors = await validateJSONLD(`{
      "test": "test"
      "test2": "test2"
    }`);

    assert.equal(errors.length, 1);
    assert.strictEqual(errors[0].lineNumber, 2);
    assert.ok(errors[0].message.indexOf(`Expecting 'EOF', '}', ':', ',', ']'`) === 0);
  });

  it('reports duplicated property', async () => {
    const errors = await validateJSONLD(`{
      "test": "test",
      "test2": {
        "test2-1": "test",
        "test2-1": "test2"
      }
    }`);

    assert.equal(errors.length, 1);
    assert.ok(errors[0].message, `Duplicate key 'test2-1'`);
  });

  it('parses valid json', async () => {
    const errors = await validateJSONLD(`{
      "test": "test",
      "test2": {
        "test2-1": "test",
        "test2-2": "test2"
      },
      "test3": null,
"test4": 123,
      "test5": [1,2,3]
    }`);

    assert.equal(errors.length, 0);
  });
});

describe('JSON-LD validation', () => {
  it('reports unknown keywords', async () => {
    const errors = await validateJSONLD(`{
      "@type": {},
      "@context": {},
      "@test": {}
    }`);

    assert.equal(errors.length, 1);
    assert.equal(errors[0].message, 'Unknown keyword "@test"');
    assert.equal(errors[0].path, '@test');
    assert.strictEqual(errors[0].lineNumber, 4);
  });

  it('reports invalid context', async () => {
    const errors = await validateJSONLD(`{
      "@context": {"x":"x"}
    }`);

    assert.equal(errors.length, 1);
    assert.ok(errors[0].message.indexOf('@context terms must define an @id') !== -1);
  });

  it('reports invalid keyword value', async () => {
    const errors = await validateJSONLD(`{
      "@context": "http://schema.org/",
      "@type": 23
    }`);

    assert.equal(errors.length, 1);
    assert.ok(errors[0].message.indexOf('"@type" value must a string') !== -1);
  });

  it('reports invalid id value', async () => {
    const errors = await validateJSONLD(`{
      "@context": {
        "image": {
          "@id": "@error"
        }
      }
    }`);

    assert.equal(errors.length, 1);
    assert.ok(errors[0].message.indexOf('@id value must be an absolute IRI') !== -1);
  });

  it('reports invalid context URL', async () => {
    const errors = await validateJSONLD(`{
      "@context": "http://"
    }`);

    assert.equal(errors.length, 1);
    assert.equal(errors[0].message, 'Error parsing URL: http://');
  });
});

describe('schema.org validation', () => {
  it('reports unknown types', async () => {
    const errors = await validateJSONLD(`{
      "@context": "http://schema.org",
      "@type": "Cat"
    }`);

    assert.equal(errors.length, 1);
    assert.equal(errors[0].message, 'Unrecognized schema.org type: http://schema.org/Cat');
    assert.strictEqual(errors[0].lineNumber, 3);
  });

  it('handles arrays of json schemas', async () => {
    const errors = await validateJSONLD(`[
      {
        "@context": "http://schema.org",
        "@type": "Cat"
      },
      {
        "@context": "http://schema.org",
        "@type": "Dog"
      }
    ]`);

    assert.equal(errors.length, 2);
    assert.equal(errors[0].message, 'Unrecognized schema.org type: http://schema.org/Cat');
    assert.equal(errors[1].message, 'Unrecognized schema.org type: http://schema.org/Dog');
  });

  it('reports unknown types for objects with multiple types', async () => {
    const errors = await validateJSONLD(`{
      "@context": "http://schema.org",
      "@type": ["Article", "Dog"]
    }`);

    assert.equal(errors.length, 1);
    assert.equal(errors[0].message, 'Unrecognized schema.org type: http://schema.org/Dog');
  });

  it('reports unexpected fields', async () => {
    const errors = await validateJSONLD(`{
      "@context": "https://schema.org",
      "@type": "Article",
      "author": "Cat",
      "datePublished": "Oct 29th 2017",
      "dateModified": "Oct 29th 2017",
      "headline": "Human's New Best Friend - Cat",
      "image": "https://cats.rock/cat.bmp",
      "publisher": "Cat Magazine",
      "mainEntityOfPage": "https://cats.rock/magazine.html",
      "controversial": true
    }`);

    assert.equal(errors.length, 1);
    assert.equal(errors[0].validTypes[0], 'http://schema.org/Article');
    assert.equal(errors[0].message, 'Unexpected property "controversial"');
    assert.strictEqual(errors[0].lineNumber, 11);
  });

  it('passes if non-schema.org context', async () => {
    const errors = await validateJSONLD(`{
      "@context": "http://www.w3.org/ns/activitystreams",
      "@type": "Create",
      "actor": {
        "@type": "Person",
        "@id": "acct:sally@example.org",
        "displayName": "Sally"
      },
      "object": {
        "@type": "Note",
        "content": "This is a simple note"
      },
      "published": "2015-01-25T12:34:56Z"
    }`);

    assert.equal(errors.length, 0);
  });

  it('passes if everything is OK', async () => {
    const errors = await validateJSONLD(`{
      "@context": "http://schema.org",
      "@type": "Article",
      "author": "Cat",
      "datePublished": "Oct 29th 2017",
      "dateModified": "Oct 29th 2017",
      "headline": "Human's New Best Friend - Cat",
      "image": "https://cats.rock/cat.bmp",
      "publisher": "Cat Magazine",
      "mainEntityOfPage": "https://cats.rock/magazine.html"
    }`);

    assert.equal(errors.length, 0);
  });

  it('passes if valid json-ld uses absolute IRIs as keys', async () => {
    const errors = await validateJSONLD(`{
      "@type": "http://schema.org/Article",
      "http://schema.org/author": {
        "@type": "Person",
        "http://schema.org/name": "Cat"
      },
      "http://schema.org/datePublished": "Oct 29th 2017",
      "http://schema.org/dateModified": "Oct 29th 2017"
    }`);

    assert.equal(errors.length, 0);
  });

  it('fails if invalid json-ld uses absolute IRIs as keys', async () => {
    const errors = await validateJSONLD(`{
      "@type": "http://schema.org/Article",
      "http://schema.org/author": {
        "@type": "http://schema.org/Person",
        "http://schema.org/invalidProperty": "",
        "http://schema.org/name": "Cat"
      },
      "http://schema.org/datePublished": "Oct 29th 2017",
      "http://schema.org/dateModified": "Oct 29th 2017"
    }`);

    assert.equal(errors.length, 1);
    assert.strictEqual(errors[0].lineNumber, 5);
  });

  it('fails with correct errors for a deeply nested json-ld snipppet', async () => {
    const errors = await validateJSONLD(`{
      "@context": "https://schema.org",
      "@type": "Article",
      "author": {
        "@type": "Person",
        "name": "Cat",
        "funder": {
          "@type": "Organization",
          "name": "Cat International",
          "location": [
            {
              "@type": "Place",
              "name": "Catworld"
            },
            {
              "@type": "Place",
              "some": "where"
            }
          ]
        }
      }
    }`);

    assert.equal(errors.length, 1);
    assert.equal(errors[0].message, 'Unexpected property "some"');
    assert.strictEqual(errors[0].lineNumber, 17);
  });
});
