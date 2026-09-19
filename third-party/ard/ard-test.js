/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Unit tests for ARD Schema validation logic.
 * Tests mirror the validation rules from
 * ards-project/ard-spec/conformance/bin/conformance-test (validate_manifest).
 */

import {ConformanceTester} from './ard.js';

describe('ARD Schema validation (ported from ard-spec)', () => {
  /** @type {ConformanceTester} */
  let tester;
  
  beforeEach(() => {
    tester = new ConformanceTester();
  });

  it('fails with Error when manifest root is not an object', () => {
    tester.validate_manifest(JSON.stringify('just a string'), 'test');
    expect(
      tester.errors.some(i => i.message.includes('Missing required \'specVersion\' root property'))
    ).toEqual(true);
  });

  it('fails with Error when root is missing specVersion', () => {
    const manifest = {
      entries: [],
    };
    tester.validate_manifest(JSON.stringify(manifest), 'test');
    expect(
      tester.errors.some(i => i.message.includes('Missing required \'specVersion\''))
    ).toEqual(true);
  });

  it('returns warning when specVersion is unrecognized', () => {
    const manifest = {
      specVersion: '2.0',
      entries: [
        {
          identifier: 'urn:air:google:search:web-search',
          displayName: 'Web Search',
          type: 'application/mcp-server-card+json',
          url: 'https://example.com/api',
          representativeQueries: ['query 1', 'query 2'],
        },
      ],
    };
    tester.validate_manifest(JSON.stringify(manifest), 'test');
    expect(
      tester.warnings.some(
        i => i.message.includes('Unrecognized \'specVersion\'')
      )
    ).toEqual(true);
  });

  it('fails with Error when root contains deprecated collections field (ADR-0003)', () => {
    const manifest = {
      specVersion: '1.0',
      collections: [],
      entries: [],
    };
    tester.validate_manifest(JSON.stringify(manifest), 'test');
    expect(
      tester.errors.some(
        i => i.message.includes('Deprecated field check: Found \'collections\'')
      )
    ).toEqual(true);
  });

  it('fails with Error when entries is missing or not an array', () => {
    const manifestMissing = {specVersion: '1.0'};
    tester.validate_manifest(JSON.stringify(manifestMissing), 'test');
    expect(
      tester.errors.some(i => i.message.includes('Missing required \'entries\' array'))
    ).toEqual(true);

    tester = new ConformanceTester();
    const manifestNotArray = {specVersion: '1.0', entries: 'not-an-array'};
    tester.validate_manifest(JSON.stringify(manifestNotArray), 'test');
    expect(
      tester.errors.some(i => i.message.includes('\'entries\' must be a JSON array'))
    ).toEqual(true);
  });

  it('fails with Error when entry is not a JSON object', () => {
    const manifest = {
      specVersion: '1.0',
      entries: ['not an object'],
    };
    tester.validate_manifest(JSON.stringify(manifest), 'test');
    expect(
      tester.errors.some(i => i.message.includes('Missing required \'identifier\''))
    ).toEqual(true);
  });

  it('fails with Error when entry is missing identifier or has invalid RFC 8141 URN', () => {
    const manifestMissingId = {
      specVersion: '1.0',
      entries: [
        {displayName: 'Test', type: 'application/ai-catalog+json', url: 'https://example.com'},
      ],
    };
    tester.validate_manifest(JSON.stringify(manifestMissingId), 'test');
    expect(
      tester.errors.some(i => i.message.includes('Missing required \'identifier\''))
    ).toEqual(true);

    tester = new ConformanceTester();
    const manifestInvalidUrn = {
      specVersion: '1.0',
      entries: [
        {
          identifier: 'http://not-a-urn',
          displayName: 'Test',
          type: 'application/ai-catalog+json',
          url: 'https://example.com',
        },
      ],
    };
    tester.validate_manifest(JSON.stringify(manifestInvalidUrn), 'test');
    expect(
      tester.errors.some(
        i => i.message.includes('does not match RFC 8141 URN pattern')
      )
    ).toEqual(true);
  });

  it('fails with Error when entry is missing displayName or type', () => {
    const manifestMissingName = {
      specVersion: '1.0',
      entries: [
        {
          identifier: 'urn:air:google:test:agent',
          type: 'application/ai-catalog+json',
          url: 'https://example.com',
        },
      ],
    };
    tester.validate_manifest(JSON.stringify(manifestMissingName), 'test');
    expect(
      tester.errors.some(
        i => i.message.includes('Missing required \'displayName\'')
      )
    ).toEqual(true);

    tester = new ConformanceTester();
    const manifestMissingType = {
      specVersion: '1.0',
      entries: [
        {
          identifier: 'urn:air:google:test:agent',
          displayName: 'Test Agent',
          url: 'https://example.com',
        },
      ],
    };
    tester.validate_manifest(JSON.stringify(manifestMissingType), 'test');
    expect(
      tester.errors.some(i => i.message.includes('Missing required \'type\''))
    ).toEqual(true);
  });

  it('returns warning when entry uses a non-standard media type', () => {
    const manifest = {
      specVersion: '1.0',
      entries: [
        {
          identifier: 'urn:air:google:test:agent',
          displayName: 'Test Agent',
          type: 'application/custom-unknown+json',
          url: 'https://example.com',
          representativeQueries: ['q1', 'q2'],
        },
      ],
    };
    tester.validate_manifest(JSON.stringify(manifest), 'test');
    expect(
      tester.warnings.some(
        i => i.message.includes('not one of standard discovery types')
      )
    ).toEqual(true);
  });

  it('fails with Error when value-or-reference constraint is violated', () => {
    const manifestBoth = {
      specVersion: '1.0',
      entries: [{
        identifier: 'urn:air:google:test:agent',
        displayName: 'Test',
        type: 'application/ai-catalog+json',
        url: 'https://example.com',
        data: {foo: 'bar'},
      }],
    };
    tester.validate_manifest(JSON.stringify(manifestBoth), 'test');
    expect(
      tester.errors.some(
        i => i.message.includes('both \'url\' and \'data\' are provided')
      )
    ).toEqual(true);

    tester = new ConformanceTester();
    const manifestNeither = {
      specVersion: '1.0',
      entries: [{
        identifier: 'urn:air:google:test:agent',
        displayName: 'Test',
        type: 'application/ai-catalog+json',
      }],
    };
    tester.validate_manifest(JSON.stringify(manifestNeither), 'test');
    expect(
      tester.errors.some(
        i => i.message.includes('neither \'url\' nor \'data\' is provided')
      )
    ).toEqual(true);
  });

  it('validates representativeQueries type and size constraints', () => {
    const manifestNonArray = {
      specVersion: '1.0',
      entries: [{
        identifier: 'urn:air:google:test:agent',
        displayName: 'Test',
        type: 'application/ai-catalog+json',
        url: 'https://example.com',
        representativeQueries: 'not an array',
      }],
    };
    tester.validate_manifest(JSON.stringify(manifestNonArray), 'test');
    expect(
      tester.errors.some(i => i.message.includes('must be an array of strings'))
    ).toEqual(true);

    tester = new ConformanceTester();
    const manifestNonString = {
      specVersion: '1.0',
      entries: [{
        identifier: 'urn:air:google:test:agent',
        displayName: 'Test',
        type: 'application/ai-catalog+json',
        url: 'https://example.com',
        representativeQueries: [123, 456],
      }],
    };
    tester.validate_manifest(JSON.stringify(manifestNonString), 'test');
    expect(
      tester.errors.some(i => i.message.includes('is not a string'))
    ).toEqual(true);

    tester = new ConformanceTester();
    const manifestFewQueries = {
      specVersion: '1.0',
      entries: [{
        identifier: 'urn:air:google:test:agent',
        displayName: 'Test',
        type: 'application/ai-catalog+json',
        url: 'https://example.com',
        representativeQueries: ['only one query'],
      }],
    };
    tester.validate_manifest(JSON.stringify(manifestFewQueries), 'test');
    expect(
      tester.warnings.some(i => i.message.includes('2 to 5 queries are recommended'))
    ).toEqual(true);

    tester = new ConformanceTester();
    const manifestMissingQueries = {
      specVersion: '1.0',
      entries: [{
        identifier: 'urn:air:google:test:agent',
        displayName: 'Test',
        type: 'application/ai-catalog+json',
        url: 'https://example.com',
      }],
    };
    tester.validate_manifest(JSON.stringify(manifestMissingQueries), 'test');
    expect(
      tester.warnings.some(i => i.message.includes('Missing \'representativeQueries\''))
    ).toEqual(true);
  });

  it('validates trustManifest constraints', () => {
    const manifestInvalidTrust = {
      specVersion: '1.0',
      entries: [{
        identifier: 'urn:air:google:test:agent',
        displayName: 'Test',
        type: 'application/ai-catalog+json',
        url: 'https://example.com',
        trustManifest: 'not-an-object',
      }],
    };
    tester.validate_manifest(JSON.stringify(manifestInvalidTrust), 'test');
    expect(
      tester.errors.some(
        i => i.message.includes('\'trustManifest\' must be a JSON object')
      )
    ).toEqual(true);

    tester = new ConformanceTester();
    const manifestMissingIdentity = {
      specVersion: '1.0',
      entries: [{
        identifier: 'urn:air:google:test:agent',
        displayName: 'Test',
        type: 'application/ai-catalog+json',
        url: 'https://example.com',
        trustManifest: {},
      }],
    };
    tester.validate_manifest(JSON.stringify(manifestMissingIdentity), 'test');
    expect(
      tester.errors.some(
        i => i.message.includes('missing required \'identity\' field')
      )
    ).toEqual(true);
  });

  it('passes completely when schema is fully conformant with URL or inline data', () => {
    const validManifestUrl = {
      specVersion: '1.0',
      entries: [
        {
          identifier: 'urn:air:google:search:web-search',
          displayName: 'Web Search API',
          type: 'application/mcp-server-card+json',
          url: 'https://example.com/mcp.json',
          representativeQueries: ['search web', 'find articles'],
          trustManifest: {identity: 'google.com'},
        },
      ],
    };
    tester.validate_manifest(JSON.stringify(validManifestUrl), 'test');
    expect(tester.errors.length).toEqual(0);

    tester = new ConformanceTester();
    const validManifestData = {
      specVersion: '1.0',
      entries: [
        {
          identifier: 'urn:air:google:tools:math-helper',
          displayName: 'Math Helper',
          type: 'application/agent-card+json',
          data: {functions: ['add', 'subtract']},
          representativeQueries: ['calculate sum', 'compute subtraction'],
        },
      ],
    };
    tester.validate_manifest(JSON.stringify(validManifestData), 'test');
    expect(tester.errors.length).toEqual(0);
  });
});
