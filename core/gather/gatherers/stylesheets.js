/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Collects all stylesheets and their contents.
 */

import log from 'lighthouse-logger';

import BaseGatherer from '../base-gatherer.js';
import {Sentry} from '../../lib/sentry.js';

class Stylesheets extends BaseGatherer {
  constructor() {
    super();
    /** @type {LH.Gatherer.ProtocolSession|undefined} */
    this._session = undefined;
    /** @type {Map<string, Promise<LH.Artifacts.CSSStyleSheetInfo|null>>} */
    this._sheetPromises = new Map();
    this._onStylesheetAdded = this._onStylesheetAdded.bind(this);
  }

  /** @type {LH.Gatherer.GathererMeta} */
  meta = {
    supportedModes: ['snapshot', 'timespan', 'navigation'],
  };

  /**
   * @param {LH.Crdp.CSS.StyleSheetAddedEvent} event
   */
  _onStylesheetAdded(event) {
    if (!this._session) throw new Error('Session not initialized');
    const styleSheetId = event.header.styleSheetId;
    const sheetPromise = this._session.sendCommand('CSS.getStyleSheetText', {styleSheetId})
      .then(content => ({
        header: event.header,
        content: content.text,
      }))
      .catch(err => {
        log.warn(
          'Stylesheets',
          `Error fetching content of stylesheet with URL "${event.header.sourceURL}"`
        );
        Sentry.captureException(err, {
          tags: {
            gatherer: 'Stylesheets',
          },
          extra: {
            url: event.header.sourceURL,
          },
          level: 'error',
        });
        return null;
      });
    this._sheetPromises.set(styleSheetId, sheetPromise);
  }

  /**
   * @param {LH.Gatherer.Context} context
   * @return {Promise<LH.Artifacts['Stylesheets']>}
   */
  async getArtifact(context) {
    const executionContext = context.driver.executionContext;
    const session = context.driver.defaultSession;
    this._session = session;

    session.on('CSS.styleSheetAdded', this._onStylesheetAdded);

    await session.sendCommand('DOM.enable');
    await session.sendCommand('CSS.enable');

    // Force style to recompute.
    // Doesn't appear to be necessary in newer versions of Chrome.
    await executionContext.evaluateAsync('getComputedStyle(document.body)');

    session.off('CSS.styleSheetAdded', this._onStylesheetAdded);

    // Ensure we finish fetching all stylesheet contents before disabling the CSS domain
    const sheets = await Promise.all(this._sheetPromises.values());

    await session.sendCommand('CSS.disable');
    await session.sendCommand('DOM.disable');

    /** @type {Map<string, LH.Artifacts.CSSStyleSheetInfo>} */
    const dedupedStylesheets = new Map();

    for (const sheet of sheets) {
      // Erroneous sheets will be reported via sentry and the log.
      // We can ignore them here without throwing a fatal error.
      if (!sheet) continue;

      // Exclude empty stylesheets.
      if (sheet.header.length === 0) {
        continue;
      }

      dedupedStylesheets.set(sheet.content, sheet);
    }

    return Array.from(dedupedStylesheets.values());
  }
}

export default Stylesheets;
