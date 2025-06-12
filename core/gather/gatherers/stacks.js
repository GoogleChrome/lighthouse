/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Gathers a list of detected JS libraries and their versions.
 */

/* global d41d8cd98f00b204e9800998ecf8427e_LibraryDetectorTests */

import fs from 'fs';
import {createRequire} from 'module';

import log from 'lighthouse-logger';

import BaseGatherer from '../base-gatherer.js';


// This is removed by esbuild (if minified), because the only usage is to resolve a module path
// but that is replaced by the inline-fs plugin, leaving `require` unused.
const require = /* #__PURE__ */ createRequire(import.meta.url);

const libDetectorSource = fs.readFileSync(
  require.resolve('js-library-detector/library/libraries.js'), 'utf8');

/** @typedef {false | {version: string|number|null}} JSLibraryDetectorTestResult */
/**
 * @typedef JSLibraryDetectorTest
 * @property {string} id
 * @property {string} icon
 * @property {string} url
 * @property {string|null} npm npm module name, if applicable to library.
 * @property {function(Window): JSLibraryDetectorTestResult | Promise<JSLibraryDetectorTestResult>} test Returns false if library is not present, otherwise returns an object that contains the library version (set to null if the version is not detected).
 */

/**
 * @typedef JSLibrary
 * @property {string} id
 * @property {string} name
 * @property {string|number|null} version
 * @property {string|null} npm
 */

/**
 * Obtains a list of detected JS libraries and their versions.
 */
/* c8 ignore start */
async function detectLibraries() {
  /** @type {JSLibrary[]} */
  const libraries = [];

  // d41d8cd98f00b204e9800998ecf8427e_ is a consistent prefix used by the detect libraries
  // see https://github.com/HTTPArchive/httparchive/issues/77#issuecomment-291320900
  /** @type {Record<string, JSLibraryDetectorTest>} */
  // @ts-expect-error - injected libDetectorSource var
  const libraryDetectorTests = d41d8cd98f00b204e9800998ecf8427e_LibraryDetectorTests; // eslint-disable-line

  for (const [name, lib] of Object.entries(libraryDetectorTests)) {
    try {
      /** @type {NodeJS.Timeout|undefined} */
      let timeout;
      // Some library detections are async that can never return.
      // Guard ourselves from PROTOCL_TIMEOUT by limiting each detection to a max of 1s.
      // See https://github.com/GoogleChrome/lighthouse/issues/11124.
      const timeoutPromise = new Promise(r => timeout = setTimeout(() => r(false), 1000));

      const result = await Promise.race([lib.test(window), timeoutPromise]);
      if (timeout) clearTimeout(timeout);
      if (result) {
        libraries.push({
          id: lib.id,
          name: name,
          version: result.version,
          npm: lib.npm,
        });
      }
    } catch (e) {}
  }

  return libraries;
}
/* c8 ignore stop */


/** @implements {LH.Gatherer.GathererInstance} */
class Stacks extends BaseGatherer {
  constructor() {
    super();

    /** @type {LH.Gatherer.GathererMeta} */
    this.meta = {
      supportedModes: ['snapshot', 'navigation'],
    };
  }

  /**
   * @param {LH.Gatherer.Driver['executionContext']} executionContext
   * @return {Promise<LH.Artifacts['Stacks']>}
   */
  static async collectStacks(executionContext) {
    const status = {msg: 'Collect stacks', id: 'lh:gather:collectStacks'};
    log.time(status);

    const jsLibraries = await executionContext.evaluate(detectLibraries, {
      args: [],
      deps: [libDetectorSource],
    });

    /** @type {LH.Artifacts['Stacks']} */
    const stacks = jsLibraries.map(lib => ({
      detector: 'js',
      id: lib.id,
      name: lib.name,
      version: typeof lib.version === 'number' ? String(lib.version) : (lib.version || undefined),
      npm: lib.npm || undefined,
    }));
    log.timeEnd(status);
    return stacks;
  }

  /**
   * @param {LH.Gatherer.Context} context
   * @return {Promise<LH.Artifacts['Stacks']>}
   */
  async getArtifact(context) {
    try {
      return await Stacks.collectStacks(context.driver.executionContext);
    } catch {
      return [];
    }
  }
}

export default Stacks;
