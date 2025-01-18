/**
 * @license
 * Copyright 2022 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as api from '../../index.js';
import {createTestState, getAuditsBreakdown} from './pptr-test-utils.js';
import {LH_ROOT} from '../../../shared/root.js';

/* eslint-env browser */

describe('Start/End navigation', function() {
  // eslint-disable-next-line no-invalid-this
  this.timeout(120_000);

  const state = createTestState();

  state.installSetupAndTeardownHooks();

  before(() => {
    state.server.baseDir = `${LH_ROOT}/core/test/fixtures/user-flows/navigation-basic`;
  });

  it('should capture a navigation via user interaction', async () => {
    const pageUrl = `${state.serverBaseUrl}/links-to-index.html`;
    await state.page.goto(pageUrl, {waitUntil: ['networkidle0']});

    const flow = await api.startFlow(state.page);

    await flow.startNavigation();
    await state.page.click('a');
    await flow.endNavigation();

    const flowResult = await flow.createFlowResult();
    const flowArtifacts = flow.createArtifactsJson();
    const lhr = flowResult.steps[0].lhr;
    const artifacts = flowArtifacts.gatherSteps[0].artifacts;

    state.saveTrace(artifacts.Trace);

    expect(artifacts.URL).toEqual({
      requestedUrl: `${state.serverBaseUrl}/?redirect=/index.html`,
      mainDocumentUrl: `${state.serverBaseUrl}/index.html`,
      finalDisplayedUrl: `${state.serverBaseUrl}/index.html`,
    });

    expect(lhr.requestedUrl).toEqual(`${state.serverBaseUrl}/?redirect=/index.html`);
    expect(lhr.finalDisplayedUrl).toEqual(`${state.serverBaseUrl}/index.html`);

    const {erroredAudits} = getAuditsBreakdown(lhr);
    expect(erroredAudits).toHaveLength(0);
  });
});
