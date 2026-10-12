/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Unit tests for ARD Schema validation logic.
 * Tests mirror the validation rules from
 * ards-project/ard-spec/conformance/bin/conformance-test (validate_manifest, ARD v0.91).
 */

import {ConformanceTester} from './ard.js';

/**
 * @param {Record<string, any>} overrides
 */
function entry(overrides = {}) {
  return {
    identifier: 'urn:air:google:search:web-search',
    displayName: 'Web Search API',
    type: 'application/mcp-server-card+json',
    url: 'https://example.com/mcp.json',
    representativeQueries: ['search web', 'find articles'],
    ...overrides,
  };
}

/**
 * @param {Array<{message: string}>} list
 * @param {string} text
 */
function has(list, text) {
  return list.some(i => i.message.includes(text));
}

describe('ARD Schema validation (ported from ard-spec)', () => {
  /** @type {ConformanceTester} */
  let tester;

  beforeEach(() => {
    tester = new ConformanceTester();
  });

  it('fails with Error when manifest is malformed JSON', () => {
    tester.validate_manifest('{ invalid json', 'test');
    expect(has(tester.errors, 'Malformed JSON in manifest')).toEqual(true);
  });

  it('fails with Error when manifest root is not an object', () => {
    tester.validate_manifest(JSON.stringify('just a string'), 'test');
    expect(has(tester.errors, 'ArdManifest validation failed')).toEqual(true);
    expect(has(tester.errors, 'Missing required \'entries\' array')).toEqual(true);

    tester = new ConformanceTester();
    tester.validate_manifest('null', 'test');
    expect(has(tester.errors, 'Missing required \'entries\' array')).toEqual(true);
  });

  it('passes when specVersion is absent (ARD requires only entries)', () => {
    const passed = tester.validate_manifest(JSON.stringify({entries: [entry()]}), 'test');
    expect(passed).toEqual(true);
    expect(tester.errors).toEqual([]);
    expect(tester.warnings).toEqual([]);
  });

  it('ignores specVersion and other unrecognized top-level members', () => {
    const manifest = {
      specVersion: '2.0',
      host: {displayName: 'Example'},
      entries: [entry()],
    };
    const passed = tester.validate_manifest(JSON.stringify(manifest), 'test');
    expect(passed).toEqual(true);
    expect(tester.errors).toEqual([]);
    expect(tester.warnings).toEqual([]);
  });

  it('warns, but does not fail, when root contains deprecated collections (ADR-0003)', () => {
    const manifest = {
      specVersion: '1.0',
      collections: [],
      entries: [entry()],
    };
    const passed = tester.validate_manifest(JSON.stringify(manifest), 'test');
    expect(passed).toEqual(true);
    expect(tester.errors).toEqual([]);
    expect(tester.warnings).toEqual([
      {
        element: 'Root',
        message: expect.stringContaining('Found \'collections\' at root'),
      },
    ]);
  });

  it('fails with Error when entries is missing or not an array', () => {
    tester.validate_manifest(JSON.stringify({specVersion: '1.0'}), 'test');
    expect(has(tester.errors, 'ArdManifest validation failed: \'entries\' is a required property'))
      .toEqual(true);
    expect(has(tester.errors, 'Missing required \'entries\' array')).toEqual(true);

    tester = new ConformanceTester();
    tester.validate_manifest(JSON.stringify({entries: 'not-an-array'}), 'test');
    expect(has(tester.errors, '\'entries\' must be a JSON array')).toEqual(true);
  });

  it('fails with Error when entry is not a JSON object', () => {
    tester.validate_manifest(JSON.stringify({entries: ['not an object', null]}), 'test');
    expect(tester.errors).toContainEqual({
      element: 'Entry #0',
      message: expect.stringContaining('ArdEntry validation failed'),
    });
    expect(tester.errors).toContainEqual({
      element: 'Entry #1',
      message: 'Missing required \'identifier\'.',
    });
  });

  it('validates each entry against ArdEntry and labels the error', () => {
    const manifest = {entries: [entry({identifier: 'http://not-a-urn'})]};
    tester.validate_manifest(JSON.stringify(manifest), 'test');
    expect(tester.errors).toContainEqual({
      element: 'Root',
      message: expect.stringMatching(
        /^ArdManifest validation failed: .* at path 'entries\.0\.identifier'$/),
    });
    expect(tester.errors).toContainEqual({
      element: 'Web Search API',
      message: expect.stringMatching(/^ArdEntry validation failed: .* at path 'identifier'$/),
    });
  });

  it('fails with Error when entry is missing identifier or has invalid RFC 8141 URN', () => {
    tester.validate_manifest(JSON.stringify({entries: [entry({identifier: undefined})]}), 'test');
    expect(has(tester.errors, 'Missing required \'identifier\'')).toEqual(true);

    tester = new ConformanceTester();
    tester.validate_manifest(
      JSON.stringify({entries: [entry({identifier: 'http://not-a-urn'})]}), 'test');
    expect(has(tester.errors, 'does not match RFC 8141 URN pattern')).toEqual(true);
  });

  it('fails with Error when entry is missing displayName or type', () => {
    tester.validate_manifest(JSON.stringify({entries: [entry({displayName: undefined})]}), 'test');
    expect(has(tester.errors, 'Missing required \'displayName\'')).toEqual(true);

    tester = new ConformanceTester();
    tester.validate_manifest(JSON.stringify({entries: [entry({type: undefined})]}), 'test');
    expect(has(tester.errors, 'Missing required \'type\'')).toEqual(true);
  });

  describe('media type classification', () => {
    /**
     * @param {unknown} type
     */
    function classify(type) {
      tester = new ConformanceTester();
      tester.validate_manifest(JSON.stringify({entries: [entry({type})]}), 'test');
      return tester;
    }

    it('accepts standard types, case-insensitively and with parameter whitespace', () => {
      for (const type of [
        'application/ai-catalog+json',
        'APPLICATION/AI-Catalog+JSON',
        'text/markdown; profile="urn:air:agent-skills"',
        'text/markdown;profile="urn:air:agent-skills"',
      ]) {
        const result = classify(type);
        expect(result.warnings).toEqual([]);
        expect(result.infos).toEqual([]);
      }
    });

    it('reports application extension types as info only', () => {
      const result = classify('application/custom-unknown+json');
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
      expect(has(result.infos, 'is a valid application extension media type')).toEqual(true);
    });

    it('warns on non-application types that are not standard', () => {
      const result = classify('text/plain');
      expect(has(result.warnings,
        'is not one of standard discovery types: [\'application/ai-catalog+json\'')).toEqual(true);
    });

    it('warns on the deprecated MCP server media type (ADR-0008)', () => {
      const result = classify('application/mcp-server+json');
      expect(has(result.warnings,
        'was renamed by ADR-0008. Use \'application/mcp-server-card+json\'.')).toEqual(true);
    });

    it('warns when a standard base type has missing or unrecognized parameters', () => {
      expect(has(classify('text/markdown').warnings,
        'missing required parameters: profile="urn:air:agent-skills"')).toEqual(true);
      expect(has(classify('application/ai-catalog+json; v=1').warnings,
        'unrecognized parameters: v')).toEqual(true);
    });

    it('warns on invalid or non-string media types', () => {
      expect(has(classify('not a media type').warnings,
        'is not a valid IANA media type')).toEqual(true);
      expect(has(classify('application/ai-catalog+json; a=1; a=2').warnings,
        'is not a valid IANA media type')).toEqual(true);
      expect(has(classify(5).warnings, 'Media type must be a string; got int.')).toEqual(true);
    });
  });

  it('fails with Error when value-or-reference constraint is violated', () => {
    tester.validate_manifest(JSON.stringify({entries: [entry({data: {foo: 'bar'}})]}), 'test');
    expect(has(tester.errors, 'both \'url\' and \'data\' are provided')).toEqual(true);

    tester = new ConformanceTester();
    tester.validate_manifest(JSON.stringify({entries: [entry({url: undefined})]}), 'test');
    expect(has(tester.errors, 'neither \'url\' nor \'data\' is provided')).toEqual(true);
  });

  it('validates representativeQueries type and size constraints', () => {
    tester.validate_manifest(
      JSON.stringify({entries: [entry({representativeQueries: 'not an array'})]}), 'test');
    expect(has(tester.errors, 'must be an array of strings')).toEqual(true);

    tester = new ConformanceTester();
    tester.validate_manifest(
      JSON.stringify({entries: [entry({representativeQueries: [123, 456]})]}), 'test');
    expect(has(tester.errors, 'is not a string')).toEqual(true);

    tester = new ConformanceTester();
    tester.validate_manifest(
      JSON.stringify({entries: [entry({representativeQueries: ['only one query']})]}), 'test');
    expect(has(tester.warnings, '2 to 5 queries are recommended')).toEqual(true);

    tester = new ConformanceTester();
    tester.validate_manifest(
      JSON.stringify({entries: [entry({representativeQueries: undefined})]}), 'test');
    expect(tester.errors).toEqual([]);
    expect(has(tester.warnings, 'No \'representativeQueries\'')).toEqual(true);
  });

  it('validates trustManifest constraints', () => {
    tester.validate_manifest(
      JSON.stringify({entries: [entry({trustManifest: 'not-an-object'})]}), 'test');
    expect(has(tester.errors, '\'trustManifest\' must be a JSON object')).toEqual(true);

    tester = new ConformanceTester();
    tester.validate_manifest(JSON.stringify({entries: [entry({trustManifest: {}})]}), 'test');
    expect(has(tester.errors, 'missing required \'identity\' field')).toEqual(true);
  });

  it('passes completely when schema is fully conformant with URL or inline data', () => {
    const validManifestUrl = {
      entries: [entry({trustManifest: {identity: 'google.com'}})],
    };
    expect(tester.validate_manifest(JSON.stringify(validManifestUrl), 'test')).toEqual(true);
    expect(tester.errors).toEqual([]);
    expect(tester.warnings).toEqual([]);
    expect(tester.infos).toEqual([]);

    tester = new ConformanceTester();
    const validManifestData = {
      entries: [
        entry({
          identifier: 'urn:air:google:tools:math-helper',
          displayName: 'Math Helper',
          type: 'application/agent-card+json',
          url: undefined,
          data: {functions: ['add', 'subtract']},
        }),
      ],
    };
    expect(tester.validate_manifest(JSON.stringify(validManifestData), 'test')).toEqual(true);
    expect(tester.errors).toEqual([]);
  });
});
