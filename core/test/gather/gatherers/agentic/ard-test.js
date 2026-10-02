/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import AgentResourceDiscovery from '../../../../gather/gatherers/agentic/ard.js';

describe('ARD Gatherer Static Helpers', () => {
  const finalUrl = 'https://example.com/page';

  describe('getRobotsTxtAgentmap', () => {
    it('returns null if robotsTxt is null or has no content', () => {
      expect(AgentResourceDiscovery.getRobotsTxtAgentmap(null, finalUrl)).toBeNull();
      expect(AgentResourceDiscovery.getRobotsTxtAgentmap(
        {status: 200, content: null}, finalUrl)).toBeNull();
      expect(AgentResourceDiscovery.getRobotsTxtAgentmap(
        {status: 404, content: null}, finalUrl)).toBeNull();
    });

    it('returns null if no Agentmap directive exists', () => {
      const robotsTxt = {
        status: 200,
        content: 'User-agent: *\nDisallow: /admin\nSitemap: https://example.com/sitemap.xml\n',
      };
      expect(AgentResourceDiscovery.getRobotsTxtAgentmap(robotsTxt, finalUrl)).toBeNull();
    });

    it('extracts absolute URL from Agentmap directive', () => {
      const robotsTxt = {
        status: 200,
        content: 'User-agent: *\nAgentmap: https://example.com/custom-catalog.json\n',
      };
      expect(AgentResourceDiscovery.getRobotsTxtAgentmap(robotsTxt, finalUrl))
        .toEqual('https://example.com/custom-catalog.json');
    });

    it('resolves relative URL from Agentmap directive', () => {
      const robotsTxt = {
        status: 200,
        content: 'User-agent: *\nAgentmap: /ard.json\n',
      };
      expect(AgentResourceDiscovery.getRobotsTxtAgentmap(robotsTxt, finalUrl))
        .toEqual('https://example.com/ard.json');
    });

    it('handles case-insensitivity in directive name', () => {
      const robotsTxt = {
        status: 200,
        content: 'agentmap: https://example.com/ai.json\n',
      };
      expect(AgentResourceDiscovery.getRobotsTxtAgentmap(robotsTxt, finalUrl))
        .toEqual('https://example.com/ai.json');
    });
  });

  describe('getHtmlLinksFromDom', () => {
    /**
     * @param {() => Promise<any>} evaluate
     * @return {LH.Gatherer.Context}
     */
    function contextWithEvaluate(evaluate) {
      return /** @type {LH.Gatherer.Context} */ (/** @type {unknown} */ ({
        driver: {executionContext: {evaluate}},
      }));
    }

    it('returns resolved absolute URLs for ard and ai-catalog links', async () => {
      const context = contextWithEvaluate(() => Promise.resolve({
        ard: '/ard.json',
        legacy: '/legacy-catalog.json',
      }));
      const result = await AgentResourceDiscovery.getHtmlLinksFromDom(context, finalUrl);
      expect(result).toEqual({
        ard: 'https://example.com/ard.json',
        legacy: 'https://example.com/legacy-catalog.json',
      });
    });

    it('returns nulls when DOM elements do not exist', async () => {
      const context = contextWithEvaluate(() => Promise.resolve({ard: null, legacy: null}));
      const result = await AgentResourceDiscovery.getHtmlLinksFromDom(context, finalUrl);
      expect(result).toEqual({ard: null, legacy: null});
    });

    it('returns nulls when evaluate throws', async () => {
      const context = contextWithEvaluate(() => Promise.reject(new Error('DOM evaluate error')));
      const result = await AgentResourceDiscovery.getHtmlLinksFromDom(context, finalUrl);
      expect(result).toEqual({ard: null, legacy: null});
    });
  });

  describe('getHttpHeaderLinks', () => {
    /**
     * @param {string|Error} linkHeader
     * @return {LH.Gatherer.Context}
     */
    function contextWithLinkHeader(linkHeader) {
      return /** @type {LH.Gatherer.Context} */ (/** @type {unknown} */ ({
        gatherMode: 'navigation',
        driver: {
          fetcher: {
            fetchResource: () => linkHeader instanceof Error ?
              Promise.reject(linkHeader) :
              Promise.resolve({status: 200, content: '', headers: {'link': linkHeader}}),
          },
        },
      }));
    }

    it('returns nulls when gatherMode is not navigation', async () => {
      const context = /** @type {LH.Gatherer.Context} */ (/** @type {unknown} */ ({
        gatherMode: 'snapshot',
      }));
      const result = await AgentResourceDiscovery.getHttpHeaderLinks(context, finalUrl);
      expect(result).toEqual({ard: null, legacy: null});
    });

    it('extracts and resolves rel="ard" and rel="ai-catalog" URLs', async () => {
      const context = contextWithLinkHeader(
        '<https://example.com/header-ard.json>; rel="ard", </legacy.json>; rel=ai-catalog');
      const result = await AgentResourceDiscovery.getHttpHeaderLinks(context, finalUrl);
      expect(result).toEqual({
        ard: 'https://example.com/header-ard.json',
        legacy: 'https://example.com/legacy.json',
      });
    });

    it('returns nulls when Link header has neither relation', async () => {
      const context = contextWithLinkHeader('<https://example.com/styles.css>; rel="stylesheet"');
      const result = await AgentResourceDiscovery.getHttpHeaderLinks(context, finalUrl);
      expect(result).toEqual({ard: null, legacy: null});
    });

    it('returns nulls when fetchResource throws', async () => {
      const context = contextWithLinkHeader(new Error('Network error'));
      const result = await AgentResourceDiscovery.getHttpHeaderLinks(context, finalUrl);
      expect(result).toEqual({ard: null, legacy: null});
    });
  });
});

