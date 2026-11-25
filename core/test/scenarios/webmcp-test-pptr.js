/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as api from '../../index.js';
import {createTestState} from './pptr-test-utils.js';

describe('WebMCP', function() {
  // eslint-disable-next-line no-invalid-this
  this.timeout(120_000);

  const state = createTestState({chromeArgs: ['--enable-features=WebMCP']});

  state.installSetupAndTeardownHooks();

  it('should collect tools and schema issues in snapshot mode', async () => {
    await state.page.goto(`${state.serverBaseUrl}/webmcp/webmcp_tester.html`);

    const result = await api.snapshot(state.page, {
      config: {
        extends: 'lighthouse:default',
        settings: {
          onlyAudits: [
            'webmcp-registered-tools',
            'webmcp-form-coverage',
            'webmcp-schema-validity',
          ],
        },
      },
    });
    if (!result) throw new Error('Lighthouse failed to produce a result');

    const {lhr, artifacts} = result;
    expect(lhr.gatherMode).toEqual('snapshot');

    expect(artifacts.WebMCP.isSupported).toEqual(true);
    expect(artifacts.WebMCP.tools.map(tool => tool.name).sort()).toEqual([
      'declarative_feedback',
      'declarative_search',
    ]);

    expect(lhr.audits['webmcp-registered-tools'].score).toEqual(1);
    expect(lhr.audits['webmcp-form-coverage'].details).toMatchObject({
      items: [{node: {selector: 'body > form#unannotated-form'}}],
    });
    expect(lhr.audits['webmcp-schema-validity']).toMatchObject({
      score: 0.5,
      details: {
        items: [{element: {selector: 'body > form#invalid-declarative-form > input'}}],
      },
    });
  });
});
