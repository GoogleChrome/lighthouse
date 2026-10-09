/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Unit tests for ARD Schema Conformance Audit.
 */

import ArdSchema from '../../../audits/agentic/ard-schema.js';

/** @typedef {LH.Artifacts['AgentResourceDiscovery']} AgentResourceDiscovery */

const WELL_KNOWN = 'https://example.com/.well-known/ard.json';
const LEGACY_WELL_KNOWN = 'https://example.com/.well-known/ai-catalog.json';

/** @return {AgentResourceDiscovery['discoverySignals']} */
function emptySignals() {
  return {
    robotsTxtAgentmap: null,
    htmlLink: null,
    httpHeaderLink: null,
    legacyHtmlLink: null,
    legacyHttpHeaderLink: null,
    wellKnown: WELL_KNOWN,
    legacyWellKnown: LEGACY_WELL_KNOWN,
  };
}

const validEntry = {
  identifier: 'urn:air:google:search:web-search',
  displayName: 'Web Search API',
  type: 'application/mcp-server-card+json',
  url: 'https://example.com/mcp.json',
  representativeQueries: ['search web', 'find articles'],
  trustManifest: {identity: 'google.com'},
};

describe('ARD Schema Audit', () => {
  /**
   * Helper to construct mock artifacts for testing.
   * @param {number} status
   * @param {any} manifest
   * @param {Partial<AgentResourceDiscovery>=} overrides
   * @param {Partial<AgentResourceDiscovery['discoverySignals']>=} customSignals
   * @return {LH.Artifacts}
   */
  function createArtifacts(status, manifest, overrides = {}, customSignals = {}) {
    let content = null;
    if (manifest !== null) {
      content = typeof manifest === 'string' ? manifest : JSON.stringify(manifest);
    }
    const discoverySignals = {
      ...emptySignals(),
      robotsTxtAgentmap: 'https://example.com/ard.json',
      ...customSignals,
    };
    /** @type {AgentResourceDiscovery} */
    const AgentResourceDiscovery = {
      status,
      content,
      headers: {'content-type': 'application/json'},
      catalogUrl: 'https://example.com/ard.json',
      discoverySource: 'robotsTxtAgentmap',
      discoverySignals,
      failedSources: [],
      ...overrides,
    };
    // @ts-expect-error - Only the artifact under test is needed.
    return {AgentResourceDiscovery};
  }

  it('is not applicable when no manifest is found', () => {
    const artifacts = createArtifacts(404, null, {
      headers: null,
      catalogUrl: WELL_KNOWN,
      discoverySource: 'wellKnown',
      discoverySignals: emptySignals(),
    });

    const result = ArdSchema.audit(artifacts);
    expect(result.score).toEqual(1);
    expect(result.notApplicable).toEqual(true);
  });

  it('is applicable when /.well-known/ard.json is found with no other signal', () => {
    for (const status of [200, 201]) {
      const artifacts = createArtifacts(status, {entries: [validEntry]}, {
        catalogUrl: WELL_KNOWN,
        discoverySource: 'wellKnown',
        discoverySignals: emptySignals(),
      });

      const result = ArdSchema.audit(artifacts);
      expect(result.notApplicable).toBeUndefined();
      expect(result.score).toEqual(1);
    }
  });

  it('fails with score 0 when manifest content could not be loaded', () => {
    for (const [status, content] of /** @type {const} */ ([[500, null], [null, null], [200, '']])) {
      const artifacts = createArtifacts(status ?? 0, content, {
        status,
        catalogUrl: WELL_KNOWN,
        discoverySource: 'wellKnown',
        discoverySignals: emptySignals(),
      });
      const result = ArdSchema.audit(artifacts);
      expect(result.score).toEqual(0);
      expect(result.explanation).toBeDisplayString(
        'ARD manifest could not be loaded for schema validation.'
      );
    }
  });

  it('fails with score 0 (not notApplicable) when a legacy link is broken', () => {
    const artifacts = createArtifacts(404, null, {
      catalogUrl: 'https://example.com/ai-catalog.json',
      discoverySource: 'legacyHtmlLink',
    }, {
      robotsTxtAgentmap: null,
      legacyHtmlLink: 'https://example.com/ai-catalog.json',
    });

    const result = ArdSchema.audit(artifacts);
    expect(result.notApplicable).toBeUndefined();
    expect(result.score).toEqual(0);
  });

  it('fails with score 0 when manifest is malformed JSON', () => {
    const artifacts = createArtifacts(200, '{ invalid json');
    const result = ArdSchema.audit(artifacts);
    expect(result.score).toEqual(0);
    expect(result.details.items[0].severity).toBeDisplayString('Error');
    expect(result.details.items[0].issue).toContain('Malformed JSON in manifest');
  });

  it('passes completely when schema is fully conformant with URL', () => {
    const manifest = {specVersion: '1.0', entries: [validEntry]};
    const result = ArdSchema.audit(createArtifacts(200, manifest));
    expect(result.score).toEqual(1);
    expect(result.details).toBeUndefined();
  });

  it('passes when specVersion is missing', () => {
    const result = ArdSchema.audit(createArtifacts(200, {entries: [validEntry]}));
    expect(result.score).toEqual(1);
    expect(result.details).toBeUndefined();
  });

  it('passes when the manifest has unrecognized top-level members', () => {
    const manifest = {entries: [validEntry], host: {displayName: 'Example'}, extra: true};
    const result = ArdSchema.audit(createArtifacts(200, manifest));
    expect(result.score).toEqual(1);
    expect(result.details).toBeUndefined();
  });

  it('returns low severity and score 0.9 when root collections are present', () => {
    const manifest = {entries: [validEntry], collections: []};
    const result = ArdSchema.audit(createArtifacts(200, manifest));
    expect(result.score).toEqual(0.9);
    expect(result.details.items).toHaveLength(1);
    expect(result.details.items[0].element).toEqual('Root');
    expect(result.details.items[0].severity).toBeDisplayString('Low');
    expect(result.details.items[0].issue).toContain('Found \'collections\' at root');
  });

  it('returns low severity and score 0.9 when representativeQueries is missing', () => {
    const {representativeQueries: _, ...entry} = validEntry;
    const result = ArdSchema.audit(createArtifacts(200, {entries: [entry]}));
    expect(result.score).toEqual(0.9);
    expect(result.details.items[0].severity).toBeDisplayString('Low');
    expect(result.details.items[0].issue).toContain('No \'representativeQueries\'');
  });

  it('fails with score 0 when an entry violates the ArdEntry schema', () => {
    const {displayName: _, ...entry} = validEntry;
    const result = ArdSchema.audit(createArtifacts(200, {entries: [entry]}));
    expect(result.score).toEqual(0);
    const issues = result.details.items.map(item => item.issue);
    expect(issues).toContainEqual(expect.stringContaining('ArdEntry validation failed'));
    expect(issues).toContain('Missing required \'displayName\'.');
  });

  it('returns low severity and score 0.9 when an advertised location is broken ' +
      'but a manifest is found elsewhere', () => {
    const brokenUrl = 'https://example.com/old/ard.json';
    const artifacts = createArtifacts(200, {entries: [validEntry]}, {
      catalogUrl: WELL_KNOWN,
      discoverySource: 'wellKnown',
      failedSources: [{source: 'htmlLink', url: brokenUrl, status: 404}],
    }, {robotsTxtAgentmap: null, htmlLink: brokenUrl});

    const result = ArdSchema.audit(artifacts);
    expect(result.score).toEqual(0.9);
    expect(result.details.items).toHaveLength(1);
    expect(result.details.items[0].element).toEqual(brokenUrl);
    expect(result.details.items[0].severity).toBeDisplayString('Low');
    expect(result.details.items[0].issue).toBeDisplayString(
      'Advertised ARD manifest location could not be loaded (HTTP status 404).'
    );
  });

  it('lists every broken advertised location as an error when nothing loads', () => {
    const robotsUrl = 'https://example.com/robots-ard.json';
    const linkUrl = 'https://example.com/old/ard.json';
    const artifacts = createArtifacts(404, null, {
      catalogUrl: robotsUrl,
      discoverySource: 'robotsTxtAgentmap',
      failedSources: [
        {source: 'robotsTxtAgentmap', url: robotsUrl, status: 404},
        {source: 'htmlLink', url: linkUrl, status: null},
      ],
    }, {robotsTxtAgentmap: robotsUrl, htmlLink: linkUrl});

    const result = ArdSchema.audit(artifacts);
    expect(result.score).toEqual(0);
    expect(result.explanation).toBeDisplayString(
      'ARD manifest could not be loaded for schema validation.'
    );
    expect(result.details.items).toHaveLength(2);
    expect(result.details.items[0].element).toEqual(robotsUrl);
    expect(result.details.items[0].severity).toBeDisplayString('Error');
    expect(result.details.items[0].issue).toBeDisplayString(
      'Advertised ARD manifest location could not be loaded (HTTP status 404).'
    );
    expect(result.details.items[1].element).toEqual(linkUrl);
    expect(result.details.items[1].issue).toBeDisplayString(
      'Advertised ARD manifest location could not be loaded.'
    );
  });

  for (const discoverySource of /** @type {const} */ (
    ['legacyHtmlLink', 'legacyHttpHeaderLink', 'legacyWellKnown'])) {
    it(`returns low severity and score 0.9 when discovered via ${discoverySource}`, () => {
      const catalogUrl = 'https://example.com/.well-known/ai-catalog.json';
      const artifacts = createArtifacts(200, {entries: [validEntry]}, {
        catalogUrl,
        discoverySource,
      }, {robotsTxtAgentmap: null});

      const result = ArdSchema.audit(artifacts);
      expect(result.score).toEqual(0.9);
      expect(result.details.items).toHaveLength(1);
      expect(result.details.items[0].element).toEqual(catalogUrl);
      expect(result.details.items[0].severity).toBeDisplayString('Low');
      expect(result.details.items[0].issue).toBeDisplayString(
        /Manifest was only found through a legacy location/
      );
    });
  }
});