describe('AgentResourceDiscovery Gatherer', () => {
  const pageUrl = 'https://example.com/page';
  const wellKnown = 'https://example.com/.well-known/ard.json';
  const legacyWellKnown = 'https://example.com/.well-known/ai-catalog.json';
  const manifest = {
    status: 200,
    content: '{"entries": []}',
    headers: {'content-type': 'application/json'},
  };

  /**
   * @param {object} options
   * @param {string|null} [options.robotsTxtContent]
   * @param {{ard?: string|null, legacy?: string|null}} [options.domLinks]
   * @param {string|null} [options.linkHeader]
   * @param {Record<string, {status: number|null, content: string|null, headers?: Record<string, string>|null}>} [options.responses]
   *   Responses by URL. Unlisted URLs return a 404.
   */
  function getContext({robotsTxtContent = null, domLinks = {}, linkHeader = null, responses = {}}) {
    /** @type {string[]} */
    const fetched = [];
    const context = /** @type {LH.Gatherer.Context<'RobotsTxt'>} */ (/** @type {unknown} */ ({
      gatherMode: 'navigation',
      baseArtifacts: {
        URL: {finalDisplayedUrl: pageUrl},
      },
      dependencies: {
        RobotsTxt: {status: robotsTxtContent ? 200 : 404, content: robotsTxtContent},
      },
      driver: {
        executionContext: {
          evaluate: () => Promise.resolve({ard: null, legacy: null, ...domLinks}),
        },
        fetcher: {
          fetchResource: (/** @type {string} */ targetUrl) => {
            if (targetUrl === pageUrl) {
              return Promise.resolve({
                status: 200,
                content: '',
                headers: linkHeader ? {link: linkHeader} : {},
              });
            }
            fetched.push(targetUrl);
            return Promise.resolve(
              responses[targetUrl] || {status: 404, content: null, headers: null});
          },
        },
      },
    }));
    return {context, fetched};
  }

  it('discovers catalog via robots.txt Agentmap directive', async () => {
    const {context} = getContext({
      robotsTxtContent: 'User-agent: *\nAgentmap: https://example.com/custom-catalog.json\n',
      responses: {
        'https://example.com/custom-catalog.json': {
          ...manifest,
          headers: {'content-type': 'application/json', 'access-control-allow-origin': '*'},
        },
      },
    });

    const artifact = await new AgentResourceDiscovery().getArtifact(context);

    expect(artifact.catalogUrl).toEqual('https://example.com/custom-catalog.json');
    expect(artifact.discoverySource).toEqual('robotsTxtAgentmap');
    expect(artifact.discoverySignals.robotsTxtAgentmap).toEqual('https://example.com/custom-catalog.json');
    expect(artifact.status).toEqual(200);
    expect(artifact.headers?.['content-type']).toEqual('application/json');
    expect(artifact.headers?.['access-control-allow-origin']).toEqual('*');
  });

  it('discovers catalog via <link rel="ard">', async () => {
    const {context} = getContext({
      domLinks: {ard: 'https://example.com/dom-ard.json'},
      responses: {'https://example.com/dom-ard.json': manifest},
    });

    const artifact = await new AgentResourceDiscovery().getArtifact(context);

    expect(artifact.catalogUrl).toEqual('https://example.com/dom-ard.json');
    expect(artifact.discoverySource).toEqual('htmlLink');
    expect(artifact.discoverySignals.htmlLink).toEqual('https://example.com/dom-ard.json');
  });

  it('discovers catalog via HTTP Link header with rel="ard"', async () => {
    const {context} = getContext({
      linkHeader: '<https://example.com/header-ard.json>; rel="ard"',
      responses: {'https://example.com/header-ard.json': manifest},
    });

    const artifact = await new AgentResourceDiscovery().getArtifact(context);

    expect(artifact.catalogUrl).toEqual('https://example.com/header-ard.json');
    expect(artifact.discoverySource).toEqual('httpHeaderLink');
    expect(artifact.discoverySignals.httpHeaderLink).toEqual('https://example.com/header-ard.json');
  });

  it('discovers catalog at /.well-known/ard.json without any other signal', async () => {
    const {context, fetched} = getContext({responses: {[wellKnown]: manifest}});

    const artifact = await new AgentResourceDiscovery().getArtifact(context);

    expect(artifact.catalogUrl).toEqual(wellKnown);
    expect(artifact.discoverySource).toEqual('wellKnown');
    expect(artifact.status).toEqual(200);
    expect(fetched).toEqual([wellKnown]);
  });

  it('prefers /.well-known/ard.json over predecessor ai-catalog signals', async () => {
    const {context, fetched} = getContext({
      domLinks: {legacy: 'https://example.com/dom-legacy.json'},
      linkHeader: '<https://example.com/header-legacy.json>; rel="ai-catalog"',
      responses: {
        [wellKnown]: manifest,
        'https://example.com/dom-legacy.json': manifest,
        [legacyWellKnown]: manifest,
      },
    });

    const artifact = await new AgentResourceDiscovery().getArtifact(context);

    expect(artifact.catalogUrl).toEqual(wellKnown);
    expect(artifact.discoverySource).toEqual('wellKnown');
    expect(artifact.discoverySignals.legacyHtmlLink).toEqual('https://example.com/dom-legacy.json');
    expect(artifact.discoverySignals.legacyHttpHeaderLink)
      .toEqual('https://example.com/header-legacy.json');
    expect(fetched).toEqual([wellKnown]);
  });

  it('falls back to <link rel="ai-catalog"> when /.well-known/ard.json is missing', async () => {
    const {context} = getContext({
      domLinks: {legacy: 'https://example.com/dom-legacy.json'},
      responses: {'https://example.com/dom-legacy.json': manifest},
    });

    const artifact = await new AgentResourceDiscovery().getArtifact(context);

    expect(artifact.catalogUrl).toEqual('https://example.com/dom-legacy.json');
    expect(artifact.discoverySource).toEqual('legacyHtmlLink');
  });

  it('falls back to Link rel="ai-catalog" when /.well-known/ard.json is missing', async () => {
    const {context} = getContext({
      linkHeader: '<https://example.com/header-legacy.json>; rel="ai-catalog"',
      responses: {'https://example.com/header-legacy.json': manifest},
    });

    const artifact = await new AgentResourceDiscovery().getArtifact(context);

    expect(artifact.catalogUrl).toEqual('https://example.com/header-legacy.json');
    expect(artifact.discoverySource).toEqual('legacyHttpHeaderLink');
  });

  it('falls back to /.well-known/ai-catalog.json as a last resort', async () => {
    const {context, fetched} = getContext({responses: {[legacyWellKnown]: manifest}});

    const artifact = await new AgentResourceDiscovery().getArtifact(context);

    expect(artifact.catalogUrl).toEqual(legacyWellKnown);
    expect(artifact.discoverySource).toEqual('legacyWellKnown');
    expect(artifact.status).toEqual(200);
    expect(artifact.failedSources).toEqual([]);
    expect(fetched).toEqual([wellKnown, legacyWellKnown]);
  });

  it('reports the /.well-known/ard.json result when nothing is found', async () => {
    const {context} = getContext({});

    const artifact = await new AgentResourceDiscovery().getArtifact(context);

    expect(artifact.catalogUrl).toEqual(wellKnown);
    expect(artifact.discoverySource).toEqual('wellKnown');
    expect(artifact.status).toEqual(404);
    expect(artifact.discoverySignals).toEqual({
      robotsTxtAgentmap: null,
      htmlLink: null,
      httpHeaderLink: null,
      legacyHtmlLink: null,
      legacyHttpHeaderLink: null,
      wellKnown,
      legacyWellKnown,
    });
    expect(artifact.failedSources).toEqual([]);
  });

  it('falls through a broken Agentmap to /.well-known/ard.json and records it', async () => {
    const {context, fetched} = getContext({
      robotsTxtContent: 'Agentmap: https://example.com/stale.json\n',
      responses: {[wellKnown]: manifest},
    });

    const artifact = await new AgentResourceDiscovery().getArtifact(context);

    expect(artifact.catalogUrl).toEqual(wellKnown);
    expect(artifact.discoverySource).toEqual('wellKnown');
    expect(artifact.status).toEqual(200);
    expect(artifact.failedSources).toEqual([
      {source: 'robotsTxtAgentmap', url: 'https://example.com/stale.json', status: 404},
    ]);
    expect(fetched).toEqual(['https://example.com/stale.json', wellKnown]);
  });

  it('falls through broken rel="ard" links to a legacy link, recording each', async () => {
    const {context} = getContext({
      domLinks: {ard: 'https://example.com/dom-ard.json', legacy: 'https://example.com/dom-legacy.json'},
      linkHeader: '<https://example.com/header-ard.json>; rel="ard"',
      responses: {
        'https://example.com/dom-ard.json': {status: 500, content: null},
        'https://example.com/dom-legacy.json': manifest,
      },
    });

    const artifact = await new AgentResourceDiscovery().getArtifact(context);

    expect(artifact.catalogUrl).toEqual('https://example.com/dom-legacy.json');
    expect(artifact.discoverySource).toEqual('legacyHtmlLink');
    // The probed /.well-known/ard.json 404 is not recorded.
    expect(artifact.failedSources).toEqual([
      {source: 'htmlLink', url: 'https://example.com/dom-ard.json', status: 500},
      {source: 'httpHeaderLink', url: 'https://example.com/header-ard.json', status: 404},
    ]);
  });

  it('treats a 200 response with no content as a failed location', async () => {
    const {context} = getContext({
      domLinks: {ard: 'https://example.com/empty.json'},
      responses: {
        'https://example.com/empty.json': {status: 200, content: ''},
        [wellKnown]: manifest,
      },
    });

    const artifact = await new AgentResourceDiscovery().getArtifact(context);

    expect(artifact.discoverySource).toEqual('wellKnown');
    expect(artifact.failedSources).toEqual([
      {source: 'htmlLink', url: 'https://example.com/empty.json', status: 200},
    ]);
  });

  it('reports the first broken advertised location when nothing loads', async () => {
    const {context, fetched} = getContext({
      robotsTxtContent: 'Agentmap: https://example.com/stale.json\n',
      linkHeader: '<https://example.com/header-legacy.json>; rel="ai-catalog"',
      responses: {
        'https://example.com/stale.json': {status: 410, content: null},
      },
    });

    const artifact = await new AgentResourceDiscovery().getArtifact(context);

    expect(artifact.catalogUrl).toEqual('https://example.com/stale.json');
    expect(artifact.discoverySource).toEqual('robotsTxtAgentmap');
    expect(artifact.status).toEqual(410);
    expect(artifact.failedSources).toEqual([
      {source: 'robotsTxtAgentmap', url: 'https://example.com/stale.json', status: 410},
      {source: 'legacyHttpHeaderLink', url: 'https://example.com/header-legacy.json', status: 404},
    ]);
    expect(fetched).toEqual([
      'https://example.com/stale.json',
      wellKnown,
      'https://example.com/header-legacy.json',
      legacyWellKnown,
    ]);
  });

  it('fetches and reports a URL only once when several signals share it', async () => {
    const {context, fetched} = getContext({
      domLinks: {ard: wellKnown},
      linkHeader: `<${wellKnown}>; rel="ard"`,
    });

    const artifact = await new AgentResourceDiscovery().getArtifact(context);

    expect(artifact.failedSources).toEqual([{source: 'htmlLink', url: wellKnown, status: 404}]);
    expect(fetched).toEqual([wellKnown, legacyWellKnown]);
  });

  it('prioritizes robots.txt, then rel="ard" in the DOM, then the Link header', async () => {
    const {context} = getContext({
      robotsTxtContent: 'Agentmap: https://example.com/robots-catalog.json\n',
      domLinks: {ard: 'https://example.com/dom-ard.json'},
      linkHeader: '<https://example.com/header-ard.json>; rel="ard"',
      responses: {'https://example.com/robots-catalog.json': manifest},
    });

    const artifact = await new AgentResourceDiscovery().getArtifact(context);

    expect(artifact.catalogUrl).toEqual('https://example.com/robots-catalog.json');
    expect(artifact.discoverySignals.robotsTxtAgentmap).toEqual('https://example.com/robots-catalog.json');
    expect(artifact.discoverySignals.htmlLink).toEqual('https://example.com/dom-ard.json');
    expect(artifact.discoverySignals.httpHeaderLink).toEqual('https://example.com/header-ard.json');

    const {context: noRobots} = getContext({
      domLinks: {ard: 'https://example.com/dom-ard.json'},
      linkHeader: '<https://example.com/header-ard.json>; rel="ard"',
    });
    expect((await new AgentResourceDiscovery().getArtifact(noRobots)).discoverySource)
      .toEqual('htmlLink');
  });

  it('handles fetch failure gracefully and captures errorMessage', async () => {
    const context = /** @type {LH.Gatherer.Context<'RobotsTxt'>} */ (/** @type {unknown} */ ({
      gatherMode: 'navigation',
      baseArtifacts: {
        URL: {finalDisplayedUrl: pageUrl},
      },
      dependencies: {
        RobotsTxt: {status: 404, content: null},
      },
      driver: {
        executionContext: {
          evaluate: () => Promise.resolve({ard: null, legacy: null}),
        },
        fetcher: {
          fetchResource: () => Promise.reject(new Error('Connection refused')),
        },
      },
    }));

    const artifact = await new AgentResourceDiscovery().getArtifact(context);

    expect(artifact.catalogUrl).toEqual(wellKnown);
    expect(artifact.status).toBeNull();
    expect(artifact.content).toBeNull();
    expect(artifact.errorMessage).toEqual('Connection refused');
  });
});
