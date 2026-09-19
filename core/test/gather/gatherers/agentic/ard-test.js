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
        content: 'User-agent: *\nAgentmap: /ai-catalog.json\n',
      };
      expect(AgentResourceDiscovery.getRobotsTxtAgentmap(robotsTxt, finalUrl))
        .toEqual('https://example.com/ai-catalog.json');
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

  describe('getHtmlLinkFromDom', () => {
    it('returns resolved absolute URL when DOM link exists', async () => {
      const context = /** @type {LH.Gatherer.Context} */ (/** @type {unknown} */ ({
        driver: {
          executionContext: {
            evaluate: () => Promise.resolve('/dom-catalog.json'),
          },
        },
      }));
      const result = await AgentResourceDiscovery.getHtmlLinkFromDom(context, finalUrl);
      expect(result).toEqual('https://example.com/dom-catalog.json');
    });

    it('returns null when DOM element does not exist', async () => {
      const context = /** @type {LH.Gatherer.Context} */ (/** @type {unknown} */ ({
        driver: {
          executionContext: {
            evaluate: () => Promise.resolve(null),
          },
        },
      }));
      const result = await AgentResourceDiscovery.getHtmlLinkFromDom(context, finalUrl);
      expect(result).toBeNull();
    });

    it('returns null when evaluate throws', async () => {
      const context = /** @type {LH.Gatherer.Context} */ (/** @type {unknown} */ ({
        driver: {
          executionContext: {
            evaluate: () => Promise.reject(new Error('DOM evaluate error')),
          },
        },
      }));
      const result = await AgentResourceDiscovery.getHtmlLinkFromDom(context, finalUrl);
      expect(result).toBeNull();
    });
  });

  describe('getHttpHeaderLink', () => {
    it('returns null when gatherMode is not navigation', async () => {
      const context = /** @type {LH.Gatherer.Context} */ (/** @type {unknown} */ ({
        gatherMode: 'snapshot',
      }));
      const result = await AgentResourceDiscovery.getHttpHeaderLink(context, finalUrl);
      expect(result).toBeNull();
    });

    it('extracts and resolves URL from Link header with quotes', async () => {
      const context = /** @type {LH.Gatherer.Context} */ (/** @type {unknown} */ ({
        gatherMode: 'navigation',
        driver: {
          fetcher: {
            fetchResource: () => Promise.resolve({
              status: 200,
              content: '',
              headers: {'link': '<https://example.com/header-catalog.json>; rel="ai-catalog"'},
            }),
          },
        },
      }));
      const result = await AgentResourceDiscovery.getHttpHeaderLink(context, finalUrl);
      expect(result).toEqual('https://example.com/header-catalog.json');
    });

    it('extracts and resolves relative URL with unquoted rel attribute', async () => {
      const context = /** @type {LH.Gatherer.Context} */ (/** @type {unknown} */ ({
        gatherMode: 'navigation',
        driver: {
          fetcher: {
            fetchResource: () => Promise.resolve({
              status: 200,
              content: '',
              headers: {'link': '</relative-catalog.json>; rel=ai-catalog'},
            }),
          },
        },
      }));
      const result = await AgentResourceDiscovery.getHttpHeaderLink(context, finalUrl);
      expect(result).toEqual('https://example.com/relative-catalog.json');
    });

    it('returns null when Link header does not have ai-catalog rel', async () => {
      const context = /** @type {LH.Gatherer.Context} */ (/** @type {unknown} */ ({
        gatherMode: 'navigation',
        driver: {
          fetcher: {
            fetchResource: () => Promise.resolve({
              status: 200,
              content: '',
              headers: {'link': '<https://example.com/styles.css>; rel="stylesheet"'},
            }),
          },
        },
      }));
      const result = await AgentResourceDiscovery.getHttpHeaderLink(context, finalUrl);
      expect(result).toBeNull();
    });

    it('returns null when fetchResource throws', async () => {
      const context = /** @type {LH.Gatherer.Context} */ (/** @type {unknown} */ ({
        gatherMode: 'navigation',
        driver: {
          fetcher: {
            fetchResource: () => Promise.reject(new Error('Network error')),
          },
        },
      }));
      const result = await AgentResourceDiscovery.getHttpHeaderLink(context, finalUrl);
      expect(result).toBeNull();
    });
  });
});

