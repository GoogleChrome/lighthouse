/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as api from '../../index.js';
import {createTestState} from './pptr-test-utils.js';
import {LH_ROOT} from '../../../shared/root.js';

/* eslint-env browser */

describe('User flow stylesheet tracking', function() {
  // eslint-disable-next-line no-invalid-this
  this.timeout(120_000);

  const state = createTestState();

  state.installSetupAndTeardownHooks();

  before(() => {
    state.server.baseDir = `${LH_ROOT}/core/test/fixtures/user-flows/css-change`;
  });

  it('should correctly scope stylesheets based on mode', async () => {
    const pageUrl = `${state.serverBaseUrl}/start.html`;
    await state.page.goto(pageUrl, {waitUntil: ['networkidle0']});

    const flow = await api.startFlow(state.page);

    await flow.navigate(`${state.serverBaseUrl}/start.html`);

    await flow.navigate(async () => {
      await state.page.click('a');
    });

    await flow.startTimespan();
    await state.page.click('button');
    await flow.endTimespan();

    const flowArtifacts = flow.createArtifactsJson();

    const artifacts0 = flowArtifacts.gatherSteps[0].artifacts;
    const artifacts1 = flowArtifacts.gatherSteps[1].artifacts;
    const artifacts2 = flowArtifacts.gatherSteps[2].artifacts;

    state.saveTrace(artifacts1.Trace);

    const stylesheets0 = artifacts0.Stylesheets
      .map(s => s.content.trim())
      .sort((a, b) => a.localeCompare(b));
    const stylesheets1 = artifacts1.Stylesheets
      .map(s => s.content.trim())
      .sort((a, b) => a.localeCompare(b));
    const stylesheets2 = artifacts2.Stylesheets
      .map(s => s.content.trim())
      .sort((a, b) => a.localeCompare(b));

    expect(stylesheets0).toEqual([
      'body {\n  border: 5px solid black;\n}',
      'h1 {color: gray}',
    ]);

    // Some stylesheets are pre-existing but they are out of scope for navigation mode
    expect(stylesheets1).toEqual([
      'body {\n  border: 5px solid red;\n}',
      'h1 {color: red}',
    ]);

    // Some stylesheets are pre-existing and they are in in scope for timespan mode
    expect(stylesheets2).toEqual([
      'body {\n  border: 5px solid red;\n}',
      'h1 {color: red}',
      'h1 {font-size: 30px}',
    ]);
  });
});
