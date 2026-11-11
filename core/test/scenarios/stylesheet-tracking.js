/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as api from '../../index.js';
import BaseGatherer from '../../gather/base-gatherer.js';
import {navigationGather} from '../../gather/navigation-runner.js';
import {snapshotGather} from '../../gather/snapshot-runner.js';
import {createTestState} from './pptr-test-utils.js';
import {LH_ROOT} from '../../../shared/root.js';

/* eslint-env browser */

/**
 * Third-party / custom gatherer using the naive pattern of registering a
 * `CSS.styleSheetAdded` listener before calling `DOM.enable` + `CSS.enable`.
 */
class NaiveCustomCssGatherer extends BaseGatherer {
  /** @type {LH.Gatherer.GathererMeta} */
  meta = {
    supportedModes: ['snapshot', 'navigation'],
  };

  /**
   * @param {LH.Gatherer.Context} context
   * @return {Promise<LH.Artifacts['Stylesheets']>}
   */
  async getArtifact(context) {
    const session = context.driver.defaultSession;
    /** @type {Array<Promise<LH.Artifacts.CSSStyleSheetInfo>>} */
    const sheetPromises = [];
    /** @param {LH.Crdp.CSS.StyleSheetAddedEvent} event */
    const onStylesheetAdded = event => {
      if (event.header.length === 0) return;
      sheetPromises.push(
        session.sendCommand('CSS.getStyleSheetText', {styleSheetId: event.header.styleSheetId})
          .then(res => ({header: event.header, content: res.text}))
      );
    };

    session.on('CSS.styleSheetAdded', onStylesheetAdded);
    try {
      await session.sendCommand('DOM.enable');
      await session.sendCommand('CSS.enable');
    } finally {
      session.off('CSS.styleSheetAdded', onStylesheetAdded);
    }

    const sheets = await Promise.all(sheetPromises);
    await session.sendCommand('CSS.disable');
    await session.sendCommand('DOM.disable');

    return sheets;
  }
}

/**
 * Custom gatherer that enables `DOM` and `CSS` and intentionally omits disabling them.
 */
class LeakingCustomGatherer extends BaseGatherer {
  /** @type {LH.Gatherer.GathererMeta} */
  meta = {
    supportedModes: ['snapshot', 'navigation'],
  };

  /** @type {boolean|undefined} */
  domEnabled = undefined;
  /** @type {boolean|undefined} */
  cssEnabled = undefined;

  /**
   * @param {LH.Gatherer.Context} context
   * @return {Promise<LH.Artifacts['Stylesheets']>}
   */
  async getArtifact(context) {
    const session = context.driver.defaultSession;
    await session.sendCommand('DOM.enable');
    await session.sendCommand('CSS.enable');
    this.domEnabled = session.isDomainEnabled?.('DOM');
    this.cssEnabled = session.isDomainEnabled?.('CSS');
    return [];
  }
}

/**
 * @param {LH.Artifacts['Stylesheets']} stylesheets
 * @return {string[]}
 */
function getSortedStylesheetContents(stylesheets) {
  return stylesheets
    .map(s => s.content.trim())
    .sort((a, b) => a.localeCompare(b));
}

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

  it('tears down shared DOM/CSS before custom gatherers when ImageElements is filtered out',
    async () => {
      const pageUrl = `${state.serverBaseUrl}/start.html`;
      const customGatherer = new NaiveCustomCssGatherer();

      const {artifacts} = await navigationGather(state.page, pageUrl, {
        config: {
          extends: 'lighthouse:default',
          settings: {
            onlyAudits: ['unused-css-rules'],
            disableFullPageScreenshot: true,
          },
          artifacts: [
            {id: 'CustomCssGatherer', gatherer: {instance: customGatherer}, alwaysGather: true},
          ],
        },
      });

      expect(artifacts.Stylesheets).toBeDefined();
      expect(artifacts.CSSUsage).toBeDefined();
      expect(artifacts.ImageElements).toBeUndefined();
      expect(artifacts.AnchorElements).toBeUndefined();

      const customStylesheets = /** @type {LH.Artifacts['Stylesheets']} */ (
        /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (artifacts))
          .CustomCssGatherer
      );

      const expectedStylesheets = [
        'body {\n  border: 5px solid black;\n}',
        'h1 {color: gray}',
      ];
      expect(getSortedStylesheetContents(artifacts.Stylesheets)).toEqual(expectedStylesheets);
      expect(getSortedStylesheetContents(customStylesheets)).toEqual(expectedStylesheets);
    });

  it('tears down shared DOM/CSS before custom gatherers in extended snapshot config', async () => {
    const pageUrl = `${state.serverBaseUrl}/start.html`;
    await state.page.goto(pageUrl, {waitUntil: ['networkidle0']});

    const customGatherer = new NaiveCustomCssGatherer();
    const {artifacts} = await snapshotGather(state.page, {
      config: {
        extends: 'lighthouse:default',
        settings: {
          onlyAudits: ['unused-css-rules'],
          disableFullPageScreenshot: true,
        },
        artifacts: [
          {id: 'Stylesheets', gatherer: 'stylesheets', alwaysGather: true},
          {id: 'CSSUsage', gatherer: 'css-usage', alwaysGather: true},
          {id: 'CustomCssGatherer', gatherer: {instance: customGatherer}, alwaysGather: true},
        ],
      },
    });

    expect(artifacts.Stylesheets).toBeDefined();
    expect(artifacts.CSSUsage).toBeDefined();
    expect(artifacts.ImageElements).toBeUndefined();
    expect(artifacts.AnchorElements).toBeUndefined();

    const customStylesheets = /** @type {LH.Artifacts['Stylesheets']} */ (
      /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (artifacts))
        .CustomCssGatherer
    );

    const expectedStylesheets = [
      'body {\n  border: 5px solid black;\n}',
      'h1 {color: gray}',
    ];
    expect(getSortedStylesheetContents(artifacts.Stylesheets)).toEqual(expectedStylesheets);
    expect(getSortedStylesheetContents(customStylesheets)).toEqual(expectedStylesheets);
  });

  it('resets CSS domain for out-of-order standalone config after leaking gatherer', async () => {
    const pageUrl = `${state.serverBaseUrl}/start.html`;
    await state.page.goto(pageUrl, {waitUntil: ['networkidle0']});

    const leakingGatherer = new LeakingCustomGatherer();
    const {artifacts} = await snapshotGather(state.page, {
      config: {
        artifacts: [
          {id: 'LeakingCustomGatherer', gatherer: {instance: leakingGatherer}},
          {id: 'CSSUsage', gatherer: 'css-usage'},
          {id: 'Stylesheets', gatherer: 'stylesheets'},
        ],
      },
    });

    expect(leakingGatherer.domEnabled).toBe(true);
    expect(leakingGatherer.cssEnabled).toBe(true);

    expect(getSortedStylesheetContents(artifacts.Stylesheets)).toEqual([
      'body {\n  border: 5px solid black;\n}',
      'h1 {color: gray}',
    ]);

    const headerStyleSheetIds = artifacts.Stylesheets
      .map(s => s.header.styleSheetId)
      .sort((a, b) => a.localeCompare(b));
    const usageStyleSheetIds = Array.from(new Set(artifacts.CSSUsage.map(r => r.styleSheetId)))
      .sort((a, b) => a.localeCompare(b));
    expect(usageStyleSheetIds).toEqual(headerStyleSheetIds);
  });
});