describe('AgentResourceDiscovery Gatherer', () => {
  /**
   * @param {object} options
   * @param {string|null} [options.robotsTxtContent]
   * @param {number|null} [options.robotsTxtStatus]
   * @param {string|null} [options.domLink]
   * @param {Record<string, string>|null} [options.headers]
   * @param {{status: number|null, content: string|null, headers?: Record<string, string>|null}} [options.fetcherResponse]
   * @return {LH.Gatherer.Context<'RobotsTxt'>}
   */
  function getContext({
    robotsTxtContent = null,
    robotsTxtStatus = 200,
    domLink = null,
    headers = null,
    fetcherResponse = {
      status: 200,
      content: '{"specVersion": "1.0", "entries": []}',
      headers: null,
    },
  }) {
    const url = 'https://example.com/page';
    return /** @type {LH.Gatherer.Context<'RobotsTxt'>} */ (/** @type {unknown} */ ({
      gatherMode: 'navigation',
      baseArtifacts: {
        URL: {finalDisplayedUrl: url},
      },
      dependencies: {
        RobotsTxt: {status: robotsTxtStatus, content: robotsTxtContent},
      },
      driver: {
        executionContext: {
          evaluate: () => Promise.resolve(domLink),
        },
        fetcher: {
          fetchResource: (/** @type {string} */ targetUrl) => {
            if (targetUrl === url && headers) {
              return Promise.resolve({status: 200, content: '', headers});
            }
            return Promise.resolve(fetcherResponse);
          },
        },
      },
    }));
  }

  it('discovers catalog via robots.txt Agentmap directive', async () => {
    const gatherer = new AgentResourceDiscovery();
    const context = getContext({
      robotsTxtContent: 'User-agent: *\nAgentmap: https://example.com/custom-catalog.json\n',
      fetcherResponse: {
        status: 200,
        content: '{"specVersion": "1.0", "entries": []}',
        headers: {'content-type': 'application/json', 'access-control-allow-origin': '*'},
      },
    });

    const artifact = await gatherer.getArtifact(context);

    expect(artifact.catalogUrl).toEqual('https://example.com/custom-catalog.json');
    expect(artifact.discoverySignals.robotsTxtAgentmap).toEqual('https://example.com/custom-catalog.json');
    expect(artifact.status).toEqual(200);
    expect(artifact.headers?.['content-type']).toEqual('application/json');
    expect(artifact.headers?.['access-control-allow-origin']).toEqual('*');
  });

  it('discovers catalog via DOM link tag', async () => {
    const gatherer = new AgentResourceDiscovery();
    const context = getContext({
      robotsTxtStatus: 404,
      domLink: 'https://example.com/dom-catalog.json',
      fetcherResponse: {
        status: 200,
        content: '{"specVersion": "1.0", "entries": []}',
        headers: {'content-type': 'application/json'},
      },
    });

    const artifact = await gatherer.getArtifact(context);

    expect(artifact.catalogUrl).toEqual('https://example.com/dom-catalog.json');
    expect(artifact.discoverySignals.htmlLink).toEqual('https://example.com/dom-catalog.json');
  });

  it('discovers catalog via HTTP Link header', async () => {
    const gatherer = new AgentResourceDiscovery();
    const context = getContext({
      robotsTxtStatus: 404,
      headers: {'link': '<https://example.com/header-catalog.json>; rel="ai-catalog"'},
      fetcherResponse: {
        status: 200,
        content: '{"specVersion": "1.0", "entries": []}',
        headers: {'content-type': 'application/json'},
      },
    });

    const artifact = await gatherer.getArtifact(context);

    expect(artifact.catalogUrl).toEqual('https://example.com/header-catalog.json');
    expect(artifact.discoverySignals.httpHeaderLink).toEqual('https://example.com/header-catalog.json');
  });

  it('falls back to .well-known path when no discovery signals found', async () => {
    const gatherer = new AgentResourceDiscovery();
    const context = getContext({
      robotsTxtStatus: 404,
      fetcherResponse: {
        status: 404,
        content: null,
        headers: null,
      },
    });

    const artifact = await gatherer.getArtifact(context);

    expect(artifact.catalogUrl).toEqual('https://example.com/.well-known/ai-catalog.json');
    expect(artifact.status).toEqual(404);
  });

  it('prioritizes robots.txt over DOM link and HTTP header', async () => {
    const gatherer = new AgentResourceDiscovery();
    const context = getContext({
      robotsTxtContent: 'Agentmap: https://example.com/robots-catalog.json\n',
      domLink: 'https://example.com/dom-catalog.json',
      headers: {'link': '<https://example.com/header-catalog.json>; rel="ai-catalog"'},
      fetcherResponse: {
        status: 200,
        content: '{"specVersion": "1.0", "entries": []}',
        headers: {'content-type': 'application/json'},
      },
    });

    const artifact = await gatherer.getArtifact(context);

    expect(artifact.catalogUrl).toEqual('https://example.com/robots-catalog.json');
    expect(artifact.discoverySignals.robotsTxtAgentmap).toEqual('https://example.com/robots-catalog.json');
    expect(artifact.discoverySignals.htmlLink).toEqual('https://example.com/dom-catalog.json');
    expect(artifact.discoverySignals.httpHeaderLink).toEqual('https://example.com/header-catalog.json');
  });

  it('handles fetch failure gracefully and captures errorMessage', async () => {
    const gatherer = new AgentResourceDiscovery();
    const url = 'https://example.com/page';
    const context = /** @type {LH.Gatherer.Context<'RobotsTxt'>} */ (/** @type {unknown} */ ({
      gatherMode: 'navigation',
      baseArtifacts: {
        URL: {finalDisplayedUrl: url},
      },
      dependencies: {
        RobotsTxt: {status: 404, content: null},
      },
      driver: {
        executionContext: {
          evaluate: () => Promise.resolve(null),
        },
        fetcher: {
          fetchResource: () => Promise.reject(new Error('Connection refused')),
        },
      },
    }));

    const artifact = await gatherer.getArtifact(context);

    expect(artifact.status).toBeNull();
    expect(artifact.content).toBeNull();
    expect(artifact.errorMessage).toEqual('Connection refused');
  });
});
