/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Unit tests for ARD Schema Conformance Audit.
 */

import ArdSchema from '../../../audits/agentic/ard-schema.js';

describe('ARD Schema Audit', () => {
  /**
   * Helper to construct mock artifacts for testing.
   * @param {number} status
   * @param {any} manifest
   * @param {Partial<LH.Artifacts['AgentResourceDiscovery']['discoverySignals']>=} customSignals
   * @return {LH.Artifacts}
   */
  function createArtifacts(status, manifest, customSignals = {}) {
    let content = null;
    if (manifest !== null) {
      content = typeof manifest === 'string' ? manifest : JSON.stringify(manifest);
    }
    return {
      AgentResourceDiscovery: {
        status,
        content,
        headers: {'content-type': 'application/json'},
        discoverySignals: {
          robotsTxtAgentmap: 'https://example.com/ai-catalog.json',
          htmlLink: null,
          httpHeaderLink: null,
          wellKnown: 'https://example.com/.well-known/ai-catalog.json',
          ...customSignals,
        },
      },
    };
  }

  it('is not applicable when no catalog URL is found', () => {
    const artifacts = {
      AgentResourceDiscovery: {
        status: 404,
        content: null,
        headers: null,
        discoverySignals: {
          robotsTxtAgentmap: null,
          htmlLink: null,
          httpHeaderLink: null,
          wellKnown: 'https://example.com/.well-known/ai-catalog.json',
        },
      },
    };

    const result = ArdSchema.audit(artifacts);
    expect(result.score).toEqual(1);
    expect(result.notApplicable).toEqual(true);
  });

  it('fails with score 0 when manifest content could not be loaded', () => {
    const artifacts = createArtifacts(500, null);
    const result = ArdSchema.audit(artifacts);
    expect(result.score).toEqual(0);
    expect(result.explanation).toContain('could not be loaded');
  });

  it('fails with score 0 when manifest is malformed JSON', () => {
    const artifacts = createArtifacts(200, '{ invalid json');
    const result = ArdSchema.audit(artifacts);
    expect(result.score).toEqual(0);
    expect(result.details.items[0].severity).toEqual('Error');
    expect(result.details.items[0].issue).toContain('Malformed JSON in manifest');
  });

  it('passes completely when schema is fully conformant with URL', () => {
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
    const resultUrl = ArdSchema.audit(createArtifacts(200, validManifestUrl));
    expect(resultUrl.score).toEqual(1);
    expect(resultUrl.details).toBeUndefined();
  });

  it('returns a warning when representativeQueries is missing (Lighthouse best practice)', () => {
    const manifestWithoutQueries = {
      specVersion: '1.0',
      entries: [
        {
          identifier: 'urn:air:google:search:web-search',
          displayName: 'Web Search API',
          type: 'application/mcp-server-card+json',
          url: 'https://example.com/mcp.json',
        },
      ],
    };
    const result = ArdSchema.audit(createArtifacts(200, manifestWithoutQueries));
    expect(result.score).toEqual(0.5);
    expect(result.details.items[0].severity).toEqual('Warning');
    expect(result.details.items[0].issue).toContain('Missing \'representativeQueries\'');
  });
});
